import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List
from backend.database import db
from backend.models.qualification import (
    Qualification,
    NationalOccupationalStandard,
    PerformanceCriterion,
    AmbiguityFlag,
    ToolAndEquipment,
    PassingRule
)

class QualificationValidationReporter:
    """
    Generates structured JSON and Markdown audit validation reports
    flagging missing fields, unallocated marks, and ambiguity resolutions.
    """

    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_report(self) -> Dict[str, Any]:
        qualifications = Qualification.query.all()
        now_utc = datetime.now(timezone.utc)
        
        report_data = {
            "report_id": f"VAL-RPT-{now_utc.strftime('%Y%m%d-%H%M%S')}",
            "generated_at": now_utc.isoformat(),
            "summary": {
                "total_qualifications": len(qualifications),
                "verified_official_qualifications": sum(1 for q in qualifications if q.is_verified and not q.is_synthetic),
                "synthetic_demo_qualifications": sum(1 for q in qualifications if q.is_synthetic),
                "qualifications_with_detailed_nos": sum(1 for q in qualifications if len(q.occupational_standards) > 0),
                "total_nos_modules": NationalOccupationalStandard.query.count(),
                "total_performance_criteria": PerformanceCriterion.query.count(),
                "total_tools_and_equipment": ToolAndEquipment.query.count(),
                "total_ambiguity_flags": AmbiguityFlag.query.count()
            },
            "qualification_audits": []
        }

        for q in qualifications:
            q_audit = {
                "id": q.id,
                "nqr_code": q.nqr_code,
                "title": q.title,
                "trade": q.trade,
                "sector": q.sector,
                "nsqf_level": q.nsqf_level,
                "source_type": q.source_type,
                "is_synthetic": q.is_synthetic,
                "is_verified": q.is_verified,
                "notional_hours": {
                    "total": q.notional_hours_total,
                    "theory": q.theory_hours,
                    "practical": q.practical_hours,
                    "employability": q.employability_hours,
                    "ojt": q.ojt_hours
                },
                "credits": q.credits,
                "nos_count": len(q.occupational_standards),
                "criteria_count": sum(len(nos.performance_criteria) for nos in q.occupational_standards),
                "tools_count": len(q.tools_and_equipment),
                "passing_rules": [r.to_dict() for r in q.passing_rules],
                "ambiguities": [flag.to_dict() for flag in q.ambiguity_flags],
                "integrity_checks": {
                    "has_nos": len(q.occupational_standards) > 0 or q.source_type == "NQR_MASTER_REGISTER",
                    "has_passing_rules": len(q.passing_rules) > 0 or q.source_type == "NQR_MASTER_REGISTER",
                    "all_criteria_have_rubrics": all(
                        len(pc.tasks_rubrics) > 0 
                        for nos in q.occupational_standards 
                        for pc in nos.performance_criteria
                    ),
                    "all_criteria_have_evidence_reqs": all(
                        len(pc.evidence_requirements) > 0 
                        for nos in q.occupational_standards 
                        for pc in nos.performance_criteria
                    )
                }
            }
            report_data["qualification_audits"].append(q_audit)

        # Write JSON file
        json_path = self.output_dir / "qualification_validation_report.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)

        # Write Markdown file
        md_path = self.output_dir / "qualification_validation_report.md"
        self._write_markdown_report(report_data, md_path)

        return report_data

    def _write_markdown_report(self, data: Dict[str, Any], file_path: Path):
        lines = [
            f"# Qualification Data Validation & Integrity Report",
            f"**Report ID**: `{data['report_id']}`  ",
            f"**Generated**: `{data['generated_at']}`  ",
            f"**Assessment Standard**: National Skills Qualification Framework (NSQF) / NCVET  ",
            "",
            "## 1. Executive Summary",
            "",
            f"- **Total Qualifications Registered**: {data['summary']['total_qualifications']}",
            f"- **Verified Official Qualifications**: {data['summary']['verified_official_qualifications']}",
            f"- **Detailed NOS Modules Mapped**: {data['summary']['total_nos_modules']}",
            f"- **Extracted Performance Criteria**: {data['summary']['total_performance_criteria']}",
            f"- **Audited Tools & Equipment**: {data['summary']['total_tools_and_equipment']}",
            f"- **Synthetic / Demo Records**: {data['summary']['synthetic_demo_qualifications']} (Clearly segregated)",
            f"- **Total Ambiguity / Gap Flags Registered**: {data['summary']['total_ambiguity_flags']}",
            "",
            "## 2. Detailed Qualification Audits",
            ""
        ]

        for qa in data["qualification_audits"]:
            status_badge = "🟢 VERIFIED OFFICIAL" if qa["is_verified"] and not qa["is_synthetic"] else (
                "🟡 SYNTHETIC DEMO" if qa["is_synthetic"] else "🔵 MASTER NQR"
            )
            lines.extend([
                f"### {qa['title']} ({status_badge})",
                f"- **NQR Code**: `{qa['nqr_code'] or 'N/A'}`",
                f"- **Sector**: {qa['sector']} | **Trade**: {qa['trade']} | **NSQF Level**: {qa['nsqf_level']}",
                f"- **Notional Hours**: {qa['notional_hours']['total'] or 'N/A'} (Theory: {qa['notional_hours']['theory']}, Practical: {qa['notional_hours']['practical']}, OJT: {qa['notional_hours']['ojt']})",
                f"- **Credits**: {qa['credits'] or 'N/A'}",
                f"- **NOS Modules**: {qa['nos_count']} | **Criteria**: {qa['criteria_count']} | **Tools**: {qa['tools_count']}",
                ""
            ])

            if qa["ambiguities"]:
                lines.append("#### Ambiguity Flags & Remediation Audit:")
                lines.append("| Field | Location | Raw Value | Ambiguity Type | Remediation Strategy |")
                lines.append("|---|---|---|---|---|")
                for amb in qa["ambiguities"]:
                    clean_expl = amb["explanation"].replace("|", "\\|")
                    lines.append(
                        f"| `{amb['field_name']}` | {amb['source_location']} | `{amb['source_raw_value'] or 'N/A'}` | {amb['ambiguity_type']} | {amb['remediation_strategy']} |"
                    )
                lines.append("")

            lines.append("---")
            lines.append("")

        with open(file_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
