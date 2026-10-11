from typing import Dict, Any
from backend.database import db
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

def create_demo_electrician_qualification() -> Qualification:
    """
    Creates a clearly labelled synthetic demo qualification for Solar PV / Electrical Technician.
    Used for multi-trade testing and matching validation.
    """
    nqr_code = "SYNTH-DEMO-ELE-001-2026"
    existing = Qualification.query.filter_by(nqr_code=nqr_code).first()
    if existing:
        return existing

    qual = Qualification(
        title="Solar PV & Domestic Electrician [DEMO / SYNTHETIC]",
        trade="Domestic & Solar Electrician",
        sector="Power & Renewable Energy",
        sub_sector="Renewable Energy",
        nsqf_level=4.0,
        nco_code="7411.01",
        awarding_body="Skill Council for Green Jobs (Synthetic Demo Reference)",
        version="1.0-DEMO",
        source_type="DEMO_SYNTHETIC",
        source_file="synthetic_demo_solar_electrician.json",
        source_url="https://demo.rpl.example.gov.in",
        approval_date="2026-01-01",
        validity_date="2028-12-31",
        nsqc_number="DEMO-NSQC-999",
        notional_hours_total=400.0,
        theory_hours=100.0,
        practical_hours=300.0,
        employability_hours=30.0,
        credits=14.0,
        is_synthetic=True,
        is_verified=False,
        description="[DEMO DATA - NOT OFFICIAL] Demonstration trade pack for evaluating multi-trade RPL matching and practical assessments."
    )
    db.session.add(qual)

    # Passing rule
    rule = PassingRule(
        qualification=qual,
        rule_scope="QUALIFICATION_LEVEL",
        theory_min_percentage=50.0,
        practical_min_percentage=70.0,
        aggregate_min_percentage=60.0,
        is_source_supported=False,
        source_citation="Configured demo benchmark rule"
    )
    db.session.add(rule)

    # Tools
    tools = [
        ("Digital Multimeter & Clamp Meter", "CAT III 600V", "1:1"),
        ("Insulated Hand Tool Kit (Pliers, Screwdrivers, Wire Strippers)", "1000V Insulated", "1:1"),
        ("Solar Panel Array Test Rig", "100W Polycrystalline Test Board", "1:4")
    ]
    for name, spec, ratio in tools:
        t = ToolAndEquipment(
            qualification=qual,
            tool_name=name,
            specification=spec,
            learner_ratio=ratio,
            source_page=1
        )
        db.session.add(t)

    # NOS 1: Solar Module Mounting & Wiring
    nos1 = NationalOccupationalStandard(
        qualification=qual,
        nos_code="DEMO/ELE/01",
        title="Mount and Wire Solar PV Panels and Inverters",
        nos_type="Core",
        nsqf_level=4.0,
        sequence_order=1,
        theory_hours=40.0,
        practical_hours=120.0,
        total_hours=160.0,
        theory_marks=100.0,
        practical_marks=100.0,
        total_marks=200.0,
        weightage_pct=50.0,
        credits=6.0,
        source_page=1,
        description="Demonstrate ability to securely mount PV panels and terminate DC string cabling."
    )
    db.session.add(nos1)

    pc1 = PerformanceCriterion(
        occupational_standard=nos1,
        criterion_code="DEMO_ELE_01_PC01",
        criterion_text="Identify panel polarity, connect series-parallel strings, and verify open-circuit voltage (Voc) with multimeter.",
        criterion_type="Practical",
        sequence_order=1,
        source_page=1,
        official_marks_stated=False,
        max_score=10.0,
        is_score_inferred=True,
        guidance_notes="Observe correct multimeter range selection and polarity connection."
    )
    db.session.add(pc1)

    rubric1 = AssessmentTaskRubric(
        criterion=pc1,
        task_name="Solar String Voltage Measurement",
        task_description="Candidate sets up multimeter and reads Voc of 2-panel string safely.",
        rubric_level_4="Exceeds: Flawless PPE usage, verifies meter leads, accurately calculates expected array Voc before measuring.",
        rubric_level_3="Competent: Measures voltage accurately and adheres to safety protocol.",
        rubric_level_2="Developing: Measures voltage but requires reminders on safety or range dial selection.",
        rubric_level_1="Not Demonstrated: Reverse polarity, short circuit danger, or unable to read meter.",
        is_configured_demo_rubric=True,
        source_attribution="Demo Trade Rubric Scale"
    )
    db.session.add(rubric1)

    ev1 = EvidenceRequirement(
        criterion=pc1,
        evidence_type="video",
        is_mandatory=True,
        description="Video clip of worker setting multimeter and taking reading on terminal block.",
        source_origin="CONFIG_DEMO"
    )
    db.session.add(ev1)

    # NOS 2: Safety & Earthing
    nos2 = NationalOccupationalStandard(
        qualification=qual,
        nos_code="DEMO/ELE/02",
        title="Domestic Electrical Safety, Grounding, and Conduit Routing",
        nos_type="Core",
        nsqf_level=4.0,
        sequence_order=2,
        theory_hours=30.0,
        practical_hours=90.0,
        total_hours=120.0,
        theory_marks=100.0,
        practical_marks=100.0,
        total_marks=200.0,
        weightage_pct=50.0,
        credits=5.0,
        source_page=2,
        description="Safety precautions, circuit breaker wiring, and protective earth testing."
    )
    db.session.add(nos2)

    pc2 = PerformanceCriterion(
        occupational_standard=nos2,
        criterion_code="DEMO_ELE_02_PC01",
        criterion_text="Install MCB/ELCB in distribution board and test earth fault loop impedance.",
        criterion_type="Practical",
        sequence_order=1,
        source_page=2,
        official_marks_stated=False,
        max_score=10.0,
        is_score_inferred=True,
        guidance_notes="Candidate demonstrates proper cable stripping and breaker termination."
    )
    db.session.add(pc2)

    rubric2 = AssessmentTaskRubric(
        criterion=pc2,
        task_name="MCB Distribution Board Termination",
        task_description="Candidate connects incoming phase/neutral/earth lines through MCB.",
        rubric_level_4="Exceeds: Clean wire routing, perfect torque on terminals, tests trip mechanism.",
        rubric_level_3="Competent: Correct wiring and safe termination.",
        rubric_level_2="Developing: Functional but loose wire strands or messy layout.",
        rubric_level_1="Not Demonstrated: Cross-wired phase to earth or live hazard.",
        is_configured_demo_rubric=True,
        source_attribution="Demo Trade Rubric Scale"
    )
    db.session.add(rubric2)

    ev2 = EvidenceRequirement(
        criterion=pc2,
        evidence_type="photo",
        is_mandatory=True,
        description="Close-up photograph of finished distribution board wiring.",
        source_origin="CONFIG_DEMO"
    )
    db.session.add(ev2)

    # Add ambiguity flag for demo status
    flag = AmbiguityFlag(
        qualification=qual,
        field_name="qualification_source",
        source_location="Synthetic Seed",
        source_raw_value="N/A",
        ambiguity_type="SYNTHETIC_DEMO_TRADE",
        explanation="This qualification is a synthetic reference pack generated solely for multi-trade testing.",
        remediation_strategy="Marked is_synthetic=True and is_verified=False."
    )
    db.session.add(flag)

    db.session.commit()
    return qual
