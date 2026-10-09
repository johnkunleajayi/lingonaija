"""Store optional Google profile avatars on existing users."""
from alembic import op
import sqlalchemy as sa

revision = '0010_user_avatar'
down_revision = '0009_five_lesson_curriculum'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('avatar_url', sa.String(2048), nullable=True))


def downgrade():
    op.drop_column('users', 'avatar_url')
