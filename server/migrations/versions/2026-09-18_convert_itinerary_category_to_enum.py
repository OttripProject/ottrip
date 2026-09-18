"""convert_itinerary_category_to_enum

Revision ID: d98d0069e446
Revises: 558f7a5c4551
Create Date: 2026-09-18 13:01:35.674954

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d98d0069e446"
down_revision: Union[str, None] = "558f7a5c4551"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

itinerary_category_enum = postgresql.ENUM(
    "MEAL",
    "TRANSPORT",
    "ACTIVITY",
    "SIGHTSEEING",
    "SHOPPING",
    "ETC",
    name="itinerarycategoryenum",
)


def upgrade() -> None:
    itinerary_category_enum.create(op.get_bind(), checkfirst=True)  # type: ignore[reportUnknownMemberType]
    op.alter_column(
        "itinerary",
        "category",
        existing_type=sa.VARCHAR(length=50),
        type_=itinerary_category_enum,
        existing_nullable=True,
        postgresql_using="category::text::itinerarycategoryenum",
    )


def downgrade() -> None:
    op.alter_column(
        "itinerary",
        "category",
        existing_type=itinerary_category_enum,
        type_=sa.VARCHAR(length=50),
        existing_nullable=True,
        postgresql_using="category::text",
    )
    itinerary_category_enum.drop(op.get_bind(), checkfirst=True)  # type: ignore[reportUnknownMemberType]
