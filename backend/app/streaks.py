"""One learner streak across courses, using Africa/Lagos calendar days (UTC+1)."""
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import LearningStreak, User

LAGOS = timezone(timedelta(hours=1), name='Africa/Lagos')
def learning_day(now=None):
    return (now or datetime.now(timezone.utc)).astimezone(LAGOS).date()

def record_activity(db: Session, user_id, today):
    # Lock the existing user row, including when no streak row exists yet.
    # Completion and streak updates commit atomically in the caller.
    db.execute(select(User.id).where(User.id == user_id).with_for_update()).scalar_one()
    row = db.get(LearningStreak, user_id, populate_existing=True)
    if row is None:
        db.add(LearningStreak(user_id=user_id, current_streak=1, longest_streak=1, last_active_date=today))
    elif row.last_active_date < today:
        row.current_streak = row.current_streak + 1 if row.last_active_date == today - timedelta(days=1) else 1
        row.longest_streak = max(row.longest_streak, row.current_streak)
        row.last_active_date = today
    db.flush()

def streak_summary(db: Session, user_id, today=None):
    today = today or learning_day()
    row = db.get(LearningStreak, user_id)
    if row is None:
        return {'current_streak': 0, 'longest_streak': 0}
    # Yesterday's streak stays alive while today is still available to practise.
    current = row.current_streak if row.last_active_date >= today - timedelta(days=1) else 0
    return {'current_streak': current, 'longest_streak': row.longest_streak}
