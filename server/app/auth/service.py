from typing import Optional

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

    async def connect_to_user(
        self, *, auth: UserAuthInfo, user_id: int
    ) -> UserAuthInfo:
        auth.user_id = user_id
        return await self.auth_repository.save(auth)
