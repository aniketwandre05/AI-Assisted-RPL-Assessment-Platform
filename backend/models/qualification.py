from datetime import datetime, timezone
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy import (
    String, Float, Integer, Boolean, Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import db

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Qualification(db.Model):
    __tablename__ = "qualifications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    nqr_code: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    trade: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. Software Developer / Electrician
    sector: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. IT-ITeS
    sub_sector: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    nsqf_level: Mapped[float] = mapped_column(Float, nullable=False)  # e.g. 4.5
    nco_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    awarding_body: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Metadata & Versioning
    version: Mapped[str] = mapped_column(String(20), default="1.0")
    source_type: Mapped[str] = mapped_column(String(50), default="OFFICIAL_NQR_PDF")  # OFFICIAL_NQR_PDF, NQR_MASTER_REGISTER, DEMO_SYNTHETIC
    source_file: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    approval_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    validity_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    nsqc_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Notional Hours & Credits
    notional_hours_total: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    theory_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    practical_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ojt_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    employability_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    credits: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Verification & Ambiguity Status
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    ambiguity_flags_count: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    occupational_standards: Mapped[List["NationalOccupationalStandard"]] = relationship(
        "NationalOccupationalStandard", back_populates="qualification", cascade="all, delete-orphan", order_by="NationalOccupationalStandard.sequence_order"
    )
    tools_and_equipment: Mapped[List["ToolAndEquipment"]] = relationship(
        "ToolAndEquipment", back_populates="qualification", cascade="all, delete-orphan"
    )
    passing_rules: Mapped[List["PassingRule"]] = relationship(
        "PassingRule", back_populates="qualification", cascade="all, delete-orphan"
    )
    ambiguity_flags: Mapped[List["AmbiguityFlag"]] = relationship(
        "AmbiguityFlag", back_populates="qualification", cascade="all, delete-orphan"
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    def to_dict(self, include_children: bool = True) -> Dict[str, Any]:
        data = {
            "id": self.id,
            "nqr_code": self.nqr_code,
            "title": self.title,
            "trade": self.trade,
            "sector": self.sector,
            "sub_sector": self.sub_sector,
            "nsqf_level": self.nsqf_level,
            "nco_code": self.nco_code,
            "awarding_body": self.awarding_body,
            "version": self.version,
            "source_type": self.source_type,
            "source_file": self.source_file,
            "source_url": self.source_url,
            "approval_date": self.approval_date,
            "validity_date": self.validity_date,
            "nsqc_number": self.nsqc_number,
            "notional_hours_total": self.notional_hours_total,
            "theory_hours": self.theory_hours,
            "practical_hours": self.practical_hours,
            "ojt_hours": self.ojt_hours,
            "employability_hours": self.employability_hours,
            "credits": self.credits,
            "is_synthetic": self.is_synthetic,
            "is_verified": self.is_verified,
            "ambiguity_flags_count": self.ambiguity_flags_count,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_children:
            data["occupational_standards"] = [nos.to_dict() for nos in self.occupational_standards]
            data["tools_and_equipment"] = [tool.to_dict() for tool in self.tools_and_equipment]
            data["passing_rules"] = [rule.to_dict() for rule in self.passing_rules]
            data["ambiguity_flags"] = [flag.to_dict() for flag in self.ambiguity_flags]
        return data


class NationalOccupationalStandard(db.Model):
    __tablename__ = "national_occupational_standards"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    qualification_id: Mapped[str] = mapped_column(String(64), ForeignKey("qualifications.id"), nullable=False)
    
    nos_code: Mapped[str] = mapped_column(String(100), index=True, nullable=False)  # e.g. MSME/FSD/01
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    nos_type: Mapped[str] = mapped_column(String(50), default="Core")  # Core, Non-Core, Employability
    nsqf_level: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sequence_order: Mapped[int] = mapped_column(Integer, default=0)
    
    # Hours & Marks
    theory_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    practical_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    theory_marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    practical_marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weightage_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    credits: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Metadata
    source_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    qualification: Mapped["Qualification"] = relationship("Qualification", back_populates="occupational_standards")
    performance_criteria: Mapped[List["PerformanceCriterion"]] = relationship(
        "PerformanceCriterion", back_populates="occupational_standard", cascade="all, delete-orphan", order_by="PerformanceCriterion.sequence_order"
    )

    def to_dict(self, include_children: bool = True) -> Dict[str, Any]:
        data = {
            "id": self.id,
            "qualification_id": self.qualification_id,
            "nos_code": self.nos_code,
            "title": self.title,
            "nos_type": self.nos_type,
            "nsqf_level": self.nsqf_level,
            "sequence_order": self.sequence_order,
            "theory_hours": self.theory_hours,
            "practical_hours": self.practical_hours,
            "total_hours": self.total_hours,
            "theory_marks": self.theory_marks,
            "practical_marks": self.practical_marks,
            "total_marks": self.total_marks,
            "weightage_pct": self.weightage_pct,
            "credits": self.credits,
            "source_page": self.source_page,
            "description": self.description,
        }
        if include_children:
            data["performance_criteria"] = [pc.to_dict() for pc in self.performance_criteria]
        return data


class PerformanceCriterion(db.Model):
    __tablename__ = "performance_criteria"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    nos_id: Mapped[str] = mapped_column(String(64), ForeignKey("national_occupational_standards.id"), nullable=False)
    
    criterion_code: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    criterion_text: Mapped[str] = mapped_column(Text, nullable=False)
    criterion_type: Mapped[str] = mapped_column(String(50), default="Practical")  # Practical, Theory, Knowledge
    sequence_order: Mapped[int] = mapped_column(Integer, default=0)
    source_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Official vs Inferred Marks
    official_marks_stated: Mapped[bool] = mapped_column(Boolean, default=False)
    theory_marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    practical_marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_score: Mapped[float] = mapped_column(Float, default=10.0)  # Configured evaluation default
    is_score_inferred: Mapped[bool] = mapped_column(Boolean, default=True)  # True if source had '- - - - -'
    
    # Checklist & Assessment Guidelines
    guidance_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    occupational_standard: Mapped["NationalOccupationalStandard"] = relationship("NationalOccupationalStandard", back_populates="performance_criteria")
    tasks_rubrics: Mapped[List["AssessmentTaskRubric"]] = relationship(
        "AssessmentTaskRubric", back_populates="criterion", cascade="all, delete-orphan"
    )
    evidence_requirements: Mapped[List["EvidenceRequirement"]] = relationship(
        "EvidenceRequirement", back_populates="criterion", cascade="all, delete-orphan"
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "nos_id": self.nos_id,
            "criterion_code": self.criterion_code,
            "criterion_text": self.criterion_text,
            "criterion_type": self.criterion_type,
            "sequence_order": self.sequence_order,
            "source_page": self.source_page,
            "official_marks_stated": self.official_marks_stated,
            "theory_marks": self.theory_marks,
            "practical_marks": self.practical_marks,
            "max_score": self.max_score,
            "is_score_inferred": self.is_score_inferred,
            "guidance_notes": self.guidance_notes,
            "tasks_rubrics": [rubric.to_dict() for rubric in self.tasks_rubrics],
            "evidence_requirements": [req.to_dict() for req in self.evidence_requirements],
        }


class AssessmentTaskRubric(db.Model):
    __tablename__ = "assessment_task_rubrics"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    criterion_id: Mapped[str] = mapped_column(String(64), ForeignKey("performance_criteria.id"), nullable=False)
    
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    task_description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # 4-level standardized rubric scale
    rubric_level_4: Mapped[str] = mapped_column(Text, nullable=False)  # Exceeds Competency / Mastery (100%)
    rubric_level_3: Mapped[str] = mapped_column(Text, nullable=False)  # Competent (75%)
    rubric_level_2: Mapped[str] = mapped_column(Text, nullable=False)  # Developing / Needs Guidance (50%)
    rubric_level_1: Mapped[str] = mapped_column(Text, nullable=False)  # Not Demonstrated (0%)
    
    is_configured_demo_rubric: Mapped[bool] = mapped_column(Boolean, default=True)
    source_attribution: Mapped[str] = mapped_column(String(255), default="Configured Standard RPL Rubric Scale")

    criterion: Mapped["PerformanceCriterion"] = relationship("PerformanceCriterion", back_populates="tasks_rubrics")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "criterion_id": self.criterion_id,
            "task_name": self.task_name,
            "task_description": self.task_description,
            "rubric_level_4": self.rubric_level_4,
            "rubric_level_3": self.rubric_level_3,
            "rubric_level_2": self.rubric_level_2,
            "rubric_level_1": self.rubric_level_1,
            "is_configured_demo_rubric": self.is_configured_demo_rubric,
            "source_attribution": self.source_attribution,
        }


class EvidenceRequirement(db.Model):
    __tablename__ = "evidence_requirements"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    criterion_id: Mapped[str] = mapped_column(String(64), ForeignKey("performance_criteria.id"), nullable=False)
    
    evidence_type: Mapped[str] = mapped_column(String(50), nullable=False)  # video, screenshot, code_repo, document, viva_audio
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    source_origin: Mapped[str] = mapped_column(String(50), default="OFFICIAL_PAGE_6_VIDEO_MANDATE")  # OFFICIAL_PAGE_6_VIDEO_MANDATE, CONFIG_DEMO

    criterion: Mapped["PerformanceCriterion"] = relationship("PerformanceCriterion", back_populates="evidence_requirements")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "criterion_id": self.criterion_id,
            "evidence_type": self.evidence_type,
            "is_mandatory": self.is_mandatory,
            "description": self.description,
            "source_origin": self.source_origin,
        }


class PassingRule(db.Model):
    __tablename__ = "passing_rules"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    qualification_id: Mapped[str] = mapped_column(String(64), ForeignKey("qualifications.id"), nullable=False)
    
    rule_scope: Mapped[str] = mapped_column(String(50), default="QUALIFICATION_LEVEL")  # QUALIFICATION_LEVEL, NOS_LEVEL
    theory_min_percentage: Mapped[float] = mapped_column(Float, default=40.0)  # Official Page 8: 40%
    practical_min_percentage: Mapped[float] = mapped_column(Float, default=60.0)  # Official Page 8: 60%
    aggregate_min_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # Official Page 8: N/A
    is_source_supported: Mapped[bool] = mapped_column(Boolean, default=True)
    source_citation: Mapped[str] = mapped_column(String(255), default="Page 8, Minimum Qualifying Percentage")

    qualification: Mapped["Qualification"] = relationship("Qualification", back_populates="passing_rules")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "qualification_id": self.qualification_id,
            "rule_scope": self.rule_scope,
            "theory_min_percentage": self.theory_min_percentage,
            "practical_min_percentage": self.practical_min_percentage,
            "aggregate_min_percentage": self.aggregate_min_percentage,
            "is_source_supported": self.is_source_supported,
            "source_citation": self.source_citation,
        }


