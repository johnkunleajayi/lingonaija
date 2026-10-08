"""Independent user identities, prepared for future Google authentication."""
from alembic import op
import sqlalchemy as sa
revision = "0001_users"
down_revision = None
branch_labels = None
depends_on = None
def upgrade():
    op.create_table("users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("google_subject", sa.String(255), nullable=True),
        sa.Column("preferred_language", sa.String(20), server_default="yoruba", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("google_subject"),
        sa.CheckConstraint("preferred_language IN ('yoruba', 'igbo', 'hausa')", name="ck_users_language"))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
def downgrade():
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
