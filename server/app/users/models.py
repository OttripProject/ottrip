from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base

if TYPE_CHECKING:
    from app.plans.models import Plan


class Gender(Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        init=False,
        index=True,
        autoincrement=True,
    )

    handle: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        nullable=False,
        index=True,
    )
    """사용자명/Handle"""

    nickname: Mapped[str] = mapped_column(String(30), nullable=False)
    """닉네임"""

    description: Mapped[str] = mapped_column(String(1000))
    """유저 설명"""

    gender: Mapped[Optional[Gender]]

    plans: Mapped[list["Plan"]] = relationship(
        back_populates="owner",
        cascade="all, delete-orphan",
        default_factory=list,
    )

    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
