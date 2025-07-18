from datetime import date, time
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base

if TYPE_CHECKING:
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

    description: Mapped[str]
    """여행 설명"""

    country: Mapped[str]
    """국가"""

    city: Mapped[str]
    """도시"""

    location: Mapped[str]
    """장소"""

    date: Mapped[date]
    """날짜"""

    start_time: Mapped[time]
    """시작 시간"""

    end_time: Mapped[time]
    """종료 시간"""

    plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plan.id"),
        nullable=False,
    )
    plan: Mapped["Plan"] = relationship(back_populates="itineraries")
    """해당 여행"""

    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
