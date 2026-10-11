# AI-Assisted RPL Assessment Platform

**Smart Skill Assessment for Recognition of Prior Learning (RPL)**

An AI-assisted platform developed for **Smart India Hackathon (SIH) 2026 — Problem Statement SIH26242**, focused on helping workers gain recognition for skills acquired through informal work experience.

## Overview

Millions of workers acquire practical skills through on-the-job experience, apprenticeships, and informal learning. However, documenting those skills and matching them to formal qualifications can be difficult.

Traditional practical assessments may also be time-consuming and vary between assessors.

This project aims to support the Recognition of Prior Learning (RPL) process through an accessible digital platform that connects worker experience with relevant qualification requirements, provides structured practical assessment workflows, and generates evidence-based competency reports.

The platform is designed to assist authorized human assessors rather than replace their professional judgment.

## Problem Statement

**SIH Problem Statement ID:** SIH26242  
**Title:** AI-Assisted Skill Assessment Tool for Recognition of Prior Learning (RPL)  
**Organization:** Ministry of Skill Development and Entrepreneurship (MSDE)  
**Category:** Software

The challenge is to improve the accessibility, consistency, and scalability of RPL assessment for workers whose skills were acquired outside formal training environments.

## Proposed Solution

The proposed platform includes the following modules:

- **Worker Skill Passport:** Workers document their occupations, experience, practical tasks, tools, and acquired skills.
- **AI-Assisted Qualification Matching:** The system compares worker descriptions against stored qualification requirements and suggests relevant NSQF-aligned qualifications.
- **Guided Practical Assessment:** Assessors use structured checklists and qualification-specific assessment criteria.
- **Evidence Management:** Assessors can review permitted supporting documents, images, and other evidence.
- **Standardized Scoring:** A configurable scoring engine applies defined assessment rubrics and identifies missing evidence.
- **Competency Gap Analysis:** The system highlights demonstrated competencies, gaps, and criteria requiring further evaluation.
- **Competency Reports:** The platform generates assessment summaries and provisional recommendations for assessor review.
- **Offline-First Access:** The planned PWA supports local drafts and synchronization when connectivity returns.
- **Audit Trail:** Important assessment actions and final assessor decisions are recorded for traceability.

## Key Features

1. Worker self-declaration and experience documentation.
2. Qualification matching with explanations and source references.
3. Qualification-specific practical assessment checklists.
4. Criterion-wise scoring and evidence tracking.
5. Assessor dashboard and assessment history.
6. Competency profiles and report generation.
7. Role-based access for workers, assessors, and administrators.
8. Offline data capture and synchronization.
9. Configurable qualification data and scoring rubrics.
10. Testing tools for qualification matching and assessor consistency.

Feature availability will depend on the current implementation. Planned features will be marked accordingly in project documentation.

## Technology Stack

The proposed technology stack is:

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI styling | Tailwind CSS or an accessible component library |
| Backend | Python, Flask, REST APIs |
| Database | SQLite for development; PostgreSQL where required |
| AI/NLP | Sentence Transformers, optional LLM integration |
| Semantic search | Embeddings and optional FAISS |
| Offline storage | IndexedDB and service workers |
| Testing | pytest, Vitest, React Testing Library |
| Version control | Git and GitHub |

## System Workflow

1. A worker registers and completes a skill declaration.
2. The system extracts relevant skills and retrieves candidate qualifications.
3. The worker or assessor reviews the suggested qualification matches.
4. An assessment session is created using verified qualification criteria.
5. The assessor records observations, scores, and supporting evidence.
6. The scoring engine calculates results using a configured rubric.
7. The platform highlights missing evidence and competency gaps.
8. A competency report and provisional recommendation are generated.
9. An authorized assessor reviews the evidence and records the final decision.

## Data Sources

The project intends to use official qualification information and relevant assessment criteria from authoritative sources.

- National Qualification Register: https://www.nqr.gov.in/qualifications-search
- NCVET: https://ncvet.gov.in/
- National Skills Qualification Framework information: https://ncvet.gov.in/

Qualification records should retain their source, identifier, version information, and applicable assessment criteria.

Any synthetic demonstration data must be clearly identified as synthetic. It must not be presented as official worker records or real-world validation data.

## AI and Assessment Integrity

AI is used to assist with skill extraction, qualification retrieval, match explanations, and evidence summaries where appropriate.

Assessment scores should be calculated using transparent, configured rubrics rather than arbitrary language-model outputs.

The system must distinguish between:
- Self-declared skills
- Assessor-observed competencies
- Missing or insufficient evidence
- System-generated provisional recommendations
- Final human assessor decisions

The platform does not independently issue government-recognized certifications.

## Privacy and Security

The project aims to implement:
- Secure authentication and role-based authorization
- Protection of worker profiles and assessment evidence
- Server-side input validation
- Safe file-upload handling
- Audit logs for important assessment actions
- Secure environment-variable management
- Data minimization for offline use

## Project Status

**Development status:** In development.

The project is being developed as a student prototype for SIH 2026. Features, evaluation results, deployment details, and supported trades will be updated as implementation progresses.

## Getting Started

Setup instructions will be maintained here as the implementation stabilizes.

The intended development environment includes Python, Node.js, Git, and Google Antigravity or another compatible code editor.

Once the application structure is finalized, this section will include:
- Installation instructions
- Environment configuration
- Backend setup
- Frontend setup
- Database initialization
- Test execution
- Local development commands

## Testing and Evaluation

The project aims to evaluate:
- Qualification matching performance against manually reviewed examples
- Correctness of rubric-based score calculations
- Missing-evidence detection
- Agreement between independent assessor scores
- Offline persistence and synchronization reliability
- Authentication and authorization behavior

Performance figures will be reported only after the corresponding tests have been conducted.

## Limitations

- Qualification matching depends on the completeness and quality of available qualification data.
- AI-generated explanations may require human review.
- Automated image or video assessment is optional and may not be reliable for every practical task.
- Offline synchronization requires conflict handling and careful protection of sensitive data.
- Real-world effectiveness must be evaluated with suitable qualification data and knowledgeable assessors.

## Future Enhancements

- Support for additional trades and qualifications
- Regional-language and voice-assisted self-declaration
- Improved semantic qualification retrieval
- More robust offline synchronization
- Evidence review enhancements
- Integration with authorized assessment workflows, subject to access and approval
- Evaluation with vocational experts and real assessment scenarios

## Contributing

Contributions are welcome.

1. Create a branch for your feature or fix.
2. Follow the existing code style and project architecture.
3. Add tests for new functionality.
4. Document configuration changes.
5. Submit a pull request describing the changes.

Do not submit private worker information, assessment evidence, API keys, or credentials.

## License

The project's license will be specified after the team confirms the applicable SIH requirements, ownership, and third-party data and software licenses.

## Acknowledgements

Developed as a student project for Smart India Hackathon 2026, addressing SIH26242 — AI-Assisted Skill Assessment Tool for Recognition of Prior Learning (RPL).
