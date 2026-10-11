import json
from pathlib import Path
import pytest
from backend.importers.demo_qualifications import create_demo_electrician_qualification
from backend.importers.validation_report import QualificationValidationReporter
from backend.models.qualification import Qualification

def test_validation_reporter(app, db_session, tmp_path):
    # Add demo qualification to db
    demo = create_demo_electrician_qualification()
    assert demo.is_synthetic is True

    reporter = QualificationValidationReporter(tmp_path)
    report_data = reporter.generate_report()

    # Check report contents
    assert report_data["summary"]["total_qualifications"] >= 1
    assert report_data["summary"]["synthetic_demo_qualifications"] >= 1
    assert report_data["summary"]["total_ambiguity_flags"] >= 1

    # Check output files exist
    json_file = tmp_path / "qualification_validation_report.json"
    md_file = tmp_path / "qualification_validation_report.md"

    assert json_file.exists()
    assert md_file.exists()

    with open(json_file, "r", encoding="utf-8") as f:
        loaded_json = json.load(f)
        assert loaded_json["report_id"].startswith("VAL-RPT-")

    with open(md_file, "r", encoding="utf-8") as f:
        md_text = f.read()
        assert "# Qualification Data Validation & Integrity Report" in md_text
        assert "Solar PV & Domestic Electrician" in md_text
