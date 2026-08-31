from datetime import datetime

from sqlalchemy import DateTime, Float, String, func
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

    from_google: Mapped[bool] = mapped_column(default=True, nullable=False)

    area_cd: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    signgu_cd: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), init=False
    )
