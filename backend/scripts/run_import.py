import sys
import os
from pathlib import Path
import json

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import create_app
from backend.config import Config
from backend.database import db
from backend.models.user import User
from backend.models.worker_profile import WorkerProfile
from backend.importers.pdf_qualification_importer import FullStackPDFImporter
from backend.importers.demo_qualifications import create_demo_electrician_qualification
from backend.importers.nqr_importer import NQRMasterImporter
from backend.importers.validation_report import QualificationValidationReporter

def seed_users():
    seed_data = [
        {
            "email": "worker@rpl.gov.in",
            "password": "Password123!",
            "role": "worker",
            "full_name": "Rajesh Kumar",
            "phone": "9876543210",
            "aadhaar_last_four": "4589",
            "state": "Odisha",
            "profile": {
                "occupation_title": "Junior Full Stack Web Developer",
                "experience_years": 3.0,
                "current_workplace": "Local IT Solutions Freelance",
                "education_level": "12th Grade + Self-taught",
                "daily_tasks": [
                    "Develop responsive web UI with Angular and TypeScript",
                    "Build REST APIs with Spring Boot and JPA",
                    "Write SQL queries in MySQL workbench and create tables",
                    "Containerize backend services using Docker and test endpoints with Postman"
                ],
                "tools_used": ["VS Code", "MySQL Workbench", "Postman", "Git", "Docker", "JDK"],
                "skills_declared": ["HTML5/CSS3", "Angular", "Java", "Spring Boot", "MySQL", "REST APIs", "Docker"],
                "informal_training_desc": "Self-taught through open online projects and 3 years on-the-job freelance client delivery.",
                "status": "submitted"
            }
        },
        {
            "email": "assessor@rpl.gov.in",
            "password": "Password123!",
            "role": "assessor",
            "full_name": "Dr. Ananya Sharma",
            "phone": "9876543211",
            "aadhaar_last_four": "7812",
            "state": "Delhi",
            "profile": None
        },
        {
            "email": "admin@rpl.gov.in",
            "password": "Password123!",
            "role": "admin",
            "full_name": "National RPL Administrator",
            "phone": "9876543212",
            "aadhaar_last_four": "1001",
            "state": "Delhi",
            "profile": None
        }
    ]

    for item in seed_data:
        existing = User.query.filter_by(email=item["email"]).first()
        if not existing:
            user = User(
                email=item["email"],
                role=item["role"],
                full_name=item["full_name"],
                phone=item["phone"],
                aadhaar_last_four=item["aadhaar_last_four"],
                state=item["state"]
            )
            user.set_password(item["password"])
            db.session.add(user)
            db.session.flush()

            if item["profile"]:
                p_data = item["profile"]
                prof = WorkerProfile(
                    user_id=user.id,
                    occupation_title=p_data["occupation_title"],
                    experience_years=p_data["experience_years"],
                    current_workplace=p_data["current_workplace"],
                    education_level=p_data["education_level"],
                    daily_tasks=json.dumps(p_data["daily_tasks"]),
                    tools_used=json.dumps(p_data["tools_used"]),
                    skills_declared=json.dumps(p_data["skills_declared"]),
                    informal_training_desc=p_data["informal_training_desc"],
                    status=p_data["status"]
                )
                db.session.add(prof)
            print(f"   [SEED] Created default {item['role']}: {item['email']}")
    db.session.commit()

def main():
    app = create_app()
    with app.app_context():
        print("1. Creating database tables...")
        db.create_all()

        print("\n2. Seeding default role accounts (Worker, Assessor, Admin)...")
        seed_users()

        print("\n3. Importing Official FULL-STACK DEVELOPER Qualification PDF...")
        pdf_path = Config.REFERENCES_DIR / "FULL-STACK DEVELOPER.pdf"
        pdf_importer = FullStackPDFImporter(pdf_path)
        fs_qual = pdf_importer.import_to_db()
        print(f"   [SUCCESS] Imported '{fs_qual.title}' (ID: {fs_qual.id})")
        print(f"   - NOS Modules: {len(fs_qual.occupational_standards)}")
        print(f"   - Performance Criteria: {sum(len(nos.performance_criteria) for nos in fs_qual.occupational_standards)}")
        print(f"   - Tools & Equipment: {len(fs_qual.tools_and_equipment)}")
        print(f"   - Ambiguity Flags: {len(fs_qual.ambiguity_flags)}")

        print("\n4. Importing Clearly-Labelled Synthetic Demo Trade...")
        demo_qual = create_demo_electrician_qualification()
        print(f"   [SUCCESS] Imported '{demo_qual.title}' (ID: {demo_qual.id}, Synthetic: {demo_qual.is_synthetic})")

        print("\n5. Importing National Qualification Register (NQR) Master Register...")
        nqr_importer = NQRMasterImporter(Config.NQR_EXCEL_PATH)
        nqr_res = nqr_importer.import_master_register()
        print(f"   [SUCCESS] NQR Master Register: {nqr_res['imported_count']} new qualifications imported, {nqr_res['updated_count']} updated.")

        print("\n6. Generating Qualification Validation & Audit Report...")
        reporter = QualificationValidationReporter(Config.REPORTS_DIR)
        report = reporter.generate_report()
        print(f"   [SUCCESS] Report generated at: {Config.REPORTS_DIR / 'qualification_validation_report.md'}")
        print(f"   - Total qualifications in system: {report['summary']['total_qualifications']}")
        print(f"   - Total detailed criteria: {report['summary']['total_performance_criteria']}")
        print(f"   - Total ambiguity flags: {report['summary']['total_ambiguity_flags']}")

if __name__ == "__main__":
    main()
