import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, String, CheckConstraint, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("preferred_language IN ('yoruba', 'igbo', 'hausa')", name="ck_users_language"),)
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    google_subject: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(20), default="yoruba", server_default="yoruba")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AuthSession(Base):
    __tablename__ = "auth_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (CheckConstraint("language IN ('yoruba', 'igbo', 'hausa')", name="ck_enrollments_language"),)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    language: Mapped[str] = mapped_column(String(20), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
