from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class Location(Base):
    __tablename__ = "location"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        init=False,
        index=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(String, nullable=False)

    place_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    latitude: Mapped[float] = mapped_column(Float, nullable=False)

    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    address: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
