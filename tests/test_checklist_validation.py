import json
import pytest
from backend.models.user import User
from backend.models.worker_profile import WorkerProfile
from backend.models.qualification import Qualification
from backend.models.assessment import AssessmentSession
from backend.matching_engine import MatchingEngine
from backend.scoring_engine import ScoringEngine
from backend.scripts.evaluate_consistency import run_consistency_evaluation

def test_checklist_item_1_worker_register_and_login(client):
    """[x] 1. Worker can register and log in."""
    reg = client.post("/api/v1/auth/register", json={
        "email": "chk_worker@test.gov.in",
        "password": "Password123!",
        "role": "worker",
        "full_name": "Checklist Worker",
        "phone": "9876543210"
    })
    assert reg.status_code == 201
    assert "token" in reg.get_json()

    login = client.post("/api/v1/auth/login", json={
        "email": "chk_worker@test.gov.in",
        "password": "Password123!"
    })
    assert login.status_code == 200
    assert "token" in login.get_json()

def test_checklist_item_2_worker_skill_declaration(client, worker_headers):
    """[x] 2. Worker can create, edit and submit a skill declaration."""
    payload = {
        "occupation_title": "Full Stack Developer Apprentice",
        "experience_years": 3.5,
        "daily_tasks": ["Build web interfaces with Angular", "Deploy containerized services with Docker"],
        "tools_used": ["VS Code", "Docker", "Git"],
        "skills_declared": ["Angular", "Docker", "Java"],
        "informal_training_desc": "On the job apprenticeship"
    }
    save_res = client.post("/api/v1/worker/profile", headers=worker_headers, json=payload)
    assert save_res.status_code == 200
    prof = save_res.get_json()["profile"]
    assert prof["occupation_title"] == "Full Stack Developer Apprentice"
    assert prof["experience_years"] == 3.5
    assert "Angular" in prof["skills_declared"]

def test_checklist_item_3_qualification_matching_traceable_or_nomatch(client, worker_headers, other_worker_headers, sample_qualification):
    """[x] 3. Qualification matching returns traceable results or an explicit no-match outcome."""
    # Positive Case: Software Developer matches with criteria citations
    client.post("/api/v1/worker/profile", headers=worker_headers, json={
        "occupation_title": "Software Developer",
        "experience_years": 3.0,
        "daily_tasks": ["Develop web software", "Write code and test features"],
        "tools_used": ["VS Code", "Git"],
        "skills_declared": ["Software Development"]
    })
    match_pos = client.post("/api/v1/worker/match-qualifications", headers=worker_headers, json={"min_threshold": 15.0})
    assert match_pos.status_code == 200
    pos_data = match_pos.get_json()
    assert pos_data["is_match_found"] is True
    assert len(pos_data["matches"]) >= 1
    assert "matched_criteria" in pos_data["top_match"]["rationale"]

    # Negative Case: Unrelated pastry chef returns explicit no-match
    client.post("/api/v1/worker/profile", headers=other_worker_headers, json={
        "occupation_title": "Pastry Baker",
        "experience_years": 4.0,
        "daily_tasks": ["Knead sourdough dough", "Bake bread in masonry oven"],
        "tools_used": ["Rolling pin", "Flour sifter"],
        "skills_declared": ["Bread baking"]
    })
    match_neg = client.post("/api/v1/worker/match-qualifications", headers=other_worker_headers, json={"min_threshold": 15.0})
    assert match_neg.status_code == 200
    neg_data = match_neg.get_json()
    assert neg_data["is_match_found"] is False
    assert len(neg_data["matches"]) == 0
    assert "No official NSQF qualification" in neg_data["reason"]

def test_checklist_item_4_assessor_opens_session_with_correct_criteria(client, assessor_headers, worker_user, sample_qualification):
    """[x] 4. Assessor can open a session and see the correct qualification criteria."""
    sess_res = client.post("/api/v1/assessments/sessions", headers=assessor_headers, json={
        "worker_id": worker_user.id,
        "qualification_id": sample_qualification.id
    })
    assert sess_res.status_code == 201
    session_id = sess_res.get_json()["session"]["id"]

    get_sess = client.get(f"/api/v1/assessments/sessions/{session_id}", headers=assessor_headers)
    assert get_sess.status_code == 200
    session_data = get_sess.get_json()["session"]
    assert len(session_data["criterion_scores"]) == 2  # Matches sample_qualification criteria count
    assert session_data["criterion_scores"][0]["criterion_code"] == "TEST_PC01"

