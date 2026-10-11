import json
from flask import Blueprint, request, jsonify, g
from backend.database import db
from backend.models.user import User
from backend.models.qualification import Qualification, PerformanceCriterion
from backend.models.assessment import AssessmentSession, CriterionScore, AssessmentEvidence, AuditLog
from backend.scoring_engine import ScoringEngine
from backend.auth_middleware import jwt_required, role_required

assessment_bp = Blueprint("assessment_bp", __name__)

@assessment_bp.route("/sessions", methods=["POST"])
@jwt_required
def create_session():
    current_user: User = g.current_user
    data = request.get_json() or {}

    worker_id = data.get("worker_id")
    qualification_id = data.get("qualification_id")

    if not qualification_id:
        return jsonify({"error": "qualification_id is required"}), 400

    # If worker is creating, they are the worker
    if current_user.role == "worker":
        target_worker_id = current_user.id
    else:
        if not worker_id:
            return jsonify({"error": "worker_id is required for assessor/admin"}), 400
        target_worker_id = worker_id

    worker = db.session.get(User, target_worker_id)
    if not worker:
        return jsonify({"error": "Worker not found"}), 404

    qual = db.session.get(Qualification, qualification_id)
    if not qual:
        return jsonify({"error": "Qualification not found"}), 404

    session = AssessmentSession(
        worker_id=worker.id,
        assessor_id=current_user.id if current_user.role in ["assessor", "admin"] else None,
        qualification_id=qual.id,
        session_date=data.get("session_date"),
        location=data.get("location", "Assessment Centre / On-Site Workshop"),
        status="in_progress"
    )
    db.session.add(session)
    db.session.flush()

    # Pre-populate CriterionScores for all criteria
    for nos in qual.occupational_standards:
        for pc in nos.performance_criteria:
            cs = CriterionScore(
                session_id=session.id,
                criterion_id=pc.id,
                rubric_level=0,  # Unassessed initially
                score_awarded=0.0,
                max_score=pc.max_score or 10.0,
                is_competent=False,
                has_evidence=False
            )
            db.session.add(cs)

    # Initial score calculation
    db.session.commit()
    ScoringEngine.calculate_session_scores(session)

    # Audit log
    audit = AuditLog(
        session_id=session.id,
        user_id=current_user.id,
        action="ASSESSMENT_SESSION_CREATED",
        entity_type="AssessmentSession",
        entity_id=session.id,
        details=json.dumps({"worker_id": worker.id, "qualification": qual.title})
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": "Assessment session created successfully",
        "session": session.to_dict()
    }), 201

@assessment_bp.route("/sessions", methods=["GET"])
@jwt_required
def list_sessions():
    current_user: User = g.current_user
    status = request.args.get("status")

    if current_user.role == "worker":
        # Workers can only view their own assessment sessions
        query = AssessmentSession.query.filter_by(worker_id=current_user.id)
    else:
        # Assessors and admins view all sessions
        query = AssessmentSession.query

    if status:
        query = query.filter_by(status=status)

    sessions = query.order_by(AssessmentSession.created_at.desc()).all()
    return jsonify({
        "sessions": [s.to_dict(include_scores=False) for s in sessions]
    }), 200

@assessment_bp.route("/sessions/<string:session_id>", methods=["GET"])
@jwt_required
def get_session(session_id: str):
    current_user: User = g.current_user
    session = db.session.get(AssessmentSession, session_id)
    if not session:
        return jsonify({"error": "Assessment session not found"}), 404

    # Security check: worker can only view own session
    if current_user.role == "worker" and session.worker_id != current_user.id:
        return jsonify({"error": "Unauthorized to access this assessment session"}), 403

    return jsonify({"session": session.to_dict(include_scores=True)}), 200

@assessment_bp.route("/sessions/<string:session_id>/scores", methods=["POST", "PUT"])
@jwt_required
@role_required("assessor", "admin")
def record_scores(session_id: str):
    current_user: User = g.current_user
    session = db.session.get(AssessmentSession, session_id)
    if not session:
        return jsonify({"error": "Assessment session not found"}), 404

    data = request.get_json() or {}
    score_updates = data.get("scores", [])

    if not isinstance(score_updates, list):
        return jsonify({"error": "scores must be a list of criterion score updates"}), 400

    existing_scores = {cs.criterion_id: cs for cs in session.criterion_scores}

    for item in score_updates:
        c_id = item.get("criterion_id")
        rubric_level = int(item.get("rubric_level", 0))
        notes = item.get("assessor_notes")

        if c_id in existing_scores:
            cs = existing_scores[c_id]
            cs.rubric_level = rubric_level
            if notes is not None:
                cs.assessor_notes = notes

    # Automatically recalculate scores
    db.session.commit()
    calc = ScoringEngine.calculate_session_scores(session)

    # Audit log
    audit = AuditLog(
        session_id=session.id,
        user_id=current_user.id,
        action="SCORES_UPDATED",
        entity_type="AssessmentSession",
        entity_id=session.id,
        details=json.dumps({"updated_count": len(score_updates), "overall_pct": calc["scores"]["overall"]["percentage"]})
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": f"Updated {len(score_updates)} criterion scores",
        "calculation": calc,
        "session": session.to_dict(include_scores=True)
    }), 200

