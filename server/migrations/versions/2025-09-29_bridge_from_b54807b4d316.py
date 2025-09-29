"""
Bridge migration from missing revision b54807b4d316

This migration intentionally performs no schema changes. It exists solely to
bridge environments where the database's current revision is `b54807b4d316`
but the corresponding migration file no longer exists in the codebase.
"""

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401


# revision identifiers, used by Alembic.
revision = "7d493cc8e271"
down_revision = "b54807b4d316"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No-op bridge migration
    pass


def downgrade() -> None:
    # No-op bridge migration
    pass


