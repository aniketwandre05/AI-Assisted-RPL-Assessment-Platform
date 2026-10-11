import json
import pytest
from backend.models.assessment import AssessmentSession, CriterionScore, AssessmentEvidence, AuditLog
from backend.scoring_engine import ScoringEngine

def test_session_creation_and_criteria_checklist(client, assessor_headers, worker_user, sample_qualification):
    # Assessor creates session
    res = client.post("/api/v1/assessments/sessions", headers=assessor_headers, json={
        "worker_id": worker_user.id,
        "qualification_id": sample_qualification.id,
        "location": "Bhubaneswar IT Skill Centre"
    })
    assert res.status_code == 201
    session_data = res.get_json()["session"]
    session_id = session_data["id"]

    # Verify session detail returns correct criteria checklist (2 criteria in sample)
    detail_res = client.get(f"/api/v1/assessments/sessions/{session_id}", headers=assessor_headers)
    assert detail_res.status_code == 200
    detail = detail_res.get_json()["session"]
    assert len(detail["criterion_scores"]) == 2
    # Initially incomplete
    assert detail["incomplete_criteria_count"] == 2
    assert detail["provisional_recommendation"] == "INCOMPLETE_ASSESSMENT"

def test_missing_evidence_and_scoring_rubric(client, assessor_headers, worker_user, sample_qualification):
    # Create session
    session_res = client.post("/api/v1/assessments/sessions", headers=assessor_headers, json={
        "worker_id": worker_user.id,
        "qualification_id": sample_qualification.id
    })
    session_id = session_res.get_json()["session"]["id"]
    detail = client.get(f"/api/v1/assessments/sessions/{session_id}", headers=assessor_headers).get_json()["session"]
    
    scores = detail["criterion_scores"]
    theory_crit = [c for c in scores if c["criterion_type"] == "Theory"][0]
    practical_crit = [c for c in scores if c["criterion_type"] == "Practical"][0]

    # Score both criteria with Competent (level 3 = 75%)
    score_payload = {
        "scores": [
            {"criterion_id": theory_crit["criterion_id"], "rubric_level": 3, "assessor_notes": "Good conceptual grasp"},
            {"criterion_id": practical_crit["criterion_id"], "rubric_level": 3, "assessor_notes": "Implemented feature successfully"}
        ]
    }
    score_res = client.post(f"/api/v1/assessments/sessions/{session_id}/scores", headers=assessor_headers, json=score_payload)
    assert score_res.status_code == 200
    calc = score_res.get_json()["calculation"]

    # Missing evidence flag MUST trigger because practical criterion has mandatory video requirement!
    assert calc["flags"]["missing_evidence_count"] == 1
    assert calc["provisional_recommendation"] == "INCOMPLETE_ASSESSMENT"

    # Now attach mandatory evidence
    ev_payload = {
        "evidence_type": "video",
        "title": "Practical Screen & Audio Recording",
        "criterion_id": practical_crit["criterion_id"],
        "external_url": "https://storage.example.gov.in/evidence/session_video.mp4"
    }
    ev_res = client.post(f"/api/v1/assessments/sessions/{session_id}/evidence", headers=assessor_headers, json=ev_payload)
    assert ev_res.status_code == 201

    # Recalculate - now evidence is fulfilled!
    recalc_res = client.post(f"/api/v1/assessments/sessions/{session_id}/calculate", headers=assessor_headers)
    assert recalc_res.status_code == 200
    recalc = recalc_res.get_json()["calculation"]

    assert recalc["flags"]["missing_evidence_count"] == 0
    assert recalc["scores"]["theory"]["percentage"] == 75.0
    assert recalc["scores"]["practical"]["percentage"] == 75.0
    # Both satisfy Theory >= 40% and Practical >= 60%
    assert recalc["provisional_recommendation"] == "RECOMMENDED_CERTIFIED"

def test_assessor_governance_and_worker_prevention(client, worker_headers, assessor_headers, worker_user, sample_qualification):
    # Create session
    session_res = client.post("/api/v1/assessments/sessions", headers=assessor_headers, json={
        "worker_id": worker_user.id,
        "qualification_id": sample_qualification.id
    })
    session_id = session_res.get_json()["session"]["id"]

    # Worker tries to finalize the assessment decision -> MUST BE REJECTED (403 Forbidden)
    worker_finalize = client.post(f"/api/v1/assessments/sessions/{session_id}/finalize", headers=worker_headers, json={
        "decision": "CERTIFIED",
        "remarks": "I certify myself"
    })
    assert worker_finalize.status_code == 403
    assert "Access denied" in worker_finalize.get_json()["error"]

    # Assessor tries to certify while criteria are unassessed -> MUST BE REJECTED (400 Bad Request)
    assessor_early = client.post(f"/api/v1/assessments/sessions/{session_id}/finalize", headers=assessor_headers, json={
        "decision": "CERTIFIED",
        "remarks": "Premature sign-off"
    })
    assert assessor_early.status_code == 400
    assert "Cannot certify" in assessor_early.get_json()["error"]

    # Score all criteria, add evidence, and finalize properly
    detail = client.get(f"/api/v1/assessments/sessions/{session_id}", headers=assessor_headers).get_json()["session"]
    scores = detail["criterion_scores"]
    for s in scores:
        client.post(f"/api/v1/assessments/sessions/{session_id}/scores", headers=assessor_headers, json={
            "scores": [{"criterion_id": s["criterion_id"], "rubric_level": 4}]
        })
    client.post(f"/api/v1/assessments/sessions/{session_id}/evidence", headers=assessor_headers, json={
        "evidence_type": "video",
        "title": "Complete session recording"
    })

    # Now authorized assessor finalizes
    fin_res = client.post(f"/api/v1/assessments/sessions/{session_id}/finalize", headers=assessor_headers, json={
        "decision": "CERTIFIED",
        "remarks": "Demonstrated full competence according to NSQF criteria."
    })
    assert fin_res.status_code == 200
    fin_data = fin_res.get_json()
    assert fin_data["result"]["decision"] == "CERTIFIED"
    assert fin_data["result"]["signature_hash"] is not None
    assert fin_data["session"]["status"] == "finalized"

    # Test Competency Report endpoint
    report_res = client.get(f"/api/v1/assessments/sessions/{session_id}/report", headers=assessor_headers)
    assert report_res.status_code == 200
    report = report_res.get_json()["report"]
    assert report["assessor_final_decision"] == "CERTIFIED"
    assert report["audit_verification"]["is_tamper_evident"] is True
    assert report["score_summary"]["theory"]["percentage"] == 100.0
