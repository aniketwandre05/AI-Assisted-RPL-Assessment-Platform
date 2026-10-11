import json
from flask import Blueprint, request, jsonify, g
from backend.database import db
from backend.models.user import User
from backend.models.worker_profile import WorkerProfile, QualificationMatch
from backend.models.assessment import AuditLog
from backend.auth_middleware import jwt_required, role_required

worker_bp = Blueprint("worker_bp", __name__)

@worker_bp.route("/profile", methods=["GET"])
@jwt_required
def get_worker_profile():
    current_user: User = g.current_user
    
    # If assessor or admin, they can query a specific worker's profile via query param
    requested_user_id = request.args.get("worker_id")
    if requested_user_id:
        if current_user.role not in ["assessor", "admin"]:
            # Prevent worker from viewing another worker's private record
            if requested_user_id != current_user.id:
                return jsonify({"error": "Unauthorized access to another worker's record"}), 403
        target_user_id = requested_user_id
    else:
        target_user_id = current_user.id

    profile = WorkerProfile.query.filter_by(user_id=target_user_id).first()
    if not profile:
        return jsonify({"profile": None, "message": "No profile created yet"}), 200

    return jsonify({"profile": profile.to_dict()}), 200

@worker_bp.route("/profile", methods=["POST", "PUT"])
@jwt_required
def save_worker_profile():
    current_user: User = g.current_user
    
    # Only workers (or admin on behalf) can edit worker profile
    target_user_id = request.args.get("worker_id")
    if target_user_id and target_user_id != current_user.id:
        if current_user.role != "admin":
            return jsonify({"error": "Cannot edit another worker's profile"}), 403
        effective_user_id = target_user_id
    else:
        effective_user_id = current_user.id

    data = request.get_json() or {}
    occupation_title = data.get("occupation_title", "").strip()
    if not occupation_title:
        return jsonify({"error": "occupation_title is required"}), 400

    profile = WorkerProfile.query.filter_by(user_id=effective_user_id).first()
    if not profile:
        profile = WorkerProfile(user_id=effective_user_id, occupation_title=occupation_title)
        db.session.add(profile)

    profile.occupation_title = occupation_title
    profile.experience_years = float(data.get("experience_years", 0.0))
    profile.current_workplace = data.get("current_workplace")
    profile.education_level = data.get("education_level")
    
    # Handle list or string serialization for tasks, tools, skills
    daily_tasks = data.get("daily_tasks", [])
    profile.daily_tasks = json.dumps(daily_tasks) if isinstance(daily_tasks, list) else str(daily_tasks)

    tools_used = data.get("tools_used", [])
    profile.tools_used = json.dumps(tools_used) if isinstance(tools_used, list) else str(tools_used)

    skills_declared = data.get("skills_declared", [])
    profile.skills_declared = json.dumps(skills_declared) if isinstance(skills_declared, list) else str(skills_declared)

    profile.informal_training_desc = data.get("informal_training_desc")
    profile.status = data.get("status", "submitted")
    profile.preferred_language = data.get("preferred_language", "en")

    db.session.commit()

    # Log action
    audit = AuditLog(
        user_id=current_user.id,
        action="WORKER_PROFILE_SAVED",
        entity_type="WorkerProfile",
        entity_id=profile.id,
        details=json.dumps({"status": profile.status, "occupation": profile.occupation_title})
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": "Worker profile saved successfully",
        "profile": profile.to_dict()
    }), 200

@worker_bp.route("/matches", methods=["GET"])
@jwt_required
def get_worker_matches():
    current_user: User = g.current_user
    worker_id_param = request.args.get("worker_id")
    
    if worker_id_param and worker_id_param != current_user.id:
        if current_user.role not in ["assessor", "admin"]:
            return jsonify({"error": "Unauthorized access to another worker's matches"}), 403
        target_user_id = worker_id_param
    else:
        target_user_id = current_user.id

    profile = WorkerProfile.query.filter_by(user_id=target_user_id).first()
    if not profile:
        return jsonify({"matches": [], "message": "No profile found"}), 200

    matches = QualificationMatch.query.filter_by(worker_profile_id=profile.id).order_by(QualificationMatch.match_score.desc()).all()
    return jsonify({
        "matches": [m.to_dict() for m in matches]
    }), 200

@worker_bp.route("/match-qualifications", methods=["POST"])
@jwt_required
def trigger_qualification_matching():
    from backend.matching_engine import MatchingEngine
    current_user: User = g.current_user
    data = request.get_json() or {}
    
    worker_id_param = data.get("worker_id") or request.args.get("worker_id")
    if worker_id_param and worker_id_param != current_user.id:
        if current_user.role not in ["assessor", "admin"]:
            return jsonify({"error": "Unauthorized access to another worker's profile"}), 403
        target_user_id = worker_id_param
    else:
        target_user_id = current_user.id

    profile = WorkerProfile.query.filter_by(user_id=target_user_id).first()
    if not profile:
        return jsonify({"error": "Worker profile must be created before matching"}), 400

    min_threshold = float(data.get("min_threshold", 25.0))
    result = MatchingEngine.match_worker_profile(profile, top_k=5, min_threshold=min_threshold)
    return jsonify(result), 200
