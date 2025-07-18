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
    """
    HS256에서는 Private key만 알아도 public key를 알 수 있으나, 보안적으로 안전하게 하기 위해 따로 관리합니다. 
    키 로테이션을 위해 list 형태로 관리합니다.
    """

    @property
    def PRIVATE_JWK_INSTANCE(self) -> jwt.PyJWK:
        return jwt.PyJWK.from_dict(self.PRIVATE_JWK.model_dump())


auth_settings = AuthConfig.create()
