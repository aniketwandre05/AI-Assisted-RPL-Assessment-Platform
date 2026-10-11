from datetime import datetime, timezone, timedelta
import uuid
import jwt
from typing import Dict, Any, Optional
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import String, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import db
from backend.config import Config

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="worker")  # 'worker', 'assessor', 'admin'
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    aadhaar_last_four: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    worker_profile = relationship("WorkerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def generate_auth_token(self, expires_in_hours: int = 24) -> str:
        payload = {
            "sub": self.id,
            "email": self.email,
            "role": self.role,
            "full_name": self.full_name,
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        }
        return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

    @staticmethod
    def verify_auth_token(token: str) -> Optional["User"]:
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("sub")
            if not user_id:
                return None
            return db.session.get(User, user_id)
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "full_name": self.full_name,
            "phone": self.phone,
            "aadhaar_last_four": self.aadhaar_last_four,
            "state": self.state,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
