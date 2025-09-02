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

    airline: Mapped[str]
    """항공사"""

    flight_number: Mapped[str]
    """항공편 번호"""

    departure_airport: Mapped[str]
    """출발 공항"""

    arrival_airport: Mapped[str]
    """도착 공항"""

    departure_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    """출발 시간"""

    arrival_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    """도착 시간"""

    seat_class: Mapped[str]
    """좌석 등급"""

    seat_number: Mapped[str]
    """좌석 번호"""

    duration: Mapped[str | None] = mapped_column(nullable=True)
    """비행 시간"""

    memo: Mapped[str | None] = mapped_column(nullable=True)
    """메모"""

    plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plan.id"),
        nullable=False,
    )
    plan: Mapped["Plan"] = relationship(init=False, back_populates="flights")
    """해당 여행"""

    expense: Mapped[Optional["Expense"]] = relationship(
        init=False,
        back_populates="flight",
        uselist=False,
        cascade="all, delete-orphan",
    )

    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