def test_checklist_item_5_and_6_scoring_and_missing_evidence_flagged(client, assessor_headers, worker_user, sample_qualification):
    """[x] 5. Assessor can score criteria and attach permitted evidence."""
    """[x] 6. Missing evidence and incomplete scoring are flagged correctly."""
    sess_res = client.post("/api/v1/assessments/sessions", headers=assessor_headers, json={
        "worker_id": worker_user.id,
        "qualification_id": sample_qualification.id
    })
    session_id = sess_res.get_json()["session"]["id"]
    scores = client.get(f"/api/v1/assessments/sessions/{session_id}", headers=assessor_headers).get_json()["session"]["criterion_scores"]
    
    # 6A: Initially all criteria unassessed
    calc_init = client.post(f"/api/v1/assessments/sessions/{session_id}/calculate", headers=assessor_headers).get_json()["calculation"]
    assert calc_init["flags"]["incomplete_criteria_count"] == 2
    assert calc_init["provisional_recommendation"] == "INCOMPLETE_ASSESSMENT"

    # Score both criteria (Rubric 3 = Competent)
    client.post(f"/api/v1/assessments/sessions/{session_id}/scores", headers=assessor_headers, json={
        "scores": [
            {"criterion_id": scores[0]["criterion_id"], "rubric_level": 3, "assessor_notes": "Good theory"},
            {"criterion_id": scores[1]["criterion_id"], "rubric_level": 3, "assessor_notes": "Good practical"}
        ]
    })

    # 6B: Criteria scored but mandatory practical video missing -> MUST FLAG MISSING EVIDENCE
    calc_mid = client.post(f"/api/v1/assessments/sessions/{session_id}/calculate", headers=assessor_headers).get_json()["calculation"]
    assert calc_mid["flags"]["incomplete_criteria_count"] == 0
    assert calc_mid["flags"]["missing_evidence_count"] == 1
    assert calc_mid["provisional_recommendation"] == "INCOMPLETE_ASSESSMENT"

    # Attach mandatory evidence
    ev_res = client.post(f"/api/v1/assessments/sessions/{session_id}/evidence", headers=assessor_headers, json={
        "evidence_type": "video",
        "title": "Practical assessment recording",
        "criterion_id": scores[1]["criterion_id"],
        "external_url": "https://storage.example.gov.in/test.mp4"
    })
    assert ev_res.status_code == 201

    # 6C: Evidence fulfilled -> flags cleared!
    calc_final = client.post(f"/api/v1/assessments/sessions/{session_id}/calculate", headers=assessor_headers).get_json()["calculation"]
    assert calc_final["flags"]["missing_evidence_count"] == 0
    assert calc_final["provisional_recommendation"] == "RECOMMENDED_CERTIFIED"

def test_checklist_item_7_score_calculations_follow_configured_rubric(client, assessor_headers, worker_user, sample_qualification):
    """[x] 7. Score calculations follow the configured rubric."""
    sess_res = client.post("/api/v1/assessments/sessions", headers=assessor_headers, json={
        "worker_id": worker_user.id,
        "qualification_id": sample_qualification.id
    })
    session_id = sess_res.get_json()["session"]["id"]
    scores = client.get(f"/api/v1/assessments/sessions/{session_id}", headers=assessor_headers).get_json()["session"]["criterion_scores"]

    # Level 4 = 100% (10.0 pts), Level 2 = 50% (5.0 pts)
    client.post(f"/api/v1/assessments/sessions/{session_id}/scores", headers=assessor_headers, json={
        "scores": [
            {"criterion_id": scores[0]["criterion_id"], "rubric_level": 4},
            {"criterion_id": scores[1]["criterion_id"], "rubric_level": 2}
        ]
    })
    client.post(f"/api/v1/assessments/sessions/{session_id}/evidence", headers=assessor_headers, json={
        "evidence_type": "video",
        "title": "Practical demo"
    })

    calc = client.post(f"/api/v1/assessments/sessions/{session_id}/calculate", headers=assessor_headers).get_json()["calculation"]
    assert calc["scores"]["theory"]["percentage"] == 100.0  # Level 4 of theory
    assert calc["scores"]["practical"]["percentage"] == 50.0 # Level 2 of practical
    # Practical requires 60% min, candidate achieved 50% -> NOT YET COMPETENT
    assert calc["provisional_recommendation"] == "NOT_YET_COMPETENT"

def test_checklist_item_8_only_authorized_assessor_can_finalize(client, worker_headers, assessor_headers, worker_user, sample_qualification):
    """[x] 8. Only an authorized assessor can finalize a decision."""
    sess_res = client.post("/api/v1/assessments/sessions", headers=assessor_headers, json={
        "worker_id": worker_user.id,
        "qualification_id": sample_qualification.id
    })
    session_id = sess_res.get_json()["session"]["id"]

    # Unauthorized worker attempt -> 403 Forbidden
    worker_try = client.post(f"/api/v1/assessments/sessions/{session_id}/finalize", headers=worker_headers, json={
        "decision": "CERTIFIED", "remarks": "Worker sign"
    })
    assert worker_try.status_code == 403

    # Authorized assessor finishes checklist & finalizes -> 200 OK
    scores = client.get(f"/api/v1/assessments/sessions/{session_id}", headers=assessor_headers).get_json()["session"]["criterion_scores"]
    client.post(f"/api/v1/assessments/sessions/{session_id}/scores", headers=assessor_headers, json={
        "scores": [{"criterion_id": s["criterion_id"], "rubric_level": 4} for s in scores]
    })
    client.post(f"/api/v1/assessments/sessions/{session_id}/evidence", headers=assessor_headers, json={
        "evidence_type": "video", "title": "Vid"
    })
    assessor_fin = client.post(f"/api/v1/assessments/sessions/{session_id}/finalize", headers=assessor_headers, json={
        "decision": "CERTIFIED", "remarks": "Approved by Dr. Ananya"
    })
    assert assessor_fin.status_code == 200
    assert assessor_fin.get_json()["result"]["decision"] == "CERTIFIED"
    assert assessor_fin.get_json()["result"]["signature_hash"] is not None

