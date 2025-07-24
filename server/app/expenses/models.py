import enum
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base

if TYPE_CHECKING:
    from app.flights.models import Flight
    from app.itinerary.models import Itinerary
    from app.plans.models import Plan


class ExpenseCategory(enum.Enum):
    FOOD = "food"
    TRANSPORT = "transport"
    FLIGHT = "flight"
    ACTIVITY = "activity"
    ACCOMMODATION = "accommodation"
    SHOPPING = "shopping"
    ETC = "etc"


class Expense(Base):
    __tablename__ = "expense"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        init=False,
        index=True,
        autoincrement=True,
    )

    category: Mapped[ExpenseCategory]
    """카테고리"""

    amount: Mapped[int]
    """금액"""

    description: Mapped[str | None] = mapped_column(nullable=True)
    """설명"""

    ex_date: Mapped[date]
    """지출날짜"""

    plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plan.id"),
        nullable=False,
    )
    plan: Mapped["Plan"] = relationship(back_populates="expenses", init=False)
    """해당 여행"""

    itinerary_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("itinerary.id"), nullable=True, init=False
    )
    itinerary: Mapped["Itinerary"] = relationship(
        back_populates="expenses", uselist=False, init=False
    )

    flight_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("flight.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
        init=False,
    )
    flight: Mapped[Optional["Flight"]] = relationship(
        back_populates="expense", uselist=False, init=False
    )

    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
