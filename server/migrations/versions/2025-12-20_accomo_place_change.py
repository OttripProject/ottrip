"""accomo place change

Revision ID: 6e4e83ba6a55
Revises: 456be2c37c94
Create Date: 2025-12-20 01:04:03.350504

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6e4e83ba6a55"
down_revision: Union[str, None] = "456be2c37c94"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # place 필드 길이 제한 제거: VARCHAR(100) → VARCHAR() (다른 필드들과 일관성)
    # country, city, description과 동일하게 길이 제한 없음
    op.alter_column(
        "accommodation",
        "place",
        existing_type=sa.String(length=100),
        type_=sa.String(),
        existing_nullable=True,
    )


def downgrade() -> None:
    # place 필드 길이 제한 복원: VARCHAR() → VARCHAR(100)
    op.alter_column(
        "accommodation",
        "place",
        existing_type=sa.String(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
