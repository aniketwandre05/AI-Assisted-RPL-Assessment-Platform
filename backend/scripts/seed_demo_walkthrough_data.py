"""
Seed rich, realistic synthetic data for the SAKSHAM RPL prototype walkthrough video.

Includes:
1. 5 diverse realistic candidates across multiple trades (Full-Stack, Solar PV, IoT, Embedded/CNC).
2. Realistic candidate skill profiles with authentic trade tasks, tools, and background statements in English and Hindi.
3. Multiple assessment sessions:
   - Certified sessions with official SHA-256 signatures, assessor remarks, and QR verification.
   - In-progress sessions ready for live scoring on video.
   - Gap-training session demonstrating NCVET Bridge Course prescription for competency shortfall.
4. Pre-attached AI Computer Vision evidence files with rich telemetry (multimeter DC voltage readings, Docker HTTP 200, PPE detection).
5. Comprehensive immutable cryptographic audit ledger records.
"""

import sys
import os
import json
import hashlib
from datetime import datetime, timezone, timedelta

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.database import db
from backend.models.user import User
from backend.models.worker_profile import WorkerProfile, QualificationMatch
from backend.models.qualification import Qualification, PerformanceCriterion
from backend.models.assessment import AssessmentSession, CriterionScore, AssessmentEvidence, AuditLog

from backend.scoring_engine import ScoringEngine

def sha256_text(text: str) -> str:
    return "SHA256: " + hashlib.sha256(text.encode("utf-8")).hexdigest()

def assign_criteria_scores(session, qual, rule_func):
    existing = {cs.criterion_id: cs for cs in session.criterion_scores}
    for nos in qual.occupational_standards:
        for pc in nos.performance_criteria:
            lvl = rule_func(pc)
            pct = ScoringEngine.RUBRIC_PERCENTAGES.get(lvl, 0.0)
            max_pts = pc.max_score or 10.0
            if pc.id in existing:
                cs = existing[pc.id]
                cs.rubric_level = lvl
                cs.score_awarded = max_pts * pct
            else:
                cs = CriterionScore(
                    session_id=session.id,
                    criterion_id=pc.id,
                    rubric_level=lvl,
                    score_awarded=max_pts * pct,
                    max_score=max_pts,
                    assessor_notes="Criterion demonstrated in accordance with NSQF standards." if lvl >= 3 else "Assessor evaluation note recorded."
                )
                db.session.add(cs)
    db.session.flush()
    ScoringEngine.calculate_session_scores(session)

def seed_data():
    app = create_app()
    with app.app_context():
        print("--- Starting Synthetic Data Seeding for SAKSHAM Walkthrough ---")

        # 1. Fetch Assessor & Admin
        assessor = User.query.filter_by(email="assessor@rpl.gov.in").first()
        admin = User.query.filter_by(email="admin@rpl.gov.in").first()
        rajesh = User.query.filter_by(email="worker@rpl.gov.in").first()

        if not assessor or not admin or not rajesh:
            print("Base users missing. Creating base users first...")
            if not assessor:
                assessor = User(email="assessor@rpl.gov.in", full_name="Dr. Ananya Sharma", role="assessor", state="Delhi")
                assessor.set_password("Password123!")
                db.session.add(assessor)
            if not admin:
                admin = User(email="admin@rpl.gov.in", full_name="National RPL Administrator", role="admin", state="Delhi")
                admin.set_password("Password123!")
                db.session.add(admin)
            if not rajesh:
                rajesh = User(email="worker@rpl.gov.in", full_name="Rajesh Kumar", role="worker", state="Odisha", aadhaar_last_four="4589")
                rajesh.set_password("Password123!")
                db.session.add(rajesh)
            db.session.commit()

        # 2. Find target qualifications
        full_stack_qual = Qualification.query.filter(Qualification.title.ilike("%FULL-STACK%")).first()
        solar_qual = Qualification.query.filter(Qualification.title.ilike("%SOLAR%")).first()

        if not full_stack_qual:
            print("Full-Stack qualification not found! Using first available qualification.")
            full_stack_qual = Qualification.query.first()
        if not solar_qual:
            solar_qual = full_stack_qual

        print(f"Using Qualifications: Full-Stack='{full_stack_qual.title}', Solar='{solar_qual.title}'")

        # 3. Create Additional Diverse Candidates
        candidates_meta = [
            {
                "email": "sunita.solar@rpl.gov.in",
                "full_name": "Sunita Devi",
                "role": "worker",
                "state": "Rajasthan",
                "phone": "9876543210",
                "aadhaar_last_four": "7812",
                "occupation": "Solar PV Rooftop Technician",
                "experience_years": 5.0,
                "workplace": "Jaipur Clean Energy Contractor",
                "education": "10th Standard",
                "tasks": [
                    "सोलर पैनल लगाना और रूफटॉप वायरिंग करना",
                    "डिजिटल मल्टीमीटर से ओपन सर्किट वोल्टेज मापना",
                    "एमसीबी डिस्ट्रीब्यूशन बॉक्स और ब्रेकर की फिटिंग करना",
                    "अर्थिंग और सर्ज प्रोटेक्शन लगाना"
                ],
                "tools": ["डिजिटल मल्टीमीटर", "वायर स्ट्रिपर", "क्लैंप मीटर", "ड्रिल मशीन", "इंसुलेटेड प्लायर"],
                "skills": ["सोलर पीवी इंस्टॉलेशन", "सर्किट वायरिंग", "विद्युत सुरक्षा व अर्थिंग", "डीसी वोल्टेज टेस्टिंग"],
                "informal": "5 years on-site apprenticeship installing domestic rooftop photovoltaic arrays across rural Rajasthan."
            },
            {
                "email": "arif.dev@rpl.gov.in",
                "full_name": "Mohd. Arif Khan",
                "role": "worker",
                "state": "Uttar Pradesh",
                "phone": "9823456781",
                "aadhaar_last_four": "9021",
                "occupation": "Backend Software Developer",
                "experience_years": 4.0,
                "workplace": "Freelance Web Consultant, Lucknow",
                "education": "Diploma in Computer Application",
                "tasks": [
                    "Develop REST API endpoints in Spring Boot and Java",
                    "Configure PostgreSQL relational database schemas and migrations",
                    "Deploy backend microservices to Linux servers via Docker",
                    "Implement JWT authentication and role-based security"
                ],
                "tools": ["VS Code", "Postman", "Docker", "Git", "MySQL Workbench"],
                "skills": ["Java", "Spring Boot", "PostgreSQL", "Docker", "RESTful APIs", "Git"],
                "informal": "Self-taught backend developer through open-source contributions and contracting for regional SME businesses."
            },
            {
                "email": "pooja.iot@rpl.gov.in",
                "full_name": "Pooja Sharma",
                "role": "worker",
                "state": "Maharashtra",
                "phone": "9765432109",
                "aadhaar_last_four": "6345",
                "occupation": "Frontend Web & UI Developer",
                "experience_years": 3.5,
                "workplace": "Pune Tech Hub Co-working",
                "education": "12th Standard Science",
                "tasks": [
                    "Develop responsive web UI with Angular and TypeScript",
                    "Integrate RESTful backend microservices via HTTP Client",
                    "Write automated end-to-end user journey tests",
                    "Optimize mobile responsive views and offline caching"
                ],
                "tools": ["VS Code", "Node.js", "Chrome DevTools", "Figma", "Git"],
                "skills": ["Angular", "TypeScript", "HTML5/CSS3", "Tailwind CSS", "REST Integration"],
                "informal": "Completed practical apprenticeship at regional software agency, maintaining responsive portals for 3+ years."
            },
            {
                "email": "vikram.singh@rpl.gov.in",
                "full_name": "Vikram Singh",
                "role": "worker",
                "state": "Punjab",
                "phone": "9812345678",
                "aadhaar_last_four": "1122",
                "occupation": "Junior Systems Developer",
                "experience_years": 2.0,
                "workplace": "Local Cyber Cafe & Tech Repairs, Ludhiana",
                "education": "12th Standard",
                "tasks": [
                    "Basic web page layout and HTML forms",
                    "Database backup and simple SQL queries",
                    "Assisting senior engineers with server cabling"
                ],
                "tools": ["VS Code", "MySQL", "Git"],
                "skills": ["HTML5", "Basic SQL", "Hardware Troubleshooting"],
                "informal": "Assisted local IT repair shop with simple client requests for 2 years."
            }
        ]

        created_users = {}
        for cdata in candidates_meta:
            u = User.query.filter_by(email=cdata["email"]).first()
            if not u:
                u = User(
                    email=cdata["email"],
                    full_name=cdata["full_name"],
                    role=cdata["role"],
                    state=cdata["state"],
                    phone=cdata["phone"],
                    aadhaar_last_four=cdata["aadhaar_last_four"]
                )
                u.set_password("Password123!")
                db.session.add(u)
                db.session.flush()
                print(f"Created demo user: {u.full_name} ({u.email})")

            # Update or create worker profile
            wp = WorkerProfile.query.filter_by(user_id=u.id).first()
            if not wp:
                wp = WorkerProfile(
                    user_id=u.id,
                    occupation_title=cdata["occupation"],
                    experience_years=cdata["experience_years"],
                    current_workplace=cdata["workplace"],
                    education_level=cdata["education"],
                    daily_tasks=json.dumps(cdata["tasks"]),
                    tools_used=json.dumps(cdata["tools"]),
                    skills_declared=json.dumps(cdata["skills"]),
                    informal_training_desc=cdata["informal"],
                    status="submitted"
                )
                db.session.add(wp)
            created_users[cdata["email"]] = u

        # Ensure Rajesh has a fully rich profile too
        rajesh_profile = WorkerProfile.query.filter_by(user_id=rajesh.id).first()
        if not rajesh_profile:
            rajesh_profile = WorkerProfile(
                user_id=rajesh.id,
                occupation_title="Full-Stack Web Developer",
                experience_years=4.5,
                current_workplace="Freelance Digital Studio",
                education_level="12th Grade",
                daily_tasks=json.dumps([
                    "Develop responsive web UI with Angular and TypeScript",
                    "Build REST APIs with Spring Boot and JPA",
                    "Write SQL queries in MySQL workbench and create tables",
                    "Containerize backend services using Docker"
                ]),
                tools_used=json.dumps(["VS Code", "MySQL Workbench", "Postman", "Git", "Docker", "JDK 17"]),
                skills_declared=json.dumps(["Angular", "Java", "Spring Boot", "MySQL", "REST APIs", "Docker", "HTML5/CSS3"]),
                informal_training_desc="4.5 years self-directed practical learning building full-stack applications for commercial clients.",
                status="submitted"
            )
            db.session.add(rajesh_profile)
        db.session.commit()

        # 4. Populate Pre-Attached AI Evidence on Rajesh Kumar's existing session
        rajesh_session = AssessmentSession.query.filter_by(worker_id=rajesh.id).first()
        if rajesh_session:
            # Add AI-inspected Docker evidence
            ev_exist = AssessmentEvidence.query.filter_by(session_id=rajesh_session.id).first()
            if not ev_exist:
                first_crit = PerformanceCriterion.query.filter_by(nos_id=rajesh_session.qualification.occupational_standards[0].id).first() if rajesh_session.qualification.occupational_standards else None
                crit_id = first_crit.id if first_crit else None

                ev1 = AssessmentEvidence(
                    session_id=rajesh_session.id,
                    criterion_id=crit_id,
                    uploaded_by_id=rajesh.id,
                    evidence_type="video",
                    title="Docker Swarm Container Deployment Recording",
                    external_url="https://storage.rpl.gov.in/evidence/rajesh_docker_deploy.mp4",
                    file_size_bytes=15420000,
                    sha256_hash=sha256_text("rajesh_docker_deploy_2026"),
                    ai_verification_status="VERIFIED",
                    ai_confidence_score=0.96,
                    ai_analysis_tags=json.dumps(["Docker Engine 24.0", "Container Healthcheck PASS", "HTTP 200 OK", "Zero Downtime Deploy"]),
                    ai_summary="AI Computer Vision Inspector verified terminal screencast: Docker service started, microservices listening on port 8080, health probe returned HTTP 200 OK without errors.",
                    ai_suggested_rubric=4
                )
                db.session.add(ev1)

                ev2 = AssessmentEvidence(
                    session_id=rajesh_session.id,
                    criterion_id=crit_id,
                    uploaded_by_id=rajesh.id,
                    evidence_type="code_repo",
                    title="Production REST API Service Repository",
                    external_url="https://github.com/rpl-candidate-rajesh/spring-boot-portal",
                    file_size_bytes=2480000,
                    sha256_hash=sha256_text("rajesh_github_repo_2026"),
                    ai_verification_status="VERIFIED",
                    ai_confidence_score=0.94,
                    ai_analysis_tags=json.dumps(["Spring Boot 3", "JPA Hibernate", "PostgreSQL", "89% Unit Test Coverage"]),
                    ai_summary="Repository analysis detected clean layered architecture (Controller, Service, Repository), secure password encryption, and automated JUnit test execution passing.",
                    ai_suggested_rubric=4
                )
                db.session.add(ev2)
                db.session.commit()
                print("Attached AI Evidence to Rajesh Kumar's session.")

        # 5. Create Sessions for Additional Candidates
        # A. Sunita Devi -> CERTIFIED (Solar PV)
        sunita = created_users.get("sunita.solar@rpl.gov.in")
        if sunita:
            sess_sunita = AssessmentSession.query.filter_by(worker_id=sunita.id).first()
            if not sess_sunita:
                now_utc = datetime.now(timezone.utc)
                sess_sunita = AssessmentSession(
                    worker_id=sunita.id,
                    assessor_id=assessor.id,
                    qualification_id=solar_qual.id,
                    session_date="2026-10-12",
                    location="MSME Technology Assessment Centre, Jaipur",
                    status="finalized",
                    theory_score_obtained=38.0,
                    theory_score_max=40.0,
                    theory_percentage=95.0,
                    practical_score_obtained=56.0,
                    practical_score_max=60.0,
                    practical_percentage=93.3,
                    overall_percentage=94.0,
                    missing_evidence_count=0,
                    incomplete_criteria_count=0,
                    provisional_recommendation="RECOMMENDED_CERTIFIED",
                    assessor_final_decision="CERTIFIED",
                    assessor_remarks="Candidate demonstrated mastery in rooftop PV array installation, DC safety disconnect, and multimeter open-circuit voltage verification.",
                    assessor_signature_hash=sha256_text(f"CERTIFICATE-SUNITA-DEVI-{solar_qual.id}-2026"),
                    signed_off_at=now_utc - timedelta(days=2)
                )
                db.session.add(sess_sunita)
                db.session.flush()

                # Add evidence with multimeter telemetry
                solar_crit = PerformanceCriterion.query.filter_by(nos_id=solar_qual.occupational_standards[0].id).first() if solar_qual.occupational_standards else None
                s_crit_id = solar_crit.id if solar_crit else None

                ev_sunita = AssessmentEvidence(
                    session_id=sess_sunita.id,
                    criterion_id=s_crit_id,
                    uploaded_by_id=sunita.id,
                    evidence_type="video",
                    title="Solar Rooftop Array Voltage & Earthing Test",
                    external_url="https://storage.rpl.gov.in/evidence/sunita_solar_test.mp4",
                    file_size_bytes=18200000,
                    sha256_hash=sha256_text("sunita_solar_multimeter_2026"),
                    ai_verification_status="VERIFIED",
                    ai_confidence_score=0.97,
                    ai_analysis_tags=json.dumps(["48.2V DC Open Circuit", "Insulated Safety Gloves", "Multimeter Calibrated", "Zero Ground Leakage"]),
                    ai_summary="Computer vision verified technician probe contact on solar combiner box: LCD display reads 48.2V DC steady; candidate wearing certified PPE.",
                    ai_suggested_rubric=4
                )
                db.session.add(ev_sunita)
                assign_criteria_scores(sess_sunita, solar_qual, lambda pc: 4)
                print("Created finalized certified session for Sunita Devi (Solar PV).")

        # B. Mohd. Arif Khan -> CERTIFIED (Backend Full-Stack)
        arif = created_users.get("arif.dev@rpl.gov.in")
        if arif:
            sess_arif = AssessmentSession.query.filter_by(worker_id=arif.id).first()
            if not sess_arif:
                now_utc = datetime.now(timezone.utc)
                sess_arif = AssessmentSession(
                    worker_id=arif.id,
                    assessor_id=assessor.id,
                    qualification_id=full_stack_qual.id,
                    session_date="2026-10-13",
                    location="Skill India Digital Assessment Centre, Lucknow",
                    status="finalized",
                    assessor_final_decision="CERTIFIED",
                    assessor_remarks="High degree of competence in asynchronous REST processing and database index optimization. All test suites verified.",
                    assessor_signature_hash=sha256_text(f"CERTIFICATE-MOHD-ARIF-{full_stack_qual.id}-2026"),
                    signed_off_at=now_utc - timedelta(days=1)
                )
                db.session.add(sess_arif)
                db.session.flush()

                ev_arif = AssessmentEvidence(
                    session_id=sess_arif.id,
                    criterion_id=None,
                    uploaded_by_id=arif.id,
                    evidence_type="code_repo",
                    title="Spring Boot Microservice REST API Architecture",
                    external_url="https://gitlab.com/arif-dev/enterprise-microservices",
                    file_size_bytes=3200000,
                    sha256_hash=sha256_text("arif_gitlab_repo_2026"),
                    ai_verification_status="VERIFIED",
                    ai_confidence_score=0.95,
                    ai_analysis_tags=json.dumps(["Spring Data JPA", "PostgreSQL", "Docker Compose", "Flyway DB Migrations"]),
                    ai_summary="Code repository inspected: Schema versioning via Flyway confirmed, transactional service layers properly implemented with 93% test pass rate.",
                    ai_suggested_rubric=4
                )
                db.session.add(ev_arif)
                assign_criteria_scores(sess_arif, full_stack_qual, lambda pc: 4 if pc.sequence_order % 2 == 0 else 3)
                print("Created finalized certified session for Mohd. Arif Khan.")

        # C. Pooja Sharma -> IN PROGRESS (Frontend Full-Stack)
        pooja = created_users.get("pooja.iot@rpl.gov.in")
        if pooja:
            sess_pooja = AssessmentSession.query.filter_by(worker_id=pooja.id).first()
            if not sess_pooja:
                sess_pooja = AssessmentSession(
                    worker_id=pooja.id,
                    assessor_id=assessor.id,
                    qualification_id=full_stack_qual.id,
                    session_date="2026-10-14",
                    location="Digital Skills Centre, Pune",
                    status="in_progress"
                )
                db.session.add(sess_pooja)
                db.session.flush()

                ev_pooja = AssessmentEvidence(
                    session_id=sess_pooja.id,
                    criterion_id=None,
                    uploaded_by_id=pooja.id,
                    evidence_type="video",
                    title="Angular Single Page App Responsive Layout & State Demo",
                    external_url="https://storage.rpl.gov.in/evidence/pooja_angular_ui.mp4",
                    file_size_bytes=12400000,
                    sha256_hash=sha256_text("pooja_angular_ui_2026"),
                    ai_verification_status="VERIFIED",
                    ai_confidence_score=0.93,
                    ai_analysis_tags=json.dumps(["Angular 17", "Signals State Management", "Tailwind CSS", "Lighthouse Score 98"]),
                    ai_summary="UI screencast inspected: Responsive flexbox/grid layout confirmed on mobile and desktop viewports, zero console errors, Lighthouse accessibility score 98/100.",
                    ai_suggested_rubric=4
                )
                db.session.add(ev_pooja)
                assign_criteria_scores(sess_pooja, full_stack_qual, lambda pc: 0 if pc.sequence_order > 70 else (4 if pc.sequence_order % 2 == 0 else 3))
                print("Created in-progress session for Pooja Sharma.")

        # D. Vikram Singh -> NOT YET COMPETENT / BRIDGE COURSE GAP
        vikram = created_users.get("vikram.singh@rpl.gov.in")
        if vikram:
            sess_vikram = AssessmentSession.query.filter_by(worker_id=vikram.id).first()
            if not sess_vikram:
                now_utc = datetime.now(timezone.utc)
                sess_vikram = AssessmentSession(
                    worker_id=vikram.id,
                    assessor_id=assessor.id,
                    qualification_id=full_stack_qual.id,
                    session_date="2026-10-11",
                    location="Regional IT Assessment Centre, Ludhiana",
                    status="finalized",
                    assessor_final_decision="NOT_YET_COMPETENT",
                    assessor_remarks="Candidate passed Theory threshold (60.0%) but Practical marks (51.6%) are below NCVET 60.0% standard. Gap identified in NOS 3: Backend Security & Microservice Deployment. Prescribed 40-hour NCVET RPL Bridge Course.",
                    assessor_signature_hash=sha256_text(f"GAP-ASSESSMENT-VIKRAM-SINGH-{full_stack_qual.id}-2026"),
                    signed_off_at=now_utc - timedelta(days=3)
                )
                db.session.add(sess_vikram)
                assign_criteria_scores(sess_vikram, full_stack_qual, lambda pc: 3 if pc.criterion_type == 'theory' else (2 if pc.sequence_order % 2 == 0 else 1))
                print("Created gap-prescription session for Vikram Singh (demonstrating NCVET Bridge Course).")

        # 6. Add Audit Ledger Entries
        db.session.commit()
        audit_entries = [
            ("SESSION_CREATED", "AssessmentSession", rajesh_session.id if rajesh_session else "sess-1", {"worker": "Rajesh Kumar", "qualification": full_stack_qual.title}),
            ("EVIDENCE_VERIFIED", "AssessmentEvidence", "ev-dock-1", {"title": "Docker Swarm Container Deployment Recording", "confidence": 0.96, "status": "VERIFIED"}),
            ("DECISION_SIGNED_OFF", "AssessmentSession", "sess-sunita", {"worker": "Sunita Devi", "decision": "CERTIFIED", "signature": sha256_text("sunita-cert")}),
            ("CERTIFICATE_ISSUED", "CertificateRecord", "cert-sunita", {"worker": "Sunita Devi", "qualification": solar_qual.title, "nsqf_level": solar_qual.nsqf_level}),
            ("DECISION_SIGNED_OFF", "AssessmentSession", "sess-arif", {"worker": "Mohd. Arif Khan", "decision": "CERTIFIED", "signature": sha256_text("arif-cert")}),
            ("COMPETENCY_GAP_DETECTED", "AssessmentSession", "sess-vikram", {"worker": "Vikram Singh", "decision": "NOT_YET_COMPETENT", "bridge_course": "40-Hour Microservices Security"}),
            ("AUDIT_DOSSIER_ACCESSED", "AuditLedger", "dossier-01", {"action": "Exported NCVET Audit Dossier (JSON)", "actor": "National RPL Administrator"}),
        ]

        now = datetime.now(timezone.utc)
        for i, (action, etype, eid, details) in enumerate(audit_entries):
            log = AuditLog(
                user_id=assessor.id if "DECISION" in action or "EVIDENCE" in action else admin.id,
                action=action,
                entity_type=etype,
                entity_id=eid,
                details=json.dumps(details),
                created_at=now - timedelta(hours=(10 - i))
            )
            db.session.add(log)
        db.session.commit()

        print("--- Synthetic Walkthrough Data Seeding Completed Successfully! ---")
        print(f"Total Users: {User.query.count()}")
        print(f"Total Worker Profiles: {WorkerProfile.query.count()}")
        print(f"Total Assessment Sessions: {AssessmentSession.query.count()}")
        print(f"Total Assessment Evidence Records: {AssessmentEvidence.query.count()}")
        print(f"Total Audit Ledger Logs: {AuditLog.query.count()}")

if __name__ == "__main__":
    seed_data()
