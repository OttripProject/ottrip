"""add_sightseeing_to_expense_category

Revision ID: 763ef257aa80
Revises: d98d0069e446
Create Date: 2026-10-27 15:07:25.732764

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "763ef257aa80"
down_revision: Union[str, None] = "d98d0069e446"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE expensecategory ADD VALUE IF NOT EXISTS 'SIGHTSEEING'")
    op.execute(
        """
        UPDATE expense
        SET category = 'SIGHTSEEING'
        FROM itinerary
        WHERE expense.itinerary_id = itinerary.id
          AND itinerary.category = 'SIGHTSEEING'
          AND expense.category = 'ACTIVITY'
        """
    )


def downgrade() -> None:
    op.execute("UPDATE expense SET category = 'ACTIVITY' WHERE category = 'SIGHTSEEING'")
    op.execute("ALTER TYPE expensecategory RENAME TO expensecategory_old")
    op.execute(
        "CREATE TYPE expensecategory AS ENUM "
        "('FOOD', 'TRANSPORT', 'FLIGHT', 'ACTIVITY', 'ACCOMMODATION', 'SHOPPING', 'ETC')"
    )
    op.alter_column(
        "expense",
        "category",
        type_=sa.Enum(name="expensecategory"),
        postgresql_using="category::text::expensecategory",
    )
    op.execute("DROP TYPE expensecategory_old")
