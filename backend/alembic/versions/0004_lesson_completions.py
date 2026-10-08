"""First completion and one-time XP award."""
from alembic import op
import sqlalchemy as sa
revision = '0004_lesson_completions'
down_revision = '0003_enrollments'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('lesson_completions',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('language', sa.String(20), nullable=False),
        sa.Column('lesson_id', sa.String(80), nullable=False),
        sa.Column('first_choice_score', sa.Integer(), nullable=False),
        sa.Column('xp', sa.Integer(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('user_id', 'language', 'lesson_id'),
        sa.ForeignKeyConstraint(['user_id', 'language'], ['enrollments.user_id', 'enrollments.language'], ondelete='CASCADE'),
        sa.CheckConstraint("language = 'yoruba' AND lesson_id = 'a-warm-welcome'", name='ck_completion_lesson'),
        sa.CheckConstraint('first_choice_score BETWEEN 0 AND 4 AND xp = 10', name='ck_completion_score_xp'))

def downgrade():
    op.drop_table('lesson_completions')