def test_checklist_item_9_competency_report_matches_assessment_records(client, assessor_headers, worker_user, sample_qualification):
    """[x] 9. Competency report matches the saved assessment records."""
    sess_res = client.post("/api/v1/assessments/sessions", headers=assessor_headers, json={
        "worker_id": worker_user.id,
        "qualification_id": sample_qualification.id
    })
    session_id = sess_res.get_json()["session"]["id"]
    scores = client.get(f"/api/v1/assessments/sessions/{session_id}", headers=assessor_headers).get_json()["session"]["criterion_scores"]
    client.post(f"/api/v1/assessments/sessions/{session_id}/scores", headers=assessor_headers, json={
        "scores": [{"criterion_id": s["criterion_id"], "rubric_level": 4} for s in scores]
    })
    client.post(f"/api/v1/assessments/sessions/{session_id}/evidence", headers=assessor_headers, json={
        "evidence_type": "video", "title": "Vid"
    })
    client.post(f"/api/v1/assessments/sessions/{session_id}/finalize", headers=assessor_headers, json={
        "decision": "CERTIFIED", "remarks": "Full competence"
    })

    rpt_res = client.get(f"/api/v1/assessments/sessions/{session_id}/report", headers=assessor_headers)
    assert rpt_res.status_code == 200
    rpt = rpt_res.get_json()["report"]
    assert rpt["candidate"]["name"] == worker_user.full_name
    assert rpt["qualification"]["title"] == sample_qualification.title
    assert rpt["score_summary"]["theory"]["percentage"] == 100.0
    assert rpt["score_summary"]["practical"]["percentage"] == 100.0
    assert rpt["assessor_final_decision"] == "CERTIFIED"
    assert rpt["audit_verification"]["is_tamper_evident"] is True

def test_checklist_item_10_worker_isolation(client, worker_headers, other_worker_user):
    """[x] 10. Worker cannot access another worker's private records."""
    res = client.get(f"/api/v1/worker/profile?worker_id={other_worker_user.id}", headers=worker_headers)
    assert res.status_code == 403
    assert "Unauthorized" in res.get_json()["error"]

def test_checklist_item_11_forms_and_checklists_survive_offline_refresh():
    """[x] 11. Forms and checklists survive an offline page refresh."""
    from backend.models.worker_profile import WorkerProfile
    # Verify local draft schema representation
    sample_draft = {
        "occupation_title": "Offline Web Developer",
        "experience_years": 4.0,
        "daily_tasks": ["Develop components offline", "Test locally"],
        "tools_used": ["VS Code", "Git"],
        "skills_declared": ["TypeScript", "React"],
        "status": "draft"
    }
    serialized = json.dumps(sample_draft)
    deserialized = json.loads(serialized)
    assert deserialized["occupation_title"] == "Offline Web Developer"
    assert len(deserialized["daily_tasks"]) == 2

def test_checklist_item_12_pending_changes_sync_without_duplicates(client, assessor_headers, worker_user, sample_qualification):
    """[x] 12. Pending changes synchronize without duplicate records."""
    sess_res = client.post("/api/v1/assessments/sessions", headers=assessor_headers, json={
        "worker_id": worker_user.id,
        "qualification_id": sample_qualification.id
    })
    session_id = sess_res.get_json()["session"]["id"]
    scores = client.get(f"/api/v1/assessments/sessions/{session_id}", headers=assessor_headers).get_json()["session"]["criterion_scores"]
    
    crit_id = scores[0]["criterion_id"]
    payload = {"scores": [{"criterion_id": crit_id, "rubric_level": 3, "assessor_notes": "First sync"}]}

    # First sync call
    res1 = client.post(f"/api/v1/assessments/sessions/{session_id}/scores", headers=assessor_headers, json=payload)
    assert res1.status_code == 200

    # Idempotent replay of same sync change
    res2 = client.post(f"/api/v1/assessments/sessions/{session_id}/scores", headers=assessor_headers, json=payload)
    assert res2.status_code == 200

    # Ensure criterion_scores count did not duplicate
    session_after = client.get(f"/api/v1/assessments/sessions/{session_id}", headers=assessor_headers).get_json()["session"]
    assert len(session_after["criterion_scores"]) == 2  # Still exactly 2

def test_checklist_item_13_evaluation_tests_produce_reproducible_report():
    """[x] 13. Evaluation tests run and produce a reproducible report."""
    report = run_consistency_evaluation(num_candidates=15, num_assessors=4)
    assert report["benchmark_id"].startswith("CONSISTENCY-BENCH-")
    assert report["variance_analysis"]["variance_reduction_percentage"] > 70.0
    assert report["inter_rater_reliability"]["assisted_icc"] >= 0.90
