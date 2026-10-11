import pytest
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import create_app
from backend.database import db
from backend.models.user import User
from backend.models.qualification import (
    Qualification,
    NationalOccupationalStandard,
    PerformanceCriterion,
    AssessmentTaskRubric,
    EvidenceRequirement,
    PassingRule
)

class TestingConfig:
    TESTING = True
    SECRET_KEY = "test-secret-key-12345"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = PROJECT_ROOT / "data" / "test_uploads"
    REPORTS_DIR = PROJECT_ROOT / "data" / "test_reports"
    REFERENCES_DIR = PROJECT_ROOT / "References"
    NQR_EXCEL_PATH = PROJECT_ROOT / "Data_Qualification_Register_11-Oct-2026.xlsx"

@pytest.fixture
def app():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def db_session(app):
    with app.app_context():
        yield db.session

@pytest.fixture
def worker_user(db_session):
    user = User(
        email="test_worker@example.com",
        role="worker",
        full_name="Test Worker",
        phone="1234567890",
        aadhaar_last_four="1111"
    )
    user.set_password("WorkerPass123")
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def other_worker_user(db_session):
    user = User(
        email="other_worker@example.com",
        role="worker",
        full_name="Other Worker",
        phone="1234567899",
        aadhaar_last_four="9999"
    )
    user.set_password("OtherPass123")
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def assessor_user(db_session):
    user = User(
        email="test_assessor@example.com",
        role="assessor",
        full_name="Test Assessor",
        phone="9876543210"
    )
    user.set_password("AssessorPass123")
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def admin_user(db_session):
    user = User(
        email="test_admin@example.com",
        role="admin",
        full_name="Test Admin"
    )
    user.set_password("AdminPass123")
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def worker_headers(worker_user):
    token = worker_user.generate_auth_token()
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

@pytest.fixture
def other_worker_headers(other_worker_user):
    token = other_worker_user.generate_auth_token()
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

@pytest.fixture
def assessor_headers(assessor_user):
    token = assessor_user.generate_auth_token()
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

@pytest.fixture
def sample_qualification(db_session):
    qual = Qualification(
        title="Sample Web Developer",
        trade="Software Developer",
        sector="IT-ITeS",
        nsqf_level=4.5,
        nqr_code="QG-4.5-IT-TEST",
        notional_hours_total=600.0,
        credits=20.0,
        is_synthetic=False,
        is_verified=True
    )
    db_session.add(qual)

    rule = PassingRule(
        qualification=qual,
        theory_min_percentage=40.0,
        practical_min_percentage=60.0,
        is_source_supported=True
    )
    db_session.add(rule)

    # NOS 1 (Theory oriented)
    nos1 = NationalOccupationalStandard(
        qualification=qual,
        nos_code="TEST/NOS/01",
        title="Theoretical Concepts",
        nos_type="Core",
        theory_marks=100.0,
        practical_marks=0.0
    )
    db_session.add(nos1)

    pc1 = PerformanceCriterion(
        occupational_standard=nos1,
        criterion_code="TEST_PC01",
        criterion_text="Explain foundational concepts.",
        criterion_type="Theory",
        max_score=10.0,
        is_score_inferred=False
    )
    db_session.add(pc1)

    # NOS 2 (Practical oriented)
    nos2 = NationalOccupationalStandard(
        qualification=qual,
        nos_code="TEST/NOS/02",
        title="Practical Execution",
        nos_type="Core",
        theory_marks=0.0,
        practical_marks=100.0
    )
    db_session.add(nos2)

    pc2 = PerformanceCriterion(
        occupational_standard=nos2,
        criterion_code="TEST_PC02",
        criterion_text="Demonstrate building a feature.",
        criterion_type="Practical",
        max_score=10.0,
        is_score_inferred=False
    )
    db_session.add(pc2)

    ev2 = EvidenceRequirement(
        criterion=pc2,
        evidence_type="video",
        is_mandatory=True,
        description="Mandatory practical video"
    )
    db_session.add(ev2)

    db_session.commit()
    return qual
