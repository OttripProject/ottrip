from typing import TypedDict, Unpack

from sqlalchemy import and_, select
from typing_extensions import NotRequired, Optional

from app.database.deps import SessionDep
from app.utils.dependency import dependency

from .models import UserAuthInfo


class AuthInfoCriteria(TypedDict, total=False):
    """UserAuthInfo 검색에 사용할 수 있는 조건을 정의합니다."""

    id: NotRequired[int]
    user_id: NotRequired[Optional[int]]
    verified_email: NotRequired[Optional[str]]
    google_id: NotRequired[Optional[str]]


@dependency
class AuthRepository:
    session: SessionDep

    async def find_by_id(self, auth_id: int) -> UserAuthInfo | None:
        """ID로 인증 정보를 조회합니다."""
        return await self.session.get(UserAuthInfo, auth_id)

    async def find_by_criteria(
        self, **criteria: Unpack[AuthInfoCriteria]
    ) -> UserAuthInfo | None:
        """제공된 조건으로 인증 정보를 조회합니다."""
        if not criteria:
            return None

        query = select(UserAuthInfo).where(
            and_(
                *[
                    getattr(UserAuthInfo, key) == value
                    for key, value in criteria.items()
                    if value is not None
                ]
            )
        )
        return await self.session.scalar(query)

    async def save(self, auth_info: UserAuthInfo) -> UserAuthInfo:
        """인증 정보를 저장합니다. (새로 생성하거나 기존 정보를 업데이트)"""
        self.session.add(auth_info)
        await self.session.flush()
        await self.session.refresh(auth_info)
        return auth_info
