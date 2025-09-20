"""add email

Revision ID: 9ed6640b95a9
Revises: b036f531868a
Create Date: 2025-09-19 15:18:10.235447

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9ed6640b95a9"
down_revision: Union[str, None] = "b036f531868a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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


def downgrade() -> None:
    op.drop_constraint("uq_user_email", "user", type_="unique")
    op.drop_column("user", "email")
