import uuid
from datetime import date, datetime
from sqlalchemy import Date, Integer, ForeignKeyConstraint, Boolean, DateTime, String, CheckConstraint, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("preferred_language IN ('yoruba', 'igbo', 'hausa')", name="ck_users_language"),)
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
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

class LessonCompletion(Base):
    __tablename__ = "lesson_completions"
    __table_args__ = (
        ForeignKeyConstraint(['user_id', 'language'], ['enrollments.user_id', 'enrollments.language'], ondelete='CASCADE'),
        CheckConstraint("language IN ('yoruba', 'igbo', 'hausa')", name='ck_completion_lesson'),
        CheckConstraint('first_choice_score >= 0 AND xp = 10', name='ck_completion_score_xp'),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    language: Mapped[str] = mapped_column(String(20), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    first_choice_score: Mapped[int] = mapped_column(Integer)
    xp: Mapped[int] = mapped_column(Integer, default=10)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class LearningStreak(Base):
    __tablename__ = 'learning_streaks'
    __table_args__ = (CheckConstraint('current_streak >= 0 AND longest_streak >= current_streak', name='ck_streak_counts'),)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_active_date: Mapped[date] = mapped_column(Date)
