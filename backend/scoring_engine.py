import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.database import db
from backend.models.assessment import AssessmentSession, CriterionScore, AssessmentEvidence, AuditLog
from backend.models.qualification import Qualification, PerformanceCriterion, PassingRule
from backend.models.user import User

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class ScoringEngine:
    """
    Deterministic Rubric & Competency Evaluation Engine.
    Strictly applies configured and official NSQF passing rules:
    - Theory min percentage: 40% (Official Page 8)
    - Practical min percentage: 60% (Official Page 8)
    - Flags incomplete scoring and missing mandatory evidence
    - AI / rule-based provisional recommendation (human assessor retains sole sign-off)
    """

    RUBRIC_PERCENTAGES = {
        4: 1.00,  # Exceeds Competency (100%)
        3: 0.75,  # Competent (75%)
        2: 0.50,  # Developing (50%)
        1: 0.00,  # Not Demonstrated (0%)
        0: 0.00   # Unassessed (0%)
    }

    @staticmethod
    def calculate_session_scores(session: AssessmentSession) -> Dict[str, Any]:
        """
        Calculates theory, practical, and overall scores based on criteria rubrics
        and official qualification passing rules.
        """
        qual = session.qualification
        if not qual:
            raise ValueError("Assessment session has no linked qualification")

        # Fetch all performance criteria for the qualification
        all_criteria: List[PerformanceCriterion] = []
        nos_map = {}
        for nos in qual.occupational_standards:
            nos_map[nos.id] = {
                "nos_code": nos.nos_code,
                "nos_title": nos.title,
                "nos_type": nos.nos_type,
                "theory_score": 0.0,
                "practical_score": 0.0,
                "max_theory": 0.0,
                "max_practical": 0.0,
                "criteria_count": 0,
                "assessed_count": 0,
            }
            for pc in nos.performance_criteria:
                all_criteria.append(pc)

        # Existing scores in session
        existing_scores = {cs.criterion_id: cs for cs in session.criterion_scores}
        
        # Existing evidences in session (criterion-specific or session-wide)
        criterion_evidences = set()
        has_general_evidence = False
        for ev in session.evidence_files:
            if ev.criterion_id:
                criterion_evidences.add(ev.criterion_id)
            else:
                has_general_evidence = True

        theory_obtained = 0.0
        theory_max = 0.0
        practical_obtained = 0.0
        practical_max = 0.0
        
        incomplete_criteria = []
        missing_evidence_criteria = []
        criteria_details = []

        for pc in all_criteria:
            nos_info = nos_map.get(pc.nos_id)
            if nos_info:
                nos_info["criteria_count"] += 1

            cs = existing_scores.get(pc.id)
            level = cs.rubric_level if cs else 0
            is_assessed = level > 0

            max_score = pc.max_score or 10.0
            mult = ScoringEngine.RUBRIC_PERCENTAGES.get(level, 0.0)
            score_awarded = round(max_score * mult, 2)
            is_competent = level >= 3

            # Update or create CriterionScore record
            if not cs:
                cs = CriterionScore(
                    session=session,
                    criterion_id=pc.id,
                    rubric_level=level,
                    score_awarded=score_awarded,
                    max_score=max_score,
                    is_competent=is_competent,
                    has_evidence=False
                )
                db.session.add(cs)
                existing_scores[pc.id] = cs
            else:
                cs.score_awarded = score_awarded
                cs.is_competent = is_competent

            if not is_assessed:
                incomplete_criteria.append(pc.criterion_code)
            elif nos_info:
                nos_info["assessed_count"] += 1

            # Evidence verification
            has_ev = (pc.id in criterion_evidences) or has_general_evidence
            cs.has_evidence = has_ev

            # Check if mandatory evidence is missing
            mandatory_reqs = [req for req in pc.evidence_requirements if req.is_mandatory]
            if mandatory_reqs and not has_ev:
                missing_evidence_criteria.append(pc.criterion_code)

            # Accumulate theory vs practical
            if pc.criterion_type == "Theory":
                theory_obtained += score_awarded
                theory_max += max_score
                if nos_info:
                    nos_info["theory_score"] += score_awarded
                    nos_info["max_theory"] += max_score
            else:
                practical_obtained += score_awarded
                practical_max += max_score
                if nos_info:
                    nos_info["practical_score"] += score_awarded
                    nos_info["max_practical"] += max_score

            criteria_details.append({
                "criterion_id": pc.id,
                "criterion_code": pc.criterion_code,
                "criterion_type": pc.criterion_type,
                "rubric_level": level,
                "score_awarded": score_awarded,
                "max_score": max_score,
                "is_competent": is_competent,
                "has_evidence": has_ev
            })

        # Calculate percentages
        theory_pct = round((theory_obtained / theory_max * 100.0), 2) if theory_max > 0 else 0.0
        practical_pct = round((practical_obtained / practical_max * 100.0), 2) if practical_max > 0 else 0.0
        total_obtained = theory_obtained + practical_obtained
        total_max = theory_max + practical_max
        overall_pct = round((total_obtained / total_max * 100.0), 2) if total_max > 0 else 0.0

        # Retrieve qualification passing rules
        pass_rule = PassingRule.query.filter_by(qualification_id=qual.id).first()
        min_th_pct = pass_rule.theory_min_percentage if pass_rule else 40.0
        min_pr_pct = pass_rule.practical_min_percentage if pass_rule else 60.0

        # Determine Provisional Recommendation
        if len(incomplete_criteria) > 0:
            rec = "INCOMPLETE_ASSESSMENT"
            rec_reason = f"{len(incomplete_criteria)} mandatory criteria remain unassessed."
        elif len(missing_evidence_criteria) > 0:
            rec = "INCOMPLETE_ASSESSMENT"
            rec_reason = f"{len(missing_evidence_criteria)} criteria lack mandatory evidence."
        elif theory_pct >= min_th_pct and practical_pct >= min_pr_pct:
            rec = "RECOMMENDED_CERTIFIED"
            rec_reason = f"Theory ({theory_pct}% >= {min_th_pct}%) and Practical ({practical_pct}% >= {min_pr_pct}%) meet official NSQF thresholds."
        else:
            rec = "NOT_YET_COMPETENT"
            fails = []
            if theory_pct < min_th_pct:
                fails.append(f"Theory score {theory_pct}% is below required {min_th_pct}%")
            if practical_pct < min_pr_pct:
                fails.append(f"Practical score {practical_pct}% is below required {min_pr_pct}%")
            rec_reason = "; ".join(fails)

        # Update session
        session.theory_score_obtained = theory_obtained
        session.theory_score_max = theory_max
        session.theory_percentage = theory_pct
        session.practical_score_obtained = practical_obtained
        session.practical_score_max = practical_max
        session.practical_percentage = practical_pct
        session.overall_percentage = overall_pct
        session.incomplete_criteria_count = len(incomplete_criteria)
        session.missing_evidence_count = len(missing_evidence_criteria)
        session.provisional_recommendation = rec

        db.session.commit()

        # NCVET 12-Hour Mandatory Orientation & Bridge Course Prescription
        bridge_modules = []
        for nos_id, nos_data in nos_map.items():
            th_pct_nos = round((nos_data["theory_score"] / nos_data["max_theory"] * 100.0), 1) if nos_data["max_theory"] > 0 else 100.0
            pr_pct_nos = round((nos_data["practical_score"] / nos_data["max_practical"] * 100.0), 1) if nos_data["max_practical"] > 0 else 100.0
            
            reasons = []
            if th_pct_nos < min_th_pct:
                reasons.append(f"Theory score {th_pct_nos}% below standard {min_th_pct}%")
            if pr_pct_nos < min_pr_pct:
                reasons.append(f"Practical score {pr_pct_nos}% below standard {min_pr_pct}%")
            
            if reasons:
                bridge_modules.append({
                    "nos_code": nos_data.get("nos_code", ""),
                    "nos_title": nos_data.get("nos_title") or nos_data.get("title", ""),
                    "theory_percentage": th_pct_nos,
                    "practical_percentage": pr_pct_nos,
                    "reasons": reasons,
                    "recommended_bridge_hours": 12.0,
                    "target_curriculum": f"NCVET Modular Bridge Training for {nos_data.get('nos_title') or nos_data.get('title', '')}"
                })

        orientation_and_bridge_plan = {
            "ncvet_mandate_reference": "NCVET RPL Guidelines 2023 / 2025 Section 6.2 - Mandatory Orientation & Bridge Training",
            "is_orientation_mandatory": True,
            "standard_orientation_hours": 12.0,
            "orientation_modules": [
                {"module_name": "Domain Specific Skills Refresh & Practical Practice", "hours": 6.0},
                {"module_name": "Soft Skills, Communication & Work Ethics", "hours": 3.0},
                {"module_name": "Health, Safety, PPE, Digital Literacy & UPI / Cashless Payments", "hours": 3.0}
            ],
            "requires_bridge_course": len(bridge_modules) > 0 or rec == "NOT_YET_COMPETENT",
            "bridge_modules": bridge_modules,
            "status": "ORIENTATION_COMPLETED" if rec == "RECOMMENDED_CERTIFIED" else (
                "BRIDGE_TRAINING_PRESCRIBED" if bridge_modules else "ORIENTATION_PENDING"
            ),
            "prescribed_action": (
                "Mandatory 12-hour orientation successfully fulfilled. Candidate certified under NSQF standards."
                if rec == "RECOMMENDED_CERTIFIED" else (
                    f"Candidate recommended for {len(bridge_modules) * 12 or 12}-Hour NCVET Bridge Training across {len(bridge_modules)} module(s) prior to modular re-assessment."
                    if bridge_modules else
                    "Complete all unassessed criteria and mandatory evidence before orientation certification."
                )
            )
        }

        return {
            "session_id": session.id,
            "qualification_title": qual.title,
            "nsqf_level": qual.nsqf_level,
            "passing_thresholds": {
                "theory_min_percentage": min_th_pct,
                "practical_min_percentage": min_pr_pct
            },
            "scores": {
                "theory": {"obtained": theory_obtained, "max": theory_max, "percentage": theory_pct},
                "practical": {"obtained": practical_obtained, "max": practical_max, "percentage": practical_pct},
                "overall": {"obtained": total_obtained, "max": total_max, "percentage": overall_pct}
            },
            "nos_subtotals": list(nos_map.values()),
            "flags": {
                "incomplete_criteria_count": len(incomplete_criteria),
                "incomplete_criteria_codes": incomplete_criteria,
                "missing_evidence_count": len(missing_evidence_criteria),
                "missing_evidence_codes": missing_evidence_criteria
            },
            "provisional_recommendation": rec,
            "provisional_reason": rec_reason,
            "orientation_and_bridge_plan": orientation_and_bridge_plan
        }

    @staticmethod
    def finalize_decision(
        session: AssessmentSession,
        assessor: User,
        decision: str,
        remarks: str
    ) -> Dict[str, Any]:
        """
        Only an authorized Assessor or Admin can finalize the certification decision.
        Enforces human-in-the-loop governance and immutable audit trail.
        """
        if assessor.role not in ["assessor", "admin"]:
            raise PermissionError("Only an authorized assessor or administrator can finalize an assessment decision.")

        valid_decisions = ["CERTIFIED", "NOT_YET_COMPETENT", "DEFERRED"]
        if decision not in valid_decisions:
            raise ValueError(f"Invalid decision '{decision}'. Must be one of: {valid_decisions}")

        # Recalculate to verify up-to-date state
        calc_result = ScoringEngine.calculate_session_scores(session)
        
        # Guard: Incomplete assessments cannot be certified
        if decision == "CERTIFIED" and calc_result["flags"]["incomplete_criteria_count"] > 0:
            raise ValueError(
                f"Cannot certify candidate: {calc_result['flags']['incomplete_criteria_count']} criteria remain unassessed."
            )

        now = utc_now()
        # Create cryptographic signature hash for audit integrity
        sig_raw = f"{session.id}:{assessor.id}:{decision}:{now.isoformat()}"
        sig_hash = hashlib.sha256(sig_raw.encode("utf-8")).hexdigest()

        session.assessor_id = assessor.id
        session.assessor_final_decision = decision
        session.assessor_remarks = remarks
        session.assessor_signature_hash = sig_hash
        session.signed_off_at = now
        session.status = "finalized"

        # Record audit log
        audit = AuditLog(
            session_id=session.id,
            user_id=assessor.id,
            action="ASSESSMENT_FINALIZED",
            entity_type="AssessmentSession",
            entity_id=session.id,
            details=json.dumps({
                "decision": decision,
                "remarks": remarks,
                "signature_hash": sig_hash,
                "theory_percentage": session.theory_percentage,
                "practical_percentage": session.practical_percentage,
                "overall_percentage": session.overall_percentage,
                "provisional_recommendation": session.provisional_recommendation
            })
        )
        db.session.add(audit)
        db.session.commit()

        return {
            "session_id": session.id,
            "assessor_id": assessor.id,
            "assessor_name": assessor.full_name,
            "decision": decision,
            "remarks": remarks,
            "signature_hash": sig_hash,
            "signed_off_at": now.isoformat(),
            "status": session.status
        }
