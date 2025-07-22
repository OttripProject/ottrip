from datetime import date, time
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base

if TYPE_CHECKING:
    from app.expenses.models import Expense
    from app.plans.models import Plan


class Itinerary(Base):
    __tablename__ = "itinerary"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        init=False,
        index=True,
        autoincrement=True,
    )

    title: Mapped[str]
    """여행 제목"""

    description: Mapped[str | None] = mapped_column(nullable=True)
    """여행 설명"""

    country: Mapped[str | None] = mapped_column(nullable=True)
    """국가"""

    city: Mapped[str | None] = mapped_column(nullable=True)
    """도시"""

    location: Mapped[str | None] = mapped_column(nullable=True)
    """장소"""

    itinerary_date: Mapped[date]
    """날짜"""

    start_time: Mapped[time]
    """시작 시간"""

    end_time: Mapped[time]
    """종료 시간"""

    expenses: Mapped[list["Expense"]] = relationship(
        back_populates="itinerary", init=False
    )

    plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plan.id"),
        nullable=False,
    )
    plan: Mapped["Plan"] = relationship(init=False, back_populates="itineraries")
    """해당 여행"""

    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
