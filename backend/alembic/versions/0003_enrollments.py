"""One enrollment per learner and language."""
from alembic import op
import sqlalchemy as sa
revision = "0003_enrollments"
down_revision = "0002_sessions"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("enrollments",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "language"),
        sa.CheckConstraint("language IN ('yoruba', 'igbo', 'hausa')", name="ck_enrollments_language"))

def downgrade():
    op.drop_table("enrollments")
