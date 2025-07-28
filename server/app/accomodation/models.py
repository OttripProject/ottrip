from datetime import date
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

    name: Mapped[str]
    """숙소 이름"""

    address: Mapped[str | None] = mapped_column(nullable=True)
    """숙소 주소"""

    start_date: Mapped[date]
    """체크인 날짜"""

    end_date: Mapped[date]
    """체크아웃 날짜"""

    memo: Mapped[str | None] = mapped_column(nullable=True)
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
