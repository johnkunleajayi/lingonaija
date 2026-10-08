"""Permit the first Igbo lesson in the existing completion table."""
from alembic import op
revision = '0006_igbo_welcome'
down_revision = '0005_everyday_greetings'
branch_labels = None
depends_on = None

def upgrade():
    op.drop_constraint('ck_completion_lesson', 'lesson_completions', type_='check')
    op.create_check_constraint('ck_completion_lesson', 'lesson_completions', "(language = 'yoruba' AND lesson_id IN ('a-warm-welcome', 'everyday-greetings')) OR (language = 'igbo' AND lesson_id = 'a-warm-welcome')")

def downgrade():
    op.execute("DO $$ BEGIN IF EXISTS (SELECT 1 FROM lesson_completions WHERE language = 'igbo') THEN RAISE EXCEPTION 'Cannot downgrade with Igbo completions'; END IF; END $$")
    op.drop_constraint('ck_completion_lesson', 'lesson_completions', type_='check')
    op.create_check_constraint('ck_completion_lesson', 'lesson_completions', "language = 'yoruba' AND lesson_id IN ('a-warm-welcome', 'everyday-greetings')")
