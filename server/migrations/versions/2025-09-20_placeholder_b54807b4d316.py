"""
Placeholder for missing revision b54807b4d316

This migration intentionally performs no schema changes. It exists only to
provide the missing revision id so that environments whose database is at
`b54807b4d316` can upgrade forward into the current chain.
"""

# No imports required for no-op


# revision identifiers, used by Alembic.
revision = "b54807b4d316"
down_revision = "c1d2e3f4abcd"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No-op placeholder
    pass


def downgrade() -> None:
    # No-op placeholder
    pass


