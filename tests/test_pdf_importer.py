from pathlib import Path
import pytest
from backend.importers.pdf_qualification_importer import FullStackPDFImporter
from backend.models.qualification import Qualification

def test_full_stack_pdf_importer(app, db_session):
    pdf_path = Path("References/FULL-STACK DEVELOPER.pdf")
    assert pdf_path.exists(), "Official PDF must exist in References/"

    importer = FullStackPDFImporter(pdf_path)
    qual = importer.import_to_db()

    assert qual is not None
    assert qual.title == "FULL-STACK DEVELOPER"
    assert qual.nsqf_level == 4.5
    assert qual.nco_code == "2513.01"
    assert qual.sector == "IT-ITeS"
    assert qual.notional_hours_total == 600.0
    assert qual.credits == 20.0
    assert qual.is_synthetic is False
    assert qual.is_verified is True

    # Check Passing Rule
    assert len(qual.passing_rules) == 1
    assert qual.passing_rules[0].theory_min_percentage == 40.0
    assert qual.passing_rules[0].practical_min_percentage == 60.0

    # Check Tools & Equipment
    assert len(qual.tools_and_equipment) == 4
    tool_names = [t.tool_name for t in qual.tools_and_equipment]
    assert any("Computer System" in t for t in tool_names)
    assert any("JAVA JDK" in t for t in tool_names)

    # Check NOS Modules (6 modules expected)
    assert len(qual.occupational_standards) == 6
    nos_codes = [nos.nos_code for nos in qual.occupational_standards]
    assert "MSME/ES/01" in nos_codes
    assert "MSME/FSD/01" in nos_codes
    assert "MSME/FSD/02" in nos_codes
    assert "MSME/FSD/03" in nos_codes
    assert "MSME/FSD/04" in nos_codes
    assert "MSME/FSD/05" in nos_codes

    # Check Performance Criteria extracted (>70 criteria expected across all 6 NOS)
    total_criteria = sum(len(nos.performance_criteria) for nos in qual.occupational_standards)
    assert total_criteria >= 80

    # Check Ambiguity Flags recorded
    assert len(qual.ambiguity_flags) >= 4
    flag_fields = [f.field_name for f in qual.ambiguity_flags]
    assert "nqr_code" in flag_fields
    assert "criteria_marks" in flag_fields
    assert "rubric_levels" in flag_fields
