from typing import Annotated, Optional

from fastapi import Body, Depends, HTTPException
from fastapi.security import APIKeyHeader

from app.database.deps import SessionDep
from app.schemas import APISchema
from app.users.models import User

from .models import UserAuthInfo
from .token import TokenType, decode_jwt_token

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
    refresh_token: str


# TODO : jti 검증 로직 추가
async def validate_refresh_token(
    session: SessionDep,
    request: RefreshTokenRequest,
) -> User:
    user_id = decode_jwt_token(request.refresh_token, token_type=TokenType.REFRESH)

    if user_id is None:
        raise HTTPException(status_code=401)

    user = await session.get(User, user_id)
    if user is None or user.is_deleted:
        raise HTTPException(status_code=401)

    return user


RefreshTokenDep = Annotated[User, Depends(validate_refresh_token)]


async def get_current_user_or_none(
    session: SessionDep, token: TokenDep
) -> Optional[User]:
    if token is None:
        return None

    user_id = decode_jwt_token(token)
    if user_id is None:
        # 토큰이 만료되었거나 무효함
        return None

    user = await session.get(User, user_id)
    if user and user.is_deleted:
        return None

    return user


CurrentUserOptional = Annotated[Optional[User], Depends(get_current_user_or_none)]


async def get_current_user(
    session: SessionDep, 
    token: TokenDep, 
    user: CurrentUserOptional
) -> User:
    """현재 사용자를 반환합니다. 토큰이 없거나 만료/무효한 경우 401, 권한이 없는 경우 403을 반환합니다."""
    if token is None:
        # 토큰이 없음
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user is None:
        # 토큰이 만료되었거나 무효함 (401)
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


__all__ = ["TokenDep", "RegisterAuthDep", "CurrentUserOptional", "CurrentUser"]
