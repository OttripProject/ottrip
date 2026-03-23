from typing import Optional

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class UserAuthInfo(Base):
    __tablename__ = "user_auth"

    id: Mapped[int] = mapped_column(primary_key=True, init=False, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"))

    verified_email: Mapped[Optional[str]] = mapped_column(unique=True)
    google_id: Mapped[Optional[str]] = mapped_column(unique=True)
    apple_id: Mapped[Optional[str]] = mapped_column(unique=True)

    @classmethod
    def of_email(cls, email: str) -> "UserAuthInfo":
        """이메일 인증 정보를 생성합니다."""
        return cls(verified_email=email, user_id=None, google_id=None, apple_id=None)

    @classmethod
    def of_google(cls, google_id: str, email: Optional[str] = None) -> "UserAuthInfo":
        """구글 인증 정보를 생성합니다."""
        return cls(
            google_id=google_id,
            verified_email=email,
            user_id=None,
            apple_id=None,
        )

    @classmethod
    def of_apple(cls, apple_id: str, email: Optional[str] = None) -> "UserAuthInfo":
        """Apple Sign In 인증 정보를 생성합니다. apple_id는 JWT `sub` 고정 식별자입니다."""
        return cls(
            apple_id=apple_id,
            verified_email=email,
            user_id=None,
            google_id=None,
        )