class ToolAndEquipment(db.Model):
    __tablename__ = "tools_and_equipment"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    qualification_id: Mapped[str] = mapped_column(String(64), ForeignKey("qualifications.id"), nullable=False)
    
    tool_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specification: Mapped[str] = mapped_column(String(255), default="Industry Standard")
    learner_ratio: Mapped[str] = mapped_column(String(50), default="1:1")
    remarks: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_page: Mapped[int] = mapped_column(Integer, default=17)

    qualification: Mapped["Qualification"] = relationship("Qualification", back_populates="tools_and_equipment")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "qualification_id": self.qualification_id,
            "tool_name": self.tool_name,
            "specification": self.specification,
            "learner_ratio": self.learner_ratio,
            "remarks": self.remarks,
            "source_page": self.source_page,
        }


class AmbiguityFlag(db.Model):
    __tablename__ = "ambiguity_flags"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    qualification_id: Mapped[str] = mapped_column(String(64), ForeignKey("qualifications.id"), nullable=False)
    
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_location: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "Section 1, Page 2"
    source_raw_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ambiguity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # MISSING_VALUE, UNALLOCATED_MARKS, UNSTATED_SCALE
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    remediation_strategy: Mapped[str] = mapped_column(Text, nullable=False)

    qualification: Mapped["Qualification"] = relationship("Qualification", back_populates="ambiguity_flags")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "qualification_id": self.qualification_id,
            "field_name": self.field_name,
            "source_location": self.source_location,
            "source_raw_value": self.source_raw_value,
            "ambiguity_type": self.ambiguity_type,
            "explanation": self.explanation,
            "remediation_strategy": self.remediation_strategy,
        }
