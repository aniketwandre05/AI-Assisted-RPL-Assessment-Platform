from datetime import datetime, timezone
import uuid
import json
from typing import Dict, Any, List, Optional
from sqlalchemy import String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import db

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def generate_uuid() -> str:
    return str(uuid.uuid4())

class WorkerProfile(db.Model):
    __tablename__ = "worker_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Self-Declaration Fields
    occupation_title: Mapped[str] = mapped_column(String(255), nullable=False)
    experience_years: Mapped[float] = mapped_column(Float, default=0.0)
    current_workplace: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    education_level: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Practical Experience Details
    daily_tasks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-serialized list of tasks
    tools_used: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # JSON-serialized list of tools
    skills_declared: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON-serialized list of skills
    informal_training_desc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    status: Mapped[str] = mapped_column(String(50), default="draft")  # 'draft', 'submitted'
    preferred_language: Mapped[str] = mapped_column(String(20), default="en")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="worker_profile")
    matched_qualifications = relationship("QualificationMatch", back_populates="worker_profile", cascade="all, delete-orphan")

    def get_daily_tasks(self) -> List[str]:
        if not self.daily_tasks:
            return []
        try:
            return json.loads(self.daily_tasks)
        except Exception:
            return [t.strip() for t in self.daily_tasks.split("\n") if t.strip()]

    def get_tools_used(self) -> List[str]:
        if not self.tools_used:
            return []
        try:
            return json.loads(self.tools_used)
        except Exception:
            return [t.strip() for t in self.tools_used.split(",") if t.strip()]

    def get_skills_declared(self) -> List[str]:
        if not self.skills_declared:
            return []
        try:
            return json.loads(self.skills_declared)
        except Exception:
            return [s.strip() for s in self.skills_declared.split(",") if s.strip()]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else None,
            "occupation_title": self.occupation_title,
            "experience_years": self.experience_years,
            "current_workplace": self.current_workplace,
            "education_level": self.education_level,
            "daily_tasks": self.get_daily_tasks(),
            "tools_used": self.get_tools_used(),
            "skills_declared": self.get_skills_declared(),
            "informal_training_desc": self.informal_training_desc,
            "status": self.status,
            "preferred_language": self.preferred_language,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class QualificationMatch(db.Model):
    __tablename__ = "qualification_matches"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    worker_profile_id: Mapped[str] = mapped_column(String(64), ForeignKey("worker_profiles.id"), nullable=False)
    qualification_id: Mapped[str] = mapped_column(String(64), ForeignKey("qualifications.id"), nullable=False)
    
    match_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 to 100.0 %
    match_rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON explanation
    status: Mapped[str] = mapped_column(String(50), default="suggested")  # 'suggested', 'selected', 'confirmed'
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    worker_profile = relationship("WorkerProfile", back_populates="matched_qualifications")
    qualification = relationship("Qualification")

    def to_dict(self) -> Dict[str, Any]:
        rationale = {}
        if self.match_rationale:
            try:
                rationale = json.loads(self.match_rationale)
            except Exception:
                rationale = {"text": self.match_rationale}
        return {
            "id": self.id,
            "worker_profile_id": self.worker_profile_id,
            "qualification_id": self.qualification_id,
            "qualification_title": self.qualification.title if self.qualification else None,
            "qualification_sector": self.qualification.sector if self.qualification else None,
            "qualification_nsqf_level": self.qualification.nsqf_level if self.qualification else None,
            "match_score": round(self.match_score, 1),
            "match_rationale": rationale,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
