"""Allow the second Yorùbá lesson using existing completion records."""
from alembic import op
revision = '0005_everyday_greetings'
down_revision = '0004_lesson_completions'
branch_labels = None
depends_on = None

def upgrade():
    op.drop_constraint('ck_completion_lesson', 'lesson_completions', type_='check')
    op.create_check_constraint('ck_completion_lesson', 'lesson_completions', "language = 'yoruba' AND lesson_id IN ('a-warm-welcome', 'everyday-greetings')")

def downgrade():
    # Preserve learner records: refuse rollback if Lesson 2 data exists.
    op.execute("DO $$ BEGIN IF EXISTS (SELECT 1 FROM lesson_completions WHERE lesson_id = 'everyday-greetings') THEN RAISE EXCEPTION 'Cannot downgrade with Lesson 2 completions'; END IF; END $$")
    op.drop_constraint('ck_completion_lesson', 'lesson_completions', type_='check')
    op.create_check_constraint('ck_completion_lesson', 'lesson_completions', "language = 'yoruba' AND lesson_id = 'a-warm-welcome'")
