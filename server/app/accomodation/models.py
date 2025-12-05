from datetime import date, time
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base

if TYPE_CHECKING:
    from app.expenses.models import Expense
    from app.plans.models import Plan


class Accommodation(Base):
    __tablename__ = "accommodation"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        init=False,
        index=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(nullable=False)
    """숙소 이름"""

    place: Mapped[str | None] = mapped_column(nullable=True)
    """장소"""

    country: Mapped[str | None] = mapped_column(nullable=True)
    """국가"""

    city: Mapped[str | None] = mapped_column(nullable=True)
    """도시"""

    checkin_date: Mapped[date]
    """체크인 날짜"""

    checkout_date: Mapped[date]
    """체크아웃 날짜"""

    checkin_time: Mapped[time]

    checkout_time: Mapped[time]

    description: Mapped[str | None] = mapped_column(nullable=True)
    """메모"""

    plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plan.id"),
        nullable=False,
    )

    plan: Mapped["Plan"] = relationship(back_populates="accommodations", init=False)

    expense: Mapped[Optional["Expense"]] = relationship(
        init=False,
        back_populates="accommodation",
        uselist=False,
        cascade="all, delete-orphan",
    )

    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
