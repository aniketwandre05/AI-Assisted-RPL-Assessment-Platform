import json
import pytest

def test_user_registration_and_login(client):
    # Register new worker
    res = client.post("/api/v1/auth/register", json={
        "email": "new_worker@test.com",
        "password": "Password123!",
        "role": "worker",
        "full_name": "New Worker",
        "phone": "9998887776",
        "aadhaar_last_four": "1234",
        "state": "Maharashtra"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert "token" in data
    assert data["user"]["role"] == "worker"

    # Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "new_worker@test.com",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    login_data = login_res.get_json()
    assert "token" in login_data
    assert login_data["user"]["full_name"] == "New Worker"

def test_worker_cannot_access_other_worker_records(client, worker_headers, other_worker_user):
    # Worker 1 tries to access Worker 2's profile
    res = client.get(f"/api/v1/worker/profile?worker_id={other_worker_user.id}", headers=worker_headers)
    assert res.status_code == 403
    assert "Unauthorized" in res.get_json()["error"]

    # Worker 1 tries to edit Worker 2's profile
    res_edit = client.post(f"/api/v1/worker/profile?worker_id={other_worker_user.id}", headers=worker_headers, json={
        "occupation_title": "Hacked Profile"
    })
    assert res_edit.status_code == 403
    assert "Cannot edit another worker's profile" in res_edit.get_json()["error"]

def test_worker_can_create_and_update_own_profile(client, worker_headers):
    # Create profile
    payload = {
        "occupation_title": "Self-Taught Front End Dev",
        "experience_years": 2.5,
        "current_workplace": "Freelance",
        "education_level": "12th Standard",
        "daily_tasks": ["Build responsive layouts", "Style components with CSS"],
        "tools_used": ["VS Code", "Chrome DevTools", "Git"],
        "skills_declared": ["HTML5", "CSS3", "JavaScript"],
        "informal_training_desc": "Learned via open source tutorials."
    }
    res = client.post("/api/v1/worker/profile", headers=worker_headers, json=payload)
    assert res.status_code == 200
    prof = res.get_json()["profile"]
    assert prof["occupation_title"] == "Self-Taught Front End Dev"
    assert prof["experience_years"] == 2.5
    assert "HTML5" in prof["skills_declared"]

    # Get own profile
    get_res = client.get("/api/v1/worker/profile", headers=worker_headers)
    assert get_res.status_code == 200
    assert get_res.get_json()["profile"]["occupation_title"] == "Self-Taught Front End Dev"
