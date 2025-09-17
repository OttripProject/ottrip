"""expense.amount to NUMERIC(20,2) and CHECK >= 0

Revision ID: 2025-09-17_expense_amount_decimal
Revises: 2025-09-01_shared_plan
Create Date: 2025-09-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2025-09-17_expense_amount_decimal"
down_revision: Union[str, None] = "2025-09-01_shared_plan"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change column type to NUMERIC(20,2)
    op.alter_column(
        "expense",
        "amount",
        type_=sa.Numeric(20, 2),
        existing_type=sa.Integer(),
        existing_nullable=False,
    )
    # Add CHECK constraint to ensure non-negative values
    op.create_check_constraint(
        "ck_expense_amount_non_negative",
        "expense",
        "amount >= 0",
    )


def downgrade() -> None:
    # Drop CHECK constraint
    op.drop_constraint("ck_expense_amount_non_negative", "expense", type_="check")
    # Revert column type back to INTEGER
    op.alter_column(
        "expense",
        "amount",
        type_=sa.Integer(),
        existing_type=sa.Numeric(20, 2),
        existing_nullable=False,
    )


