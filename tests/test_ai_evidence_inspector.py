import pytest
from backend.ai_evidence_inspector import AiEvidenceInspector
from backend.models.assessment import AssessmentSession, AssessmentEvidence


def test_ai_inspector_electrical_multimeter_telemetry():
    """Verify Computer Vision evidence inspection for electrical trade criteria."""
    result = AiEvidenceInspector.inspect(
        evidence_type="video",
        title="Multimeter AC voltage measurement on solar inverter with safety gloves",
        external_url="https://storage.rpl.gov.in/solar_pv_test.mp4",
        criterion_text="Measure open-circuit voltage using calibrated digital multimeter adhering to safety norms."
    )

    assert result["status"] == "VERIFIED_COMPLIANT"
    assert result["confidence_score"] >= 0.90
    assert result["suggested_rubric_level"] in [3, 4]
    
    # Check that electrical objects and PPE tags were detected
    tags_str = " ".join(result["detected_tags"])
    assert "Multimeter" in tags_str or "Voltage" in tags_str
    assert "Gloves" in tags_str or "Safety" in tags_str or "PPE" in tags_str
    assert "Solar" in tags_str or "Inverter" in tags_str


def test_ai_inspector_software_docker_telemetry():
    """Verify Computer Vision evidence inspection for full stack / cloud criteria."""
    result = AiEvidenceInspector.inspect(
        evidence_type="video",
        title="Docker containerization of Spring Boot REST API and Postman testing",
        external_url="https://storage.rpl.gov.in/docker_deploy.mp4",
        criterion_text="Containerize backend services and verify REST endpoints."
    )

    assert result["status"] == "VERIFIED_COMPLIANT"
    assert result["confidence_score"] >= 0.90
    tags_str = " ".join(result["detected_tags"])
    assert "Docker" in tags_str or "Container" in tags_str
    assert "Spring" in tags_str or "API" in tags_str or "Postman" in tags_str


def test_ai_inspector_hazard_anomaly_detection():
    """Verify that unsafe practices or live wire hazards trigger an anomaly flag."""
    result = AiEvidenceInspector.inspect(
        evidence_type="photo",
        title="Live terminal connection with bare hand and loose wire",
        criterion_text="Connect distribution panel wires safely."
    )

    assert result["status"] == "FLAGGED_ANOMALY"
    assert result["suggested_rubric_level"] == 1
    assert "Warning" in result["summary"] or "anomaly" in result["summary"]


def test_ai_inspector_endpoint_and_reanalyze(client, assessor_headers, worker_user, sample_qualification):
    """Verify API integration of AI Evidence Inspector and re-analysis endpoint."""
    # 1. Create session
    sess_res = client.post("/api/v1/assessments/sessions", headers=assessor_headers, json={
        "worker_id": worker_user.id,
        "qualification_id": sample_qualification.id
    })
    session_id = sess_res.get_json()["session"]["id"]
    criterion_id = sample_qualification.occupational_standards[0].performance_criteria[0].id

    # 2. Attach evidence (auto-inspected)
    ev_res = client.post(f"/api/v1/assessments/sessions/{session_id}/evidence", headers=assessor_headers, json={
        "evidence_type": "video",
        "title": "Demonstration using digital multimeter voltage tester",
        "criterion_id": criterion_id,
        "external_url": "https://storage.rpl.gov.in/multimeter_demo.mp4"
    })
    assert ev_res.status_code == 201
    data = ev_res.get_json()
    assert "ai_inspection" in data
    assert data["ai_inspection"]["status"] == "VERIFIED_COMPLIANT"
    assert len(data["ai_inspection"]["detected_tags"]) > 0
    evidence_id = data["evidence"]["id"]

    # 3. Call re-analyze inspect endpoint
    re_res = client.post(f"/api/v1/assessments/evidence/{evidence_id}/inspect", headers=assessor_headers)
    assert re_res.status_code == 200
    re_data = re_res.get_json()
    assert re_data["evidence"]["ai_analysis"]["status"] == "VERIFIED_COMPLIANT"
    assert re_data["evidence"]["ai_analysis"]["confidence_score"] >= 0.88
