from typing import Optional

from fastapi import HTTPException

from app.utils.dependency import dependency

from .models import UserAuthInfo
from .repository import AuthRepository


@dependency
class AuthInfoService:
    auth_repository: AuthRepository

    async def authenticate_with_email(self, *, email: str) -> UserAuthInfo:
        existing = await self.auth_repository.find_by_criteria(verified_email=email)

        if existing:
            return existing

        auth = UserAuthInfo.of_email(email)
        return await self.auth_repository.save(auth)

    async def authenticate(
        self, google_id: str, email: Optional[str] = None
    ) -> UserAuthInfo:
        existing_auth = await self.auth_repository.find_by_criteria(google_id=google_id)

        if existing_auth:
            return existing_auth

        if email:
            existing_email_auth = await self.auth_repository.find_by_criteria(
                verified_email=email
            )
            if existing_email_auth:
                existing_email_auth.google_id = google_id
                return await self.auth_repository.save(existing_email_auth)

        new_auth = UserAuthInfo.of_google(google_id=google_id, email=email)
        return await self.auth_repository.save(new_auth)

    async def authenticate_with_apple(
        self, *, apple_id: str, email: Optional[str] = None
    ) -> UserAuthInfo:
        """Apple `sub`로 조회 후, 없으면 동일 이메일 행에 apple_id 연결(Google과 동일 통합 정책)."""
        existing_auth = await self.auth_repository.find_by_criteria(apple_id=apple_id)

        if existing_auth:
            return existing_auth

        if email:
            existing_email_auth = await self.auth_repository.find_by_criteria(
                verified_email=email
            )
            if existing_email_auth:
                if (
                    existing_email_auth.apple_id is not None
                    and existing_email_auth.apple_id != apple_id
                ):
                    raise HTTPException(
                        status_code=409,
                        detail="이 이메일은 다른 Apple 계정과 이미 연결되어 있습니다.",
                    )
                existing_email_auth.apple_id = apple_id
                return await self.auth_repository.save(existing_email_auth)

        new_auth = UserAuthInfo.of_apple(apple_id=apple_id, email=email)
        return await self.auth_repository.save(new_auth)

    async def connect_to_user(
        self, *, auth: UserAuthInfo, user_id: int
    ) -> UserAuthInfo:
        auth.user_id = user_id
        return await self.auth_repository.save(auth)
