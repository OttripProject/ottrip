import re

from fastapi import HTTPException
import uuid

from app.auth.deps import CurrentUser
from app.auth.models import UserAuthInfo
from app.auth.service import AuthInfoService
from app.common.schemas import ValidationResult
from app.utils.dependency import dependency

from .models import User, Gender
from .repository import UserRepository
from .schemas import (
    UserCreate,
    UserRead,
    UserUpdate,
)


@dependency
class UserService:
    user_repository: UserRepository
    auth_info_service: AuthInfoService

    # 닉네임 검증: 한글 1~10자 또는 영문 1~20자, 특수문자 '_', '-', '.' 허용
    _nickname_pattern = re.compile(r"^(?:[가-힣0-9_.-]{1,10}|[A-Za-z0-9_.-]{1,20})$")
    
    async def validate_nickname(self, *, nickname: str) -> ValidationResult:
        if not self._nickname_pattern.fullmatch(nickname):
            return ValidationResult(
                error="닉네임은 한글 1~10자 또는 영문 1~20자이며, 특수문자는 '_', '-', '.'만 허용합니다."
            )
        if await self.user_repository.is_nickname_taken(nickname=nickname):
            return ValidationResult(error="이미 사용 중인 닉네임입니다.")
        return ValidationResult(error=None)

    async def validate_handle(self, *, handle: str) -> ValidationResult:
        normalized = handle.lower()
        if normalized == "me":
            return ValidationResult(error="사용할 수 없는 핸들입니다.")
        if await self.user_repository.is_handle_taken(handle=normalized):
            return ValidationResult(error="이미 사용 중인 핸들입니다.")
        return ValidationResult(error=None)

    async def register(self, *, user_data: UserCreate, auth: UserAuthInfo) -> User:
        if user_data.agreed_terms is not True or user_data.agreed_privacy is not True:
            raise HTTPException(status_code=400, detail="필수 약관(이용약관/개인정보수집·이용)에 동의해야 합니다.")

        handle_validate = await self.validate_handle(handle=user_data.handle)
        
        if handle_validate.error:
            raise HTTPException(status_code=400, detail=handle_validate.error)

        nickname_validate = await self.validate_nickname(nickname=user_data.nickname)
        if nickname_validate.error:
            raise HTTPException(status_code=400, detail=nickname_validate.error)

        normalized = UserCreate(
            handle=user_data.handle.lower(),
            nickname=user_data.nickname,
            description=user_data.description,
            gender=user_data.gender,
            agreed_terms=user_data.agreed_terms,
            agreed_privacy=user_data.agreed_privacy,
            agreed_marketing=user_data.agreed_marketing,
            is_guest=False,
        )

        created_user = await self.user_repository.create(user_data=normalized, email=auth.verified_email)
        if created_user is None:
            raise HTTPException(status_code=400, detail="사용자 생성에 실패했습니다.")

        await self.auth_info_service.connect_to_user(auth=auth, user_id=created_user.id)

        return created_user

    async def create_guest(self) -> User:
        handle = uuid.uuid4().hex

        handle_validate = await self.validate_handle(handle=handle)
        if handle_validate.error:
            raise HTTPException(status_code=400, detail=handle_validate.error)

        nickname = f"Guest_{handle[:8]}"
        nickname_validate = await self.validate_nickname(nickname=nickname)
        if nickname_validate.error:
            raise HTTPException(status_code=400, detail=nickname_validate.error)

        normalized = UserCreate(
            handle=handle,
            nickname=nickname,
            description="",
            gender=Gender.MALE,
            is_guest=True,
            agreed_terms=True,
            agreed_privacy=True,
            agreed_marketing=False,
        )

        created_user = await self.user_repository.create(user_data=normalized, email=None)
        if created_user is None:
            raise HTTPException(status_code=400, detail="사용자 생성에 실패했습니다.")

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

    async def get_profile(self, *, user_id: int) -> UserRead:
        user_profile = await self.user_repository.find_user_read_by_id(user_id=user_id)
        if not user_profile:
            raise HTTPException(status_code=400, detail="사용자를 찾을 수 없습니다.")
        return user_profile

    async def update(self, *, current_user: CurrentUser, updated_data: UserUpdate) -> UserRead:
        updated_user = await self.user_repository.update(
            user_id=current_user.id, updated_data=updated_data
        )
        if not updated_user:
            raise HTTPException(status_code=400, detail="사용자 업데이트에 실패했습니다.")
        profile = await self.get_profile(user_id=current_user.id)
        return profile

    async def delete_account(self, *, current_user: CurrentUser) -> None:
        await self.user_repository.delete_user_auth(user_id=current_user.id)
        await self.user_repository.soft_delete_user(user_id=current_user.id)
        