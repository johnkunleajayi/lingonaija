"""Allow authored sections to grow without a fixed database lesson allowlist."""
from alembic import op
revision = '0011_section_curriculum'
down_revision = '0010_user_avatar'
branch_labels = None
depends_on = None
OLD = "language IN ('yoruba', 'igbo', 'hausa') AND lesson_id IN ('a-warm-welcome', 'everyday-greetings', 'introduce-yourself', 'family-and-people', 'food-and-drink')"
def upgrade():
    op.drop_constraint('ck_completion_lesson','lesson_completions',type_='check')
    op.create_check_constraint('ck_completion_lesson','lesson_completions',"language IN ('yoruba', 'igbo', 'hausa')")
def downgrade():
    op.execute("DO $$ BEGIN IF EXISTS (SELECT 1 FROM lesson_completions WHERE NOT ("+OLD+")) THEN RAISE EXCEPTION 'Cannot downgrade with future curriculum completions'; END IF; END $$")
    op.drop_constraint('ck_completion_lesson','lesson_completions',type_='check')
    op.create_check_constraint('ck_completion_lesson','lesson_completions',OLD)
