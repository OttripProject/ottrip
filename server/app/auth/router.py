from datetime import datetime, timezone

from fastapi import Body, status, HTTPException

from app.common.deps import HTTPClientDep
from app.common.schemas import ValidationResult
from app.core.router import create_router
from app.users.schemas import UserCreate
from app.users.service import UserService

from .config import auth_settings
from .deps import CurrentUserOptional, RefreshTokenDep, RegisterAuthDep
from .providers.google import get_google_login_url
from .schemas import (
    AuthResponse,
    GoogleLoginUrlResponse,
    PrefillCreateUser,
    PublicJWK,
    RegisteredAuthResponse,
    ServerTime,
    TokenResponse,
    UnregisteredAuthResponse,
    GoogleAuthRequest,
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


# @router.get("/google/callback")
# async def google_callback(
#     query: GoogleCallbackRequest,
#     client: HTTPClientDep,
#     auth_info_service: AuthInfoService,
# ) -> AuthResponse:
#     # 1. 토큰 발급
#     token_data = await get_google_token(client=client, code=query.code)
#     access_token = token_data["access_token"]

#     # 2. 사용자 정보
#     google_user = await get_google_user(client=client, access_token=access_token)

#     # 3. 인증 정보 처리
#     auth_info = await auth_info_service.authenticate_with_google(
#         google_id=google_user.sub,
#         email=google_user.email,
#     )

#     if auth_info.user_id is None:
#         return UnregisteredAuthResponse(
#             register_token=create_jwt_token(
#                 auth_info.id, token_type=TokenType.REGISTER
#             ),
#             prefill=PrefillCreateUser(
#                 name=google_user.name,
#                 nickname=None,
#                 profile_image=google_user.picture,
#             ),
#         )

#     access_token, refresh_token = create_token_pair(auth_info.user_id)
#     return RegisteredAuthResponse(
#         access_token=access_token,
#         refresh_token=refresh_token,
#     )


@router.post("/google")
async def authenticate_google(
    payload: GoogleAuthRequest,
    client: HTTPClientDep,
    auth_info_service: AuthInfoService,
) -> AuthResponse:
    # 1. Google에 id_token 검증 요청
    response = await client.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": payload.id_token},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to verify id_token")

    data = response.json()

    # 2. aud 검증
    if data.get("aud") != auth_settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Invalid client ID")

    # 3. 사용자 인증/연결 처리
    google_sub = data.get("sub")
    email = data.get("email")

    auth_info = await auth_info_service.authenticate(
        google_id=google_sub,
        email=email,
    )

    if auth_info.user_id is None:
        return UnregisteredAuthResponse(
            register_token=create_jwt_token(
                auth_info.id, token_type=TokenType.REGISTER
            ),
            prefill=PrefillCreateUser(
                name=data.get("name"),
                nickname=None,
                profile_image=data.get("picture"),
            ),
        )

    access_token, refresh_token = create_token_pair(auth_info.user_id)
    return RegisteredAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )
