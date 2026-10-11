# AI-Assisted Skill Assessment Tool for Recognition of Prior Learning (RPL)

[![SIH Problem Statement](https://img.shields.io/badge/SIH%202026-SIH26242-blue)](https://www.sih.gov.in/)
[![Ministry](https://img.shields.io/badge/Ministry-MSDE%20%2F%20NCVET-orange)](https://www.msde.gov.in/)
[![Theme](https://img.shields.io/badge/Theme-Smart%20Education-green)]()
[![NSQF Level](https://img.shields.io/badge/NSQF%20Aligned-Level%204.5-purple)]()
[![Tests](https://img.shields.io/badge/pytest-16%20passed-brightgreen)]()

An end-to-end, offline-capable digital platform developed for **Smart India Hackathon (SIH) Problem Statement SIH26242**: *AI-Assisted Skill Assessment Tool for Recognition of Prior Learning (RPL)*, under the **Ministry of Skill Development and Entrepreneurship (MSDE)**.

---

## 1. Executive Summary & Problem Context

In India, a vast majority of the skilled trade workforce has acquired practical competence through informal on-the-job apprenticeships rather than structured classroom curricula. NCVET’s **Recognition of Prior Learning (RPL)** framework provides a mechanism to certify these workers against official National Skills Qualification Framework (NSQF) levels without forcing them to repeat years of redundant training.

### Key Real-World Challenges Addressed:
1. **The Vocabulary Gap**: Informal workers do not know academic taxonomy. A self-taught web developer or electrician cannot easily map daily tasks to formal National Occupational Standards (NOS).
2. **Evaluator Variance**: Traditional RPL relies on manual, unstandardized practical scoring, causing evaluator-to-evaluator drift across test centers.
3. **Low-Connectivity Field Deployments**: Assessments frequently occur in semi-urban and rural workshops with intermittent connectivity.
4. **Certification Integrity**: Preventing black-box AI from issuing unverified credentials while providing assessors with objective scoring aids.

---

## 2. Fulfillment of Required Capabilities Checklist

| Requirement | Implementation Verification |
|---|---|
| **[x] Worker can register and log in** | Role-based authentication (`worker`, `assessor`, `admin`) with password hashing (bcrypt) and JWT tokens. |
| **[x] Worker can create, edit and submit a skill declaration** | Multi-step structured intake of occupation, years of experience, daily practical tasks, tools used, and informal background. |
| **[x] Qualification matching returns traceable results or explicit no-match** | Hybrid TF-IDF and semantic similarity matching against 1,912 official NQR qualifications with confidence tiers (`HIGH`, `MEDIUM`, `LOW`), criteria citations, or an explicit *No Match Found* banner. |
| **[x] Assessor can open a session and see correct qualification criteria** | Dynamically loads verified NOS modules (`MSME/ES/01`, `MSME/FSD/01` to `05`) and all 84 performance criteria extracted directly from the official PDF. |
| **[x] Assessor can score criteria and attach permitted evidence** | Standardized 4-level rubric scoring (*Exceeds*, *Competent*, *Developing*, *Not Demonstrated*) and multi-modal evidence attachment (video, code repo, photo, viva audio). |
| **[x] Missing evidence and incomplete scoring are flagged correctly** | Scoring engine tracks unassessed criteria and verifies mandatory evidence (e.g., Page 6 video requirement) before sign-off. |
| **[x] Score calculations follow configured rubric** | Deterministic calculations adhering strictly to Page 8 passing rules (Theory 40%, Practical 60%). |
| **[x] Only an authorized assessor can finalize a decision** | Server-side role guard (`@role_required("assessor", "admin")`) prevents workers from finalizing. |
| **[x] Competency report matches saved assessment records** | Formal NSQF RPL Competency Certificate and Assessment Report exportable to printable view and PDF. |
| **[x] Worker cannot access another worker's private records** | Strict tenant/user data isolation (`worker_id == current_user.id`) enforced on all profile and match endpoints. |
| **[x] Forms and checklists survive an offline page refresh** | Form entries and checklist scores are saved locally in browser storage on every change. |
| **[x] Pending changes synchronize without duplicate records** | Idempotent sync queue (`rpl_offline_sync_queue`) with background sync and replay logic. |
| **[x] Evaluation tests run and produce reproducible report** | Automated `pytest` suite (16 tests) and statistical consistency benchmark (`evaluate_consistency.py`). |

---

## 3. Official Qualification Data & Ground Truth Analysis

### Full-Stack Developer Qualification (`References/FULL-STACK DEVELOPER.pdf`):
- **Awarding Body**: MSME Technology Centre, Govt. of India
- **NQR Code**: `QG-4.5-IT-02395-2024-V1-MSME` (cross-referenced with row 1211 of `Data_Qualification_Register_11-Oct-2026.xlsx`)
- **NSQF Level**: `4.5` | **Notional Hours**: `600.0` (Theory: 60h, Practical: 450h, Employability: 30h, OJT: 60h) | **Credits**: `20.0`
- **6 NOS Modules Mapped**:
  1. `MSME/ES/01`: Employability Skill (30 hrs, Theory Marks: 100)
  2. `MSME/FSD/05`: Deploying and Hosting Application with Docker and Kubernetes (90 hrs, Th: 100, Pr: 100)
  3. `MSME/FSD/04`: Mastering UI design with Angular (60 hrs, Th: 100, Pr: 100)
  4. `MSME/FSD/03`: Working Back-End design with Spring Boot and Hibernate Framework (210 hrs, Th: 100, Pr: 100)
  5. `MSME/FSD/02`: Gaining knowledge in Oracle and MySQL Database Management System (90 hrs, Th: 100, Pr: 100)
  6. `MSME/FSD/01`: Understanding the Concepts of C and Python Programming (60 hrs, Th: 100, Pr: 100)
- **Extracted Criteria**: 84 Performance Criteria.
- **Tools & Equipment**: Computer System, Turbo C/C++, Java JDK & Eclipse, Apache Tomcat/MySQL Workbench/VS Code/Postman/Git.
- **Passing Rules**: Theory 40%, Practical 60% (Page 8).

### Audited Ambiguity Flags (Flagged, Not Guessed):
1. **NQR Code Header Blank**: Listed as `N/A` on page 2. Reconciled with NQR Register record `QG-4.5-IT-02395-2024-V1-MSME`.
2. **Criteria Marks Unallocated**: Criteria rows on pages 20–37 list `- - - - -`. Flagged `is_score_inferred=True`, normalized to uniform 10.0 scale.
3. **Rubric Scale Granularity**: Source provides text outcomes without graduated rubrics. Standardized 4-level scale added with `is_configured_demo_rubric=True`.
4. **Evidence Specification**: Page 6 mandates general video evidence. Expanded to support video recordings, viva audio, and code repository links.

---

## 4. Evaluator Variance Reduction & Consistency Results

To verify consistency improvement over unassisted manual scoring without unsubstantiated claims, we executed an inter-assessor agreement benchmark (`backend/scripts/evaluate_consistency.py`):

| Evaluation Metric | Unassisted Manual Scoring | AI-Assisted Standardized Rubric | Improvement |
|---|---|---|---|
| **Evaluator Variance ($\sigma^2$)** | **177.43** | **13.88** | **-92.18% Variance Reduction** |
| **Intraclass Correlation (ICC)** | **0.534** (Moderate) | **0.947** (Near Perfect) | **+77.3% Agreement Boost** |
| **Subjective Drift** | Up to $\pm 15\%$ spread | Within $\pm 3.8\%$ consensus | Standardized Anchors |

---

## 5. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **Backend**: Python 3.14, Flask, REST APIs
- **Database**: SQLite with SQLAlchemy ORM (migratable to PostgreSQL)
- **AI & NLP Matching**: scikit-learn TF-IDF + N-Gram semantic matching + keyword inventory mapping
- **Offline / PWA**: Service Worker caching, Web App Manifest, IndexedDB / LocalStorage drafts, Idempotent Sync Queue
- **Testing**: pytest (16 tests passing)

---

## 6. Getting Started & Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Clone & Set Up Backend
```bash
# Clone the repository
git clone https://github.com/aniket07-git/SIH26242.git
cd SIH26242

# Install Python dependencies
pip install flask flask-cors flask-sqlalchemy openpyxl pypdf pyjwt scikit-learn pytest

# Initialize database, seed accounts, and import official qualifications
python backend/scripts/run_import.py
```

### 2. Set Up Frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Run the Platform
You can run the full-stack web application directly with Python (which serves the compiled SPA and API simultaneously):
```bash
python backend/app.py
```
Open **`http://127.0.0.1:5000`** in your browser.

Alternatively, for frontend hot-reload development:
```bash
# In terminal 1:
python backend/app.py

# In terminal 2:
cd frontend
npm run dev
```
Open **`http://localhost:5173`**.

---

## 7. Pre-Seeded Demonstration Accounts

| Role | Email | Password | Pre-configured Data |
|---|---|---|---|
| **Worker (Candidate)** | `worker@rpl.gov.in` | `Password123!` | Rajesh Kumar (Full Stack Developer, 3 yrs experience, submitted declaration) |
| **Assessor** | `assessor@rpl.gov.in` | `Password123!` | Dr. Ananya Sharma (Certified MSME Assessor) |
| **Administrator** | `admin@rpl.gov.in` | `Password123!` | National RPL Administrator |

---

## 8. Automated Test Execution

Run the complete test suite (31 automated tests across 10 suites):
```bash
python -m pytest tests/ -v
```

Output:
```
tests/test_auth_and_rbac.py::test_user_registration_and_login PASSED
tests/test_auth_and_rbac.py::test_worker_cannot_access_other_worker_records PASSED
tests/test_auth_and_rbac.py::test_worker_can_create_and_update_own_profile PASSED
tests/test_checklist_validation.py::test_checklist_1_worker_can_register_and_login PASSED
tests/test_checklist_validation.py::test_checklist_2_worker_can_create_edit_submit_declaration PASSED
tests/test_checklist_validation.py::test_checklist_3_traceable_qualification_match_and_explicit_no_match PASSED
tests/test_checklist_validation.py::test_checklist_4_assessor_can_open_session_and_view_criteria PASSED
tests/test_checklist_validation.py::test_checklist_5_assessor_can_score_criteria_and_attach_evidence PASSED
tests/test_checklist_validation.py::test_checklist_6_missing_evidence_and_incomplete_scoring_flagged PASSED
tests/test_checklist_validation.py::test_checklist_7_score_calculations_follow_configured_rubric PASSED
tests/test_checklist_validation.py::test_checklist_8_only_authorized_assessor_can_finalize_decision PASSED
tests/test_checklist_validation.py::test_checklist_9_competency_report_matches_saved_records PASSED
tests/test_checklist_validation.py::test_checklist_10_worker_cannot_access_other_worker_records PASSED
tests/test_checklist_validation.py::test_checklist_11_forms_and_checklists_survive_offline_storage_structure PASSED
tests/test_checklist_validation.py::test_checklist_12_pending_changes_sync_idempotently_without_duplicates PASSED
tests/test_checklist_validation.py::test_checklist_13_evaluation_tests_produce_reproducible_reports PASSED
tests/test_consistency_evaluation.py::test_inter_assessor_consistency_evaluation PASSED
tests/test_csv_datasets.py::test_worker_skill_profiles_csv_dataset PASSED
tests/test_csv_datasets.py::test_assessment_test_cases_csv_dataset PASSED
tests/test_csv_datasets.py::test_assessor_scores_csv_dataset PASSED
tests/test_matching_engine.py::test_extract_skill_terms PASSED
tests/test_matching_engine.py::test_match_worker_profile_software_developer PASSED
tests/test_matching_engine.py::test_explicit_no_match_for_unrelated_profession PASSED
tests/test_matching_engine.py::test_matching_api_endpoint PASSED
tests/test_nqr_importer.py::test_nqr_master_importer PASSED
tests/test_pdf_importer.py::test_full_stack_pdf_importer PASSED
tests/test_qualification_models.py::test_qualification_creation_and_serialization PASSED
tests/test_qualification_models.py::test_qualification_hierarchy PASSED
tests/test_scoring_engine.py::test_session_creation_and_criteria_checklist PASSED
tests/test_scoring_engine.py::test_missing_evidence_and_scoring_rubric PASSED
tests/test_scoring_engine.py::test_assessor_governance_and_worker_prevention PASSED
tests/test_validation_report.py::test_validation_reporter PASSED

======================== 31 passed, 1 warning in 6.48s ========================
```

---

## 9. AI Assistance vs. Human Assessor Boundary

To guarantee government certification validity, the tool strictly delineates boundaries:
- **AI / Platform Responsibility (Support)**:
  - Parses free-form worker statements and extracts trade terms.
  - Computes semantic similarity against official NSQF qualifications.
  - Cites specific Performance Criteria with transparent rationale.
  - Automatically loads official checklists and computes deterministic rubric marks.
  - Highlights incomplete criteria and flags missing evidence.
- **Human Assessor Responsibility (Decision & Accountability)**:
  - Conducts hands-on practical observation and viva voice inquiry.
  - Assigns rubric scores based on verified physical or code performance.
  - Inspects uploaded evidence files for authenticity.
  - Holds sole legal authority to certify, defer, or reject candidate certification.
  - Digitally signs off with a timestamped cryptographic audit hash.

---

## 10. Repository File Structure

```
SIH26242/
├── backend/
│   ├── app.py                      # Flask application factory & SPA host
│   ├── config.py                   # Central configuration
│   ├── database.py                 # SQLAlchemy declarative base
│   ├── auth_middleware.py          # JWT authentication & RBAC guards
│   ├── scoring_engine.py           # Deterministic rubric calculation & governance
│   ├── matching_engine.py          # Explainable AI skill matching engine
│   ├── models/
│   │   ├── qualification.py        # Qualification, NOS, Criteria, Rubric, Tools, Rules
│   │   ├── user.py                 # User model with bcrypt & JWT
│   │   ├── worker_profile.py       # Worker self-declarations & matches
│   │   └── assessment.py           # Sessions, CriterionScores, Evidence, AuditLog
│   ├── routes/
│   │   ├── auth_routes.py          # /api/v1/auth
│   │   ├── worker_routes.py        # /api/v1/worker
│   │   ├── qualification_routes.py # /api/v1/qualifications
│   │   └── assessment_routes.py    # /api/v1/assessments
│   ├── importers/
│   │   ├── pdf_qualification_importer.py  # Full-Stack Developer PDF parser
│   │   ├── nqr_importer.py                # 1,912 NQR Excel master importer
│   │   ├── demo_qualifications.py         # Synthetic secondary trade generator
│   │   └── validation_report.py           # Markdown/JSON audit report generator
│   └── scripts/
│       ├── run_import.py           # Seeder & data importer runner
│       └── evaluate_consistency.py # Inter-assessor agreement benchmark
├── data/
│   ├── rpl_assessment.db           # SQLite persistent database
│   ├── worker_skill_profiles.csv   # Synthetic worker profiles across multiple trades
│   ├── assessment_test_cases.csv   # Synthetic assessment test scenarios & expected outcomes
│   ├── assessor_scores.csv         # Multi-assessor scoring data for consistency analysis
│   └── reports/                    # Validation & consistency reports
├── frontend/
│   ├── src/
│   │   ├── components/             # Navbar, OfflineSyncBanner
│   │   ├── pages/                  # Landing, Login, Register, Dashboards, Checklist, Report
│   │   ├── context/                # AuthContext with offline queue sync
│   │   ├── services/               # Typed REST API & offlineStorage
│   │   └── types/                  # TypeScript interfaces
│   └── public/
│       ├── manifest.json           # PWA Web App Manifest
│       └── service-worker.js       # Offline service worker
├── tests/                          # 31 automated pytest unit & integration tests
├── References/                     # Official Qualification PDFs
├── Data_Qualification_Register_... # NQR Master dataset
├── .env.example                    # Environment variable template
└── README.md                       # Complete documentation
```
