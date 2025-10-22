from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base

if TYPE_CHECKING:
    from app.expenses.models import Expense
    from app.plans.models import Plan


class Flight(Base):
    __tablename__ = "flight"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        init=False,
        index=True,
        autoincrement=True,
    )

    reservation_number: Mapped[str] = mapped_column(nullable=False)
    # pnr

    passenger_name: Mapped[str] = mapped_column(nullable=False)

    ticket_number: Mapped[str] = mapped_column(nullable=True)
    
    booking_reference: Mapped[str] = mapped_column(nullable=True)

    plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plan.id"),
        nullable=False,
    )
    plan: Mapped["Plan"] = relationship(init=False, back_populates="flights")

    expense: Mapped[Optional["Expense"]] = relationship(
        init=False,
        back_populates="flight",
        uselist=False,
        cascade="all, delete-orphan",
    )

    flight_segments: Mapped[list["FlightSegment"]] = relationship(
        back_populates="flight",
        cascade="all, delete-orphan",
        default_factory=list,
    )

    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)


class FlightSegment(Base):
    __tablename__ = "flight_segment"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        init=False,
        index=True,
        autoincrement=True,
    )
    
    order: Mapped[int]

    airline: Mapped[str] = mapped_column(nullable=False)

    flight_number: Mapped[str] = mapped_column(nullable=False)

    departure_airport: Mapped[str] = mapped_column(nullable=False)

    arrival_airport: Mapped[str] = mapped_column(nullable=False)

    departure_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    arrival_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    seat_class: Mapped[str] = mapped_column(nullable=True)

    seat_number: Mapped[str] = mapped_column(nullable=True)

    gate: Mapped[str] = mapped_column(nullable=True)

    terminal: Mapped[str] = mapped_column(nullable=True)

    flight_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("flight.id", ondelete="CASCADE"),
        nullable=False,
    )
    flight: Mapped["Flight"] = relationship(back_populates="flight_segments", init=False)

    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)

