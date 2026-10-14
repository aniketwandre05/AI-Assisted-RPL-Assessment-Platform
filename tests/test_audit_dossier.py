import pytest


def test_audit_dossier_unauthorized_access(client, worker_headers):
    """Verify that worker role or unauthenticated requests are denied access to the audit dossier."""
    # Unauthenticated -> 401
    res_noauth = client.get("/api/v1/assessments/audit/dossier")
    assert res_noauth.status_code == 401

    # Worker role -> 403 Forbidden
    res_worker = client.get("/api/v1/assessments/audit/dossier", headers=worker_headers)
    assert res_worker.status_code == 403


def test_audit_dossier_admin_export_json_and_markdown(client, admin_user, assessor_headers, sample_qualification, worker_user):
    """Verify that Admin and Assessor can export consolidated NCVET Audit Dossier."""
    admin_token = admin_user.generate_auth_token()
    admin_headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

    # 1. Create and score a session so session registry and audit logs have data
    sess_res = client.post("/api/v1/assessments/sessions", headers=assessor_headers, json={
        "worker_id": worker_user.id,
        "qualification_id": sample_qualification.id
    })
    assert sess_res.status_code == 201

    # 2. Fetch JSON dossier as Admin
    res = client.get("/api/v1/assessments/audit/dossier?format=json", headers=admin_headers)
    assert res.status_code == 200
    data = res.get_json()

    assert "dossier" in data
    dossier = data["dossier"]
    assert "dossier_id" in dossier
    assert dossier["problem_statement"] == "SIH26242"
    assert "executive_summary" in dossier
    assert "inter_assessor_consistency_benchmark" in dossier
    assert "sessions_registry" in dossier
    assert "tamper_evident_audit_ledger" in dossier

    # Check consistency benchmark content
    consistency = dossier["inter_assessor_consistency_benchmark"]
    assert "fleiss_kappa" in consistency
    assert "exact_agreement_pct" in consistency

    # 3. Fetch Markdown summary
    res_md = client.get("/api/v1/assessments/audit/dossier?format=markdown", headers=admin_headers)
    assert res_md.status_code == 200
    data_md = res_md.get_json()
    assert "markdown" in data_md
    assert "NCVET RPL Platform Official Audit Dossier" in data_md["markdown"]
    assert "Fleiss' Kappa" in data_md["markdown"]
