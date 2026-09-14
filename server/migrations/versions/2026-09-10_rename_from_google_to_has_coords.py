"""rename_from_google_to_has_coords

Revision ID: 558f7a5c4551
Revises: ba4649c5ce08
Create Date: 2026-09-10 13:41:48.644676

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "558f7a5c4551"
down_revision: Union[str, None] = "ba4649c5ce08"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("location", "from_google", new_column_name="has_coords")
    op.execute(
        "UPDATE location SET has_coords = true WHERE latitude != 0 AND longitude != 0"
    )


def downgrade() -> None:
    op.alter_column("location", "has_coords", new_column_name="from_google")
