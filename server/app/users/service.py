import re

from fastapi import HTTPException

from app.auth.deps import CurrentUser
from app.auth.models import UserAuthInfo
from app.auth.service import AuthInfoService
from app.common.schemas import ValidationResult
from app.utils.dependency import dependency

from .models import User
from .repository import UserRepository
from .schemas import (
    UserCreate,
    # UserRead,
    # UserUpdate,
)


@dependency
class UserService:
    user_repository: UserRepository
    auth_info_service: AuthInfoService

    _handle_pattern = re.compile(r"^[a-z0-9_.]{3,36}$")

    async def validate_handle(self, *, handle: str) -> ValidationResult:
        error = None

        if not self._handle_pattern.fullmatch(handle) or handle == "me":
            return ValidationResult(
                error="handle은 3~36자의 영문 소문자, 숫자, 밑줄(_) 또는 마침표(.)만 가능하며, 'me'는 사용할 수 없습니다."
            )
        if await self.user_repository.is_handle_taken(handle=handle):
            error = "이미 사용 중인 핸들입니다."

        return ValidationResult(error=error)

    async def register(self, *, user_data: UserCreate, auth: UserAuthInfo) -> User:
        handle_validate = await self.validate_handle(handle=user_data.handle)

        if handle_validate.error:
            raise HTTPException(status_code=400, detail=handle_validate.error)

        # 1. 사용자 생성
        created_user = await self.user_repository.create(user_data=user_data)
        if created_user is None:
            raise HTTPException(status_code=400, detail="사용자 생성에 실패했습니다.")

        # 2. 인증 정보와 사용자 연결
        await self.auth_info_service.connect_to_user(auth=auth, user_id=created_user.id)

        return created_user

    async def _validate_target_user(
        self, to_user_handle: str, current_user: CurrentUser
    ):
        if to_user_handle == current_user.handle:
            raise HTTPException(
                status_code=400, detail="자신을 팔로우/언팔로우 할 수 없습니다."
            )

        target_user_id = await self.user_repository.find_id_by_handle(
            user_handle=to_user_handle
        )
        if not target_user_id:
            raise HTTPException(status_code=400, detail="사용자를 찾을 수 없습니다.")

        return target_user_id
