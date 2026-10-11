import json
import pytest
from backend.models.user import User
from backend.models.worker_profile import WorkerProfile
from backend.models.qualification import Qualification
from backend.matching_engine import MatchingEngine

def test_extract_skill_terms():
    text = "I have 3 years of experience writing Spring Boot APIs, using Angular for frontend, Docker for deployment, and MySQL Workbench."
    terms = MatchingEngine.extract_skill_terms(text)
    
    assert "spring boot" in terms
    assert "angular" in terms
    assert "docker" in terms
    assert "mysql" in terms

def test_match_worker_profile_software_developer(app, db_session, worker_user, sample_qualification):
    # Create worker profile with software skills
    prof = WorkerProfile(
        user_id=worker_user.id,
        occupation_title="Full Stack Software Developer",
        experience_years=3.0,
        daily_tasks=json.dumps(["Build web applications", "Write code and test features", "Deploy with Docker"]),
        tools_used=json.dumps(["VS Code", "Git", "Docker"]),
        skills_declared=json.dumps(["Java", "Spring Boot", "Web Development"]),
        status="submitted"
    )
    db_session.add(prof)
    db_session.commit()

    result = MatchingEngine.match_worker_profile(prof, min_threshold=15.0)

    assert result["is_match_found"] is True
    assert len(result["matches"]) >= 1
    top = result["top_match"]
    assert "Developer" in top["title"]
    assert top["match_score"] >= 15.0
    assert "matched_criteria" in top["rationale"]
    assert "reason_summary" in top["rationale"]

def test_explicit_no_match_for_unrelated_profession(app, db_session, other_worker_user, sample_qualification):
    # Create worker profile with completely unrelated trade (e.g. baking/pastry)
    prof = WorkerProfile(
        user_id=other_worker_user.id,
        occupation_title="Master Bakery Chef",
        experience_years=5.0,
        daily_tasks=json.dumps(["Bake sourdough artisan loaves", "Decorate wedding cakes with fondant", "Knead dough"]),
        tools_used=json.dumps(["Baking trays", "Flour sifter", "Rotary oven"]),
        skills_declared=json.dumps(["Pastry baking", "Yeast fermentation", "Icing"]),
        status="submitted"
    )
    db_session.add(prof)
    db_session.commit()

    result = MatchingEngine.match_worker_profile(prof, min_threshold=15.0)

    # MUST return explicit no-match outcome
    assert result["is_match_found"] is False
    assert len(result["matches"]) == 0
    assert "No official NSQF qualification" in result["reason"]

def test_matching_api_endpoint(client, worker_headers, worker_user, sample_qualification):
    # Set up profile first
    client.post("/api/v1/worker/profile", headers=worker_headers, json={
        "occupation_title": "Software Developer",
        "experience_years": 2.0,
        "daily_tasks": ["Develop web software", "Write unit tests"],
        "tools_used": ["VS Code", "Git"],
        "skills_declared": ["Software Development", "Web Development"]
    })

    # Trigger matching via API
    res = client.post("/api/v1/worker/match-qualifications", headers=worker_headers, json={
        "min_threshold": 15.0
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["is_match_found"] is True
    assert len(data["matches"]) >= 1
    assert "Developer" in data["top_match"]["title"]