@assessment_bp.route("/sessions/<string:session_id>/evidence", methods=["POST"])
@jwt_required
def add_evidence(session_id: str):
    current_user: User = g.current_user
    session = db.session.get(AssessmentSession, session_id)
    if not session:
        return jsonify({"error": "Assessment session not found"}), 404

    # Security check: worker can only upload to own session
    if current_user.role == "worker" and session.worker_id != current_user.id:
        return jsonify({"error": "Unauthorized to upload evidence for this session"}), 403

    data = request.get_json() or {}
    evidence_type = data.get("evidence_type", "document")
    title = data.get("title", "").strip()
    external_url = data.get("external_url")
    criterion_id = data.get("criterion_id")

    if not title:
        return jsonify({"error": "title is required"}), 400

    evidence = AssessmentEvidence(
        session_id=session.id,
        criterion_id=criterion_id,
        uploaded_by_id=current_user.id,
        evidence_type=evidence_type,
        title=title,
        external_url=external_url
    )
    db.session.add(evidence)
    db.session.commit()

    # Recalculate to update missing evidence counts
    ScoringEngine.calculate_session_scores(session)

    return jsonify({
        "message": "Evidence recorded successfully",
        "evidence": evidence.to_dict()
    }), 201

@assessment_bp.route("/sessions/<string:session_id>/calculate", methods=["POST"])
@jwt_required
def run_score_calculation(session_id: str):
    session = db.session.get(AssessmentSession, session_id)
    if not session:
        return jsonify({"error": "Assessment session not found"}), 404

    calc = ScoringEngine.calculate_session_scores(session)
    return jsonify({"calculation": calc}), 200

@assessment_bp.route("/sessions/<string:session_id>/finalize", methods=["POST"])
@jwt_required
@role_required("assessor", "admin")
def finalize_session(session_id: str):
    current_user: User = g.current_user
    session = db.session.get(AssessmentSession, session_id)
    if not session:
        return jsonify({"error": "Assessment session not found"}), 404

    data = request.get_json() or {}
    decision = data.get("decision", "").strip().upper()
    remarks = data.get("remarks", "").strip()

    if not decision:
        return jsonify({"error": "decision is required (CERTIFIED, NOT_YET_COMPETENT, DEFERRED)"}), 400

    try:
        result = ScoringEngine.finalize_decision(session, current_user, decision, remarks)
        return jsonify({
            "message": f"Assessment finalized with decision: {decision}",
            "result": result,
            "session": session.to_dict(include_scores=True)
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403

@assessment_bp.route("/sessions/<string:session_id>/report", methods=["GET"])
@jwt_required
def get_competency_report(session_id: str):
    current_user: User = g.current_user
    session = db.session.get(AssessmentSession, session_id)
    if not session:
        return jsonify({"error": "Assessment session not found"}), 404

    if current_user.role == "worker" and session.worker_id != current_user.id:
        return jsonify({"error": "Unauthorized to view this report"}), 403

    qual = session.qualification
    calc = ScoringEngine.calculate_session_scores(session)

    report = {
        "report_id": f"RPL-COMP-RPT-{session.id[:8].upper()}",
        "session_id": session.id,
        "candidate": {
            "name": session.worker.full_name,
            "email": session.worker.email,
            "aadhaar_last_four": session.worker.aadhaar_last_four,
            "state": session.worker.state
        },
        "qualification": {
            "title": qual.title,
            "nqr_code": qual.nqr_code,
            "nsqf_level": qual.nsqf_level,
            "sector": qual.sector,
            "trade": qual.trade,
            "awarding_body": qual.awarding_body,
            "credits": qual.credits,
            "notional_hours": qual.notional_hours_total
        },
        "assessment_details": {
            "session_date": session.session_date,
            "location": session.location,
            "assessor_name": session.assessor.full_name if session.assessor else "Pending Assignment",
            "status": session.status,
            "signed_off_at": session.signed_off_at.isoformat() if session.signed_off_at else None,
            "signature_hash": session.assessor_signature_hash
        },
        "score_summary": calc["scores"],
        "nos_breakdown": calc["nos_subtotals"],
        "provisional_recommendation": session.provisional_recommendation,
        "assessor_final_decision": session.assessor_final_decision,
        "assessor_remarks": session.assessor_remarks,
        "evidence_manifest": [ev.to_dict() for ev in session.evidence_files],
        "audit_verification": {
            "is_tamper_evident": session.assessor_signature_hash is not None,
            "incomplete_criteria_count": session.incomplete_criteria_count,
            "missing_evidence_count": session.missing_evidence_count
        }
    }

    return jsonify({"report": report}), 200
