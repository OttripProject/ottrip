import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

import jwt

from .config import auth_settings


@dataclass
class TokenConfig:
    """토큰 설정을 담는 데이터 클래스"""

    type: str
    expiry: timedelta


class TokenType(Enum):
    """토큰 교차 사용 방지를 위한 토큰 타입"""

    AUTH = TokenConfig(
        type="auth",
        expiry=timedelta(minutes=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    """유저 인증용"""

    REFRESH = TokenConfig(
        type="refresh",
        expiry=timedelta(days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    """토큰 갱신용"""

    REGISTER = TokenConfig(
        type="register",
        expiry=timedelta(minutes=10),
    )
    """회원가입 시 프로바이더 검증용"""


def create_jwt_token(
    sub: int,
    *,
    token_type: TokenType = TokenType.AUTH,
) -> str:
    """JWT 토큰을 생성합니다."""

    jti = str(uuid.uuid4())

    encoded_jwt = jwt.encode(
        {
            "exp": datetime.now(timezone.utc) + token_type.value.expiry,
            "type": token_type.value.type,
            "sub": str(sub),
            "jti": jti,
        },
        auth_settings.PRIVATE_JWK_INSTANCE.key,
        algorithm=auth_settings.ALGORITHM,
    )
    return encoded_jwt


def decode_jwt_token(
    token: str,
    *,
    token_type: TokenType = TokenType.AUTH,
) -> Optional[int]:
    """JWT 토큰을 디코딩합니다."""
    try:
        payload = jwt.decode(
            token,
            auth_settings.PRIVATE_JWK_INSTANCE.key,
            algorithms=[auth_settings.ALGORITHM],
        )
        sub: str = payload.get("sub")

        if token_type.value.type != payload.get("type"):
            raise jwt.PyJWTError()

        return int(sub)
    except jwt.PyJWTError:
        return None


def create_token_pair(user_id: int) -> tuple[str, str]:
    """Access token과 refresh token 쌍을 생성합니다."""
    access_token = create_jwt_token(user_id, token_type=TokenType.AUTH)
    refresh_token = create_jwt_token(user_id, token_type=TokenType.REFRESH)
    return access_token, refresh_token
