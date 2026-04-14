import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base

if TYPE_CHECKING:
    from app.plans.models import Plan
    from app.users.models import User


class AttachmentEntityType(enum.Enum):
    ITINERARY = "itinerary"
    FLIGHT = "flight"
    ACCOMMODATION = "accommodation"
    EXPENSE = "expense"


class Attachment(Base):
    __tablename__ = "attachment"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        init=False,
        index=True,
        autoincrement=True,
    )

    entity_type: Mapped[AttachmentEntityType]

    entity_id: Mapped[int]

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)

    file_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)

    file_url: Mapped[str] = mapped_column(String(512), nullable=False)

    content_type: Mapped[str] = mapped_column(String(100), nullable=False)

    file_size: Mapped[int] = mapped_column(Integer, nullable=False)

    plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plan.id", ondelete="CASCADE"),
        nullable=False,
    )
    plan: Mapped["Plan"] = relationship(back_populates="attachments", init=False)

    uploaded_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id"),
        nullable=False,
    )
    uploader: Mapped["User"] = relationship(init=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), init=False
    )
