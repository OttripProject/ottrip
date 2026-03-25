from typing import Optional

import jwt

from app.auth.schemas import PrivateJWK, PublicJWK
from app.config import BaseConfig


class AuthConfig(BaseConfig):
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    APP_BUNDLE_IDS: list[str]

    PRIVATE_JWK: PrivateJWK
    PUBLIC_JWK_SET: list[PublicJWK]

    ALGORITHM: str

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str

    APPLE_SERVICES_ID: Optional[str] = None
    APPLE_TEAM_ID: Optional[str] = None
    APPLE_KEY_ID: Optional[str] = None
    APPLE_PRIVATE_KEY: Optional[str] = None
    APPLE_CLIENT_ID: Optional[str] = None

    @property
    def PRIVATE_JWK_INSTANCE(self) -> jwt.PyJWK:
        return jwt.PyJWK.from_dict(self.PRIVATE_JWK.model_dump())

    @property
    def apple_identity_token_audiences(self) -> list[str]:
        """iOS번들 or 웹 Services ID에서 온게 맞는지."""
        auds = list(self.APP_BUNDLE_IDS)
        if self.APPLE_SERVICES_ID:
            auds.append(self.APPLE_SERVICES_ID)
        return auds


auth_settings = AuthConfig.create()
