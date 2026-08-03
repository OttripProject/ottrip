from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=False, init=True
    )
    city: Mapped[str] = mapped_column(String(255))
    city_ascii: Mapped[str] = mapped_column(String(255), index=True)
    country: Mapped[str] = mapped_column(String(100))
    lat: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    iso2: Mapped[str | None] = mapped_column(
        String(2), nullable=True, default=None, index=True
    )
    iso3: Mapped[str | None] = mapped_column(String(3), nullable=True, default=None)
    admin_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None
    )
    capital: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None)
    population: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    city_ko: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None, index=True
    )
    country_ko: Mapped[str | None] = mapped_column(
        String(100), nullable=True, default=None
    )
