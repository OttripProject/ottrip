from datetime import datetime, timezone

from fastapi import Body, status

from app.common.deps import HTTPClientDep
from app.common.schemas import ValidationResult
from app.core.router import create_router
from app.users.schemas import UserCreate
from app.users.service import UserService

from .config import auth_settings
from .deps import CurrentUserOptional, RefreshTokenDep, RegisterAuthDep
from .providers.google import get_google_login_url, get_google_token, get_google_user
from .schemas import (
    AuthResponse,
    GoogleCallbackRequest,
    GoogleLoginUrlResponse,
    PrefillCreateUser,
    PublicJWK,
    RegisteredAuthResponse,
    ServerTime,
    TokenResponse,
    UnregisteredAuthResponse,
)
from .service import AuthInfoService
from .token import TokenType, create_jwt_token, create_token_pair

router = create_router()


#
@router.get("/time")
async def get_server_time() -> ServerTime:
    return ServerTime(time=datetime.now(timezone.utc))


#
@router.get("/keys")
async def get_keys() -> list[PublicJWK]:
    return auth_settings.PUBLIC_JWK_SET


# 삭제?
@router.post("/validate/handle")
async def validate_handle(
    user_service: UserService, handle: str = Body(...)
) -> ValidationResult:
    return await user_service.validate_handle(handle=handle)


# 삭제?
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    user_service: UserService,
    user: UserCreate,
    auth: RegisterAuthDep,
) -> TokenResponse:
    registered_user = await user_service.register(user_data=user, auth=auth)

    access_token, refresh_token = create_token_pair(registered_user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


#
@router.post("/refresh")
async def refresh_token(
    user: RefreshTokenDep,
) -> TokenResponse:
    access_token, refresh_token = create_token_pair(user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/valid-token", response_model=bool)
async def check_login_status(current_user: CurrentUserOptional) -> bool:
    return current_user is not None


@router.get("/google/login")
async def google_login(state: str = "default") -> GoogleLoginUrlResponse:
    login_url = get_google_login_url(state)
    return GoogleLoginUrlResponse(url=login_url)


@router.get("/google/callback")
async def google_callback(
    query: GoogleCallbackRequest,
    client: HTTPClientDep,
    auth_info_service: AuthInfoService,
) -> AuthResponse:
    # 1. 토큰 발급
    token_data = await get_google_token(client=client, code=query.code)
    access_token = token_data["access_token"]

    # 2. 사용자 정보
    google_user = await get_google_user(client=client, access_token=access_token)

    # 3. 인증 정보 처리
    auth_info = await auth_info_service.authenticate_with_google(
        google_id=google_user.sub,
        email=google_user.email,
    )

    if auth_info.user_id is None:
        return UnregisteredAuthResponse(
            register_token=create_jwt_token(
                auth_info.id, token_type=TokenType.REGISTER
            ),
            prefill=PrefillCreateUser(
                name=google_user.name,
                nickname=None,
                profile_image=google_user.picture,
            ),
        )

    access_token, refresh_token = create_token_pair(auth_info.user_id)
    return RegisteredAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )
