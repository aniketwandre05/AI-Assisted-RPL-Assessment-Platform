import pytest
from backend.models.qualification import (
    Qualification,
    NationalOccupationalStandard,
    PerformanceCriterion,
    AssessmentTaskRubric,
    EvidenceRequirement,
    PassingRule,
    ToolAndEquipment,
    AmbiguityFlag
)

def test_qualification_creation_and_serialization(app, db_session):
    qual = Qualification(
        title="Python Web Developer",
        trade="Software Developer",
        sector="IT-ITeS",
        nsqf_level=4.5,
        nqr_code="QG-4.5-IT-00001",
        notional_hours_total=600.0,
        credits=20.0,
        is_synthetic=False,
        is_verified=True
    )
    db_session.add(qual)
    db_session.commit()

    assert qual.id is not None
    data = qual.to_dict(include_children=False)
    assert data["title"] == "Python Web Developer"
    assert data["nsqf_level"] == 4.5
    assert data["is_synthetic"] is False
    assert data["is_verified"] is True

def test_qualification_hierarchy(app, db_session):
    qual = Qualification(
        title="Test Trade",
        trade="Tester",
        sector="Testing",
        nsqf_level=3.0,
        is_synthetic=True
    )
    db_session.add(qual)

    nos = NationalOccupationalStandard(
        qualification=qual,
        nos_code="TEST/01",
        title="Test Standard",
        theory_marks=50.0,
        practical_marks=50.0
    )
    db_session.add(nos)

    pc = PerformanceCriterion(
        occupational_standard=nos,
        criterion_code="TEST_01_PC01",
        criterion_text="Perform test verification step.",
        criterion_type="Practical",
        max_score=10.0,
        is_score_inferred=True
    )
    db_session.add(pc)

    rubric = AssessmentTaskRubric(
        criterion=pc,
        task_name="Verification Task",
        task_description="Execute test check",
        rubric_level_4="Exceeds",
        rubric_level_3="Competent",
        rubric_level_2="Developing",
        rubric_level_1="Not Demonstrated"
    )
    db_session.add(rubric)

    evidence = EvidenceRequirement(
        criterion=pc,
        evidence_type="video",
        is_mandatory=True,
        description="Recorded screen demo"
    )
    db_session.add(evidence)

    rule = PassingRule(
        qualification=qual,
        theory_min_percentage=40.0,
        practical_min_percentage=60.0
    )
    db_session.add(rule)

    flag = AmbiguityFlag(
        qualification=qual,
        field_name="criteria_marks",
        source_location="Annexure",
        ambiguity_type="UNALLOCATED_MARKS",
        explanation="Marks unallocated in source.",
        remediation_strategy="Applied default 10.0 scale."
    )
    db_session.add(flag)

    db_session.commit()

    full_dict = qual.to_dict(include_children=True)
    assert len(full_dict["occupational_standards"]) == 1
    assert len(full_dict["occupational_standards"][0]["performance_criteria"]) == 1
    assert len(full_dict["passing_rules"]) == 1
    assert len(full_dict["ambiguity_flags"]) == 1
    assert full_dict["ambiguity_flags"][0]["ambiguity_type"] == "UNALLOCATED_MARKS"
