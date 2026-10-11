import csv
import json
from pathlib import Path
import numpy as np
import pytest
from backend.models.user import User
from backend.models.worker_profile import WorkerProfile
from backend.scoring_engine import ScoringEngine
from backend.matching_engine import MatchingEngine
from backend.importers.pdf_qualification_importer import FullStackPDFImporter
from backend.importers.demo_qualifications import create_demo_electrician_qualification

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

def test_worker_skill_profiles_csv_dataset(app, db_session, worker_user):
    """
    Verifies worker_skill_profiles.csv dataset and checks matching engine performance.
    """
    pdf_path = app.config["REFERENCES_DIR"] / "FULL-STACK DEVELOPER.pdf"
    if pdf_path.exists():
        importer = FullStackPDFImporter(pdf_path)
        importer.import_to_db()
    create_demo_electrician_qualification()
    csv_path = DATA_DIR / "worker_skill_profiles.csv"
    assert csv_path.exists(), "worker_skill_profiles.csv must exist in data/"

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    assert len(rows) >= 5, "Dataset must contain at least 5 synthetic worker profiles"

    for r in rows:
        u = User(
            email=f"{r['worker_id'].lower()}@example.com",
            role="worker",
            full_name=r["full_name"]
        )
        u.set_password("Password123!")
        db_session.add(u)
        db_session.commit()

        # Create profile
        tasks = [t.strip() for t in r["daily_tasks"].split(";") if t.strip()]
        tools = [t.strip() for t in r["tools_used"].split(";") if t.strip()]
        skills = [s.strip() for s in r["skills_declared"].split(";") if s.strip()]

        prof = WorkerProfile(
            user_id=u.id,
            occupation_title=r["trade"],
            experience_years=float(r["experience_years"]),
            daily_tasks=json.dumps(tasks),
            tools_used=json.dumps(tools),
            skills_declared=json.dumps(skills),
            status="submitted"
        )
        db_session.add(prof)
        db_session.commit()

        # Run match
        res = MatchingEngine.match_worker_profile(prof, min_threshold=15.0)
        expected_match = r["expected_matched_qualification"]

        if expected_match == "NO_MATCH":
            assert res["is_match_found"] is False
            assert "No official NSQF qualification" in res["reason"]
        else:
            assert res["is_match_found"] is True, f"Failed for {r['worker_id']}: {res}"
            assert len(res["matches"]) >= 1

def test_assessment_test_cases_csv_dataset():
    """
    Verifies assessment_test_cases.csv dataset and outcome logic.
    """
    csv_path = DATA_DIR / "assessment_test_cases.csv"
    assert csv_path.exists(), "assessment_test_cases.csv must exist in data/"

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        test_cases = list(reader)

    assert len(test_cases) >= 5, "Dataset must contain at least 5 assessment test scenarios"

    for tc in test_cases:
        th_pct = float(tc["theory_score_pct"])
        pr_pct = float(tc["practical_score_pct"])
        has_ev = tc["has_mandatory_evidence"].lower() == "true"
        has_unassessed = tc["has_unassessed_criteria"].lower() == "true"

        # Determine outcome according to deterministic rules
        if has_unassessed:
            rec = "INCOMPLETE_ASSESSMENT"
        elif not has_ev:
            rec = "INCOMPLETE_ASSESSMENT"
        elif th_pct >= 40.0 and pr_pct >= 60.0:
            rec = "RECOMMENDED_CERTIFIED"
        else:
            rec = "NOT_YET_COMPETENT"

        assert rec == tc["expected_provisional_rec"]

def test_assessor_scores_csv_dataset():
    """
    Verifies assessor_scores.csv dataset and computes evaluator variance comparison.
    """
    csv_path = DATA_DIR / "assessor_scores.csv"
    assert csv_path.exists(), "assessor_scores.csv must exist in data/"

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        scores = list(reader)

    assert len(scores) >= 10, "Dataset must contain assessor score observations"

    # Separate unassisted vs rubric-assisted
    unassisted = [float(s["score_awarded"]) for s in scores if s["scoring_mode"] == "UNASSISTED_MANUAL"]
    assisted = [float(s["score_awarded"]) for s in scores if s["scoring_mode"] == "RUBRIC_ASSISTED"]

    assert len(unassisted) > 0
    assert len(assisted) > 0

    var_unassisted = np.var(unassisted, ddof=1)
    var_assisted = np.var(assisted, ddof=1)

    assert var_unassisted > 0
    assert var_assisted > 0
