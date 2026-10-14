from datetime import datetime, timezone
import uuid
import json
from typing import Dict, Any, List, Optional
from sqlalchemy import String, Float, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import db

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def generate_uuid() -> str:
    return str(uuid.uuid4())

class AssessmentSession(db.Model):
    __tablename__ = "assessment_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    worker_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    assessor_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id"), nullable=True)
    qualification_id: Mapped[str] = mapped_column(String(64), ForeignKey("qualifications.id"), nullable=False)
    
    session_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="in_progress")  # 'in_progress', 'completed', 'finalized'
    
    # Deterministic Scoring Summaries
    theory_score_obtained: Mapped[float] = mapped_column(Float, default=0.0)
    theory_score_max: Mapped[float] = mapped_column(Float, default=0.0)
    theory_percentage: Mapped[float] = mapped_column(Float, default=0.0)

    practical_score_obtained: Mapped[float] = mapped_column(Float, default=0.0)
    practical_score_max: Mapped[float] = mapped_column(Float, default=0.0)
    practical_percentage: Mapped[float] = mapped_column(Float, default=0.0)

    overall_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Audit & Verification Counters
    missing_evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    incomplete_criteria_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # System Provisional Recommendation (AI/Rule co-pilot)
    provisional_recommendation: Mapped[str] = mapped_column(String(50), default="INCOMPLETE_ASSESSMENT")
    # 'RECOMMENDED_CERTIFIED', 'NOT_YET_COMPETENT', 'INCOMPLETE_ASSESSMENT'

    # Human Assessor Binding Final Decision
    assessor_final_decision: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # 'CERTIFIED', 'NOT_YET_COMPETENT', 'DEFERRED'
    assessor_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assessor_signature_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    signed_off_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    worker = relationship("User", foreign_keys=[worker_id])
    assessor = relationship("User", foreign_keys=[assessor_id])
    qualification = relationship("Qualification")
    criterion_scores = relationship("CriterionScore", back_populates="session", cascade="all, delete-orphan")
    evidence_files = relationship("AssessmentEvidence", back_populates="session", cascade="all, delete-orphan")

    def to_dict(self, include_scores: bool = True) -> Dict[str, Any]:
        data = {
            "id": self.id,
            "worker_id": self.worker_id,
            "worker_name": self.worker.full_name if self.worker else None,
            "worker_email": self.worker.email if self.worker else None,
            "assessor_id": self.assessor_id,
            "assessor_name": self.assessor.full_name if self.assessor else None,
            "qualification_id": self.qualification_id,
            "qualification_title": self.qualification.title if self.qualification else None,
            "qualification_nsqf_level": self.qualification.nsqf_level if self.qualification else None,
            "session_date": self.session_date,
            "location": self.location,
            "status": self.status,
            "theory_score_obtained": round(self.theory_score_obtained, 2),
            "theory_score_max": round(self.theory_score_max, 2),
            "theory_percentage": round(self.theory_percentage, 2),
            "practical_score_obtained": round(self.practical_score_obtained, 2),
            "practical_score_max": round(self.practical_score_max, 2),
            "practical_percentage": round(self.practical_percentage, 2),
            "overall_percentage": round(self.overall_percentage, 2),
            "missing_evidence_count": self.missing_evidence_count,
            "incomplete_criteria_count": self.incomplete_criteria_count,
            "provisional_recommendation": self.provisional_recommendation,
            "assessor_final_decision": self.assessor_final_decision,
            "assessor_remarks": self.assessor_remarks,
            "signed_off_at": self.signed_off_at.isoformat() if self.signed_off_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "evidence_count": len(self.evidence_files),
        }
        if include_scores:
            data["criterion_scores"] = [cs.to_dict() for cs in self.criterion_scores]
            data["evidence_files"] = [ev.to_dict() for ev in self.evidence_files]
        return data


class CriterionScore(db.Model):
    __tablename__ = "criterion_scores"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(64), ForeignKey("assessment_sessions.id"), nullable=False)
    criterion_id: Mapped[str] = mapped_column(String(64), ForeignKey("performance_criteria.id"), nullable=False)
    
    # 4-level rubric score: 4=Exceeds, 3=Competent, 2=Developing, 1=Not Demonstrated, 0=Unassessed
    rubric_level: Mapped[int] = mapped_column(Integer, default=0)
    score_awarded: Mapped[float] = mapped_column(Float, default=0.0)
    max_score: Mapped[float] = mapped_column(Float, default=10.0)
    is_competent: Mapped[bool] = mapped_column(Boolean, default=False)
    
    assessor_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    has_evidence: Mapped[bool] = mapped_column(Boolean, default=False)

    session = relationship("AssessmentSession", back_populates="criterion_scores")
    criterion = relationship("PerformanceCriterion")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "criterion_id": self.criterion_id,
            "criterion_code": self.criterion.criterion_code if self.criterion else None,
            "criterion_text": self.criterion.criterion_text if self.criterion else None,
            "criterion_type": self.criterion.criterion_type if self.criterion else None,
            "rubric_level": self.rubric_level,
            "score_awarded": round(self.score_awarded, 2),
            "max_score": round(self.max_score, 2),
            "is_competent": self.is_competent,
            "assessor_notes": self.assessor_notes,
            "has_evidence": self.has_evidence,
        }


class AssessmentEvidence(db.Model):
    __tablename__ = "assessment_evidence"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(64), ForeignKey("assessment_sessions.id"), nullable=False)
    criterion_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("performance_criteria.id"), nullable=True)
    uploaded_by_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    
    evidence_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'video', 'photo', 'code_repo', 'viva_audio', 'document'
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    external_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sha256_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    
    # AI Computer Vision & Evidence Inspector Telemetry
    ai_analysis_tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string of detected_tags
    ai_verification_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="PENDING")
    ai_confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_suggested_rubric: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=3)
    
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    session = relationship("AssessmentSession", back_populates="evidence_files")
    criterion = relationship("PerformanceCriterion")
    uploaded_by = relationship("User")

    def to_dict(self) -> Dict[str, Any]:
        tags = []
        if self.ai_analysis_tags:
            try:
                tags = json.loads(self.ai_analysis_tags)
            except Exception:
                tags = [self.ai_analysis_tags]

        ai_analysis = None
        if self.ai_verification_status and self.ai_verification_status != "PENDING":
            ai_analysis = {
                "status": self.ai_verification_status,
                "confidence_score": self.ai_confidence_score or 0.90,
                "detected_tags": tags,
                "summary": self.ai_summary or "",
                "suggested_rubric_level": self.ai_suggested_rubric or 3,
                "inspected_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            }

        return {
            "id": self.id,
            "session_id": self.session_id,
            "criterion_id": self.criterion_id,
            "uploaded_by_id": self.uploaded_by_id,
            "uploaded_by_name": self.uploaded_by.full_name if self.uploaded_by else None,
            "evidence_type": self.evidence_type,
            "title": self.title,
            "file_path": self.file_path,
            "external_url": self.external_url,
            "file_size_bytes": self.file_size_bytes,
            "sha256_hash": self.sha256_hash,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "ai_analysis": ai_analysis,
        }


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    session_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    user = relationship("User")

    def to_dict(self) -> Dict[str, Any]:
        details_obj = {}
        if self.details:
            try:
                details_obj = json.loads(self.details)
            except Exception:
                details_obj = {"raw": self.details}
        return {
            "id": self.id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else None,
            "user_role": self.user.role if self.user else None,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details": details_obj,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
