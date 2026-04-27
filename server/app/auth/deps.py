from typing import Annotated, Optional

from fastapi import Body, Cookie, Depends, HTTPException, Request
from fastapi.security import APIKeyHeader

from app.database.deps import SessionDep
from app.schemas import APISchema
from app.users.models import User

from .models import UserAuthInfo
from .token import TokenType, decode_jwt_token

import logging

logger = logging.getLogger(__name__)

api_key_header = APIKeyHeader(
    name="X-Auth-Token",
    scheme_name="User Auth",
    auto_error=False,
)
TokenDep = Annotated[str | None, Depends(api_key_header)]


async def validate_register_token(
    session: SessionDep,
    registerToken: Annotated[str, Body(alias="registerToken")],
) -> UserAuthInfo:
    auth_id = decode_jwt_token(registerToken, token_type=TokenType.REGISTER)

    if auth_id is None:
        raise HTTPException(status_code=403)

    auth = await session.get(UserAuthInfo, auth_id)
    if auth is None or auth.user_id is not None:
        raise HTTPException(status_code=403)

    return auth


RegisterAuthDep = Annotated[UserAuthInfo, Depends(validate_register_token)]


class RefreshTokenRequest(APISchema):
    refresh_token: str | None = None  


# TODO : jti 검증 로직 추가
async def validate_refresh_token(
    session: SessionDep,
    http_request: Request,  
) -> User:
    cookie_token = http_request.cookies.get("refresh_token")
    
    body_token = None
    try:
        body_data = await http_request.json()
        body_token = body_data.get("refresh_token") if body_data else None
    except Exception:
        pass
    
    token_value = cookie_token or body_token
    
    if token_value is None:
        logger.debug(f"[REFRESH] No token found - cookie: {cookie_token is not None}, body: {body_token is not None}")
        raise HTTPException(status_code=401, detail="Refresh token required")
    
    user_id = decode_jwt_token(token_value, token_type=TokenType.REFRESH)

    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await session.get(User, user_id)
    if user is None or user.is_deleted:
        raise HTTPException(status_code=401, detail="User not found")

    return user


RefreshTokenDep = Annotated[User, Depends(validate_refresh_token)]


async def get_current_user_or_none(
    session: SessionDep,
    token: TokenDep,  
    access_token: Optional[str] = Cookie(None, include_in_schema=False), 
) -> Optional[User]:
    token_value = token or access_token
    
    if token_value is None:
        return None

    user_id = decode_jwt_token(token_value)
    if user_id is None:
        return None

    user = await session.get(User, user_id)
    if user and user.is_deleted:
        return None

    return user


CurrentUserOptional = Annotated[Optional[User], Depends(get_current_user_or_none)]


async def get_current_user(
    user: CurrentUserOptional  # 쿠키 또는 헤더에서 토큰 검증됨
) -> User:
    """현재 사용자를 반환합니다. 토큰이 없거나 만료/무효한 경우 401, 권한이 없는 경우 403을 반환합니다."""
    if user is None:
        # 토큰이 없거나 만료되었거나 무효함 (401)
        raise HTTPException(status_code=401, detail="Authentication required")
        
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


__all__ = ["TokenDep", "RegisterAuthDep", "CurrentUserOptional", "CurrentUser"]
