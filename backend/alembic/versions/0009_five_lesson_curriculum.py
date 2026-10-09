"""Allow five lessons per language without changing existing completion records."""
from alembic import op

revision = '0009_five_lesson_curriculum'
down_revision = '0008_learning_streaks'
branch_labels = None
depends_on = None

OLD_LESSONS = "(language = 'yoruba' AND lesson_id IN ('a-warm-welcome', 'everyday-greetings')) OR (language = 'igbo' AND lesson_id = 'a-warm-welcome') OR (language = 'hausa' AND lesson_id = 'a-warm-welcome')"
NEW_LESSONS = "language IN ('yoruba', 'igbo', 'hausa') AND lesson_id IN ('a-warm-welcome', 'everyday-greetings', 'introduce-yourself', 'family-and-people', 'food-and-drink')"

def upgrade():
    op.drop_constraint('ck_completion_lesson', 'lesson_completions', type_='check')
    op.create_check_constraint('ck_completion_lesson', 'lesson_completions', NEW_LESSONS)

def downgrade():
    op.execute("DO $$ BEGIN IF EXISTS (SELECT 1 FROM lesson_completions WHERE NOT (" + OLD_LESSONS + ")) THEN RAISE EXCEPTION 'Cannot downgrade with expanded curriculum completions'; END IF; END $$")
    op.drop_constraint('ck_completion_lesson', 'lesson_completions', type_='check')
    op.create_check_constraint('ck_completion_lesson', 'lesson_completions', OLD_LESSONS)
