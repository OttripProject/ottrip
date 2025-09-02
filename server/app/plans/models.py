from datetime import date, datetime
from typing import TYPE_CHECKING

from enum import Enum

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base

if TYPE_CHECKING:
    from app.accomodation.models import Accommodation
    from app.expenses.models import Expense
    from app.flights.models import Flight
    from app.itinerary.models import Itinerary
    from app.users.models import User


class Plan(Base):
    __tablename__ = "plan"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        init=False,
        index=True,
        autoincrement=True,
    )

    title: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
    )
    """여행 계획 이름"""

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    """여행 시작 날짜"""

    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    """여행 종료 날짜"""

    owner_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id"),
        nullable=False,
    )
    owner: Mapped["User"] = relationship(back_populates="plans", init=False)
    """여행 계획 주인"""

    total_amount: Mapped[int] = mapped_column(default=0, nullable=False)
    """총 금액"""

    expenses: Mapped[list["Expense"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        default_factory=list,
    )

    flights: Mapped[list["Flight"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        default_factory=list,
    )

    itineraries: Mapped[list["Itinerary"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        default_factory=list,
    )

    accommodations: Mapped[list["Accommodation"]] = relationship(
        init=False,
        back_populates="plan",
        cascade="all, delete-orphan",
        default_factory=list,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), init=False
    )

    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)


class Role(Enum):
    EDITOR = "editor"
    VIEWER = "viewer"


class InvitationStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REVOKED = "revoked"
    EXPIRED = "expired"


class PlanShared(Base):
    __tablename__ = "plan_shared"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, init=False)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("plan.id"), nullable=False)
    shared_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=False)
    role: Mapped[Role]
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), init=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), init=False)

    __table_args__ = ()


class PlanInvitation(Base):
    __tablename__ = "plan_invitation"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, init=False)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("plan.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role]
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    invited_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[InvitationStatus] = mapped_column(default=InvitationStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), init=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), init=False)

    __table_args__ = ()
