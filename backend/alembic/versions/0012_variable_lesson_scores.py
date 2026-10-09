"""Allow scores for authored lessons with variable exercise counts."""
from alembic import op
revision = '0012_variable_lesson_scores'
down_revision = '0011_section_curriculum'
branch_labels = None
depends_on = None

def upgrade():
    op.drop_constraint('ck_completion_score_xp', 'lesson_completions', type_='check')
    op.create_check_constraint('ck_completion_score_xp', 'lesson_completions', 'first_choice_score >= 0 AND xp = 10')

def downgrade():
    op.execute("DO $$ BEGIN IF EXISTS (SELECT 1 FROM lesson_completions WHERE first_choice_score > 4) THEN RAISE EXCEPTION 'Cannot downgrade with scores above four'; END IF; END $$")
    op.drop_constraint('ck_completion_score_xp', 'lesson_completions', type_='check')
    op.create_check_constraint('ck_completion_score_xp', 'lesson_completions', 'first_choice_score BETWEEN 0 AND 4 AND xp = 10')
