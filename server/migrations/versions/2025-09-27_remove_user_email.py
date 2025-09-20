"""remove user.email column and unique constraint

Revision ID: c1d2e3f4abcd
Revises: 9ed6640b95a9
Create Date: 2025-09-27 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4abcd"
down_revision: Union[str, None] = "9ed6640b95a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) drop unique constraint if exists
    op.execute('ALTER TABLE "user" DROP CONSTRAINT IF EXISTS uq_user_email')
    # 2) drop column
    op.drop_column("user", "email")


def downgrade() -> None:
    # Recreate the column and constraints as in the original add-email migration
    # 1) add column as nullable to avoid NOT NULL violation on existing rows
    op.add_column("user", sa.Column("email", sa.String(length=254), nullable=True))

    # 2) backfill from user_auth.verified_email when available
    op.execute(
        """
        UPDATE "user" u
        SET email = ua.verified_email
        FROM user_auth ua
        WHERE ua.user_id = u.id AND ua.verified_email IS NOT NULL
        """
    )

    # 3) fallback placeholder for rows still NULL
    op.execute(
        """
        UPDATE "user" u
        SET email = u.handle || '@local.invalid'
        WHERE u.email IS NULL
        """
    )

    # 4) add unique constraint and enforce NOT NULL
    op.create_unique_constraint("uq_user_email", "user", ["email"])
    op.alter_column(
        "user",
        "email",
        existing_type=sa.String(length=254),
        nullable=False,
    )


