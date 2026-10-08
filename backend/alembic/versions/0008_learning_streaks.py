"""Persistent learner streaks; seed only known historical completion days."""
from alembic import op
import sqlalchemy as sa
from datetime import timedelta
revision = '0008_learning_streaks'
down_revision = '0007_hausa_welcome'
branch_labels = None
depends_on = None

def upgrade():
    table = op.create_table('learning_streaks',
        sa.Column('user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('current_streak', sa.Integer(), nullable=False),
        sa.Column('longest_streak', sa.Integer(), nullable=False),
        sa.Column('last_active_date', sa.Date(), nullable=False),
        sa.CheckConstraint('current_streak >= 0 AND longest_streak >= current_streak', name='ck_streak_counts'))
    rows = op.get_bind().execute(sa.text("SELECT user_id, (completed_at AT TIME ZONE 'Africa/Lagos')::date AS day FROM lesson_completions GROUP BY user_id, day ORDER BY user_id, day"))
    histories = {}
    for user_id, day in rows:
        histories.setdefault(user_id, []).append(day)
    for user_id, days in histories.items():
        current = longest = 0
        previous = None
        for day in days:
            current = current + 1 if previous and day == previous + timedelta(days=1) else 1
            longest = max(longest, current)
            previous = day
        op.get_bind().execute(table.insert().values(user_id=user_id, current_streak=current, longest_streak=longest, last_active_date=previous))

def downgrade():
    op.drop_table('learning_streaks')
