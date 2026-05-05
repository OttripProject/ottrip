from datetime import datetime, timezone

from fastapi import status, HTTPException, Response

from app.common.deps import HTTPClientDep
from app.common.schemas import ValidationResult
from app.core.router import create_router
from app.users.schemas import UserCreate
from app.users.service import UserService

from .config import auth_settings
from .deps import CurrentUserOptional, RefreshTokenDep, RegisterAuthDep
from .providers.google import get_google_login_url
from app.core.config import core_settings
from .providers.apple import AppleIdpService
from .schemas import (
    AppleAuthRequest,
    AuthResponse,
    GoogleLoginUrlResponse,
    PrefillCreateUser,
    PublicJWK,
    RegisteredAuthResponse,
    ServerTime,
    TokenResponse,
    UnregisteredAuthResponse,
    GoogleAuthRequest,
    ValidateHandleRequest,
    ValidateNicknameRequest,
)
from .service import AuthInfoService
from .token import TokenType, create_jwt_token, create_token_pair

router = create_router()


def _registered_response(user_id: int, response: Response) -> RegisteredAuthResponse:
    access_token, refresh_token = create_token_pair(user_id)
    _set_auth_cookies(response, access_token, refresh_token)
    return RegisteredAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """로그인 성공 시 httpOnly 쿠키 (Google / Apple 등 공통)."""
    is_local = core_settings.ENVIRONMENT == "local"
    is_prod = core_settings.ENVIRONMENT == "prod"
    if is_local:
        samesite_value = "lax"
    elif is_prod:
        samesite_value = "strict"
    else:
        samesite_value = "none"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not is_local,
        samesite=samesite_value,
        max_age=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not is_local,
        samesite=samesite_value,
        max_age=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )


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
    user_service: UserService, request: ValidateHandleRequest
) -> ValidationResult:
    return await user_service.validate_handle(handle=request.handle)


# 삭제?
@router.post("/validate/nickname")
async def validate_nickname(
    user_service: UserService, request: ValidateNicknameRequest
) -> ValidationResult:
    return await user_service.validate_nickname(nickname=request.nickname)


# 삭제?
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    user_service: UserService,
    user: UserCreate,
    auth: RegisterAuthDep,
    current_user: CurrentUserOptional,
    response: Response,
) -> TokenResponse:
    if current_user is not None:
        if not current_user.is_guest:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 로그인된 회원은 이 경로로 가입할 수 없습니다.",
            )
        registered_user = await user_service.register_guest_upgrade(
            user_data=user, auth=auth, guest_user=current_user
        )
    else:
        registered_user = await user_service.register(user_data=user, auth=auth)

    access_token, refresh_token = create_token_pair(registered_user.id)
    
    # httpOnly 쿠키 설정
    # 로컬: SameSite=lax, Secure=False (HTTP 허용)
    # 개발: SameSite=None, Secure=True (cross-site 요청 허용)
    # 프로덕션: SameSite=strict, Secure=True (동일 사이트만)
    is_local = core_settings.ENVIRONMENT == "local"
    is_prod = core_settings.ENVIRONMENT == "prod"
    
    # cross-site 요청을 위해 dev 환경에서는 SameSite=None 사용
    if is_local:
        samesite_value = "lax"
    elif is_prod:
        samesite_value = "strict"
    else:
        # dev 환경: cross-site 요청 허용 (ottrip.pages.dev → ottrip.onrender.com)
        samesite_value = "none"
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not is_local,  # 로컬만 HTTP 허용, dev/prod는 HTTPS 필수
        samesite=samesite_value,
        max_age=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # 토큰 유효시간과 일치
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not is_local,  # 로컬만 HTTP 허용, dev/prod는 HTTPS 필수
        samesite=samesite_value,
        max_age=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # 토큰 유효시간과 일치
        path="/",
    )
    
    # 하위 호환: JSON 응답도 유지 (Native 환경용)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


#
@router.post("/refresh")
async def refresh_token(
    user: RefreshTokenDep,
    response: Response,
) -> TokenResponse:
    access_token, refresh_token = create_token_pair(user.id)
    
    # httpOnly 쿠키 업데이트
    is_local = core_settings.ENVIRONMENT == "local"
    is_prod = core_settings.ENVIRONMENT == "prod"
    
    # cross-site 요청을 위해 dev 환경에서는 SameSite=None 사용
    if is_local:
        samesite_value = "lax"
    elif is_prod:
        samesite_value = "strict"
    else:
        # dev 환경: cross-site 요청 허용 (ottrip.pages.dev → ottrip.onrender.com)
        samesite_value = "none"

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not is_local,  # 로컬만 HTTP 허용, dev/prod는 HTTPS 필수
        samesite=samesite_value,
        max_age=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # 토큰 유효시간과 일치
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not is_local,  # 로컬만 HTTP 허용, dev/prod는 HTTPS 필수
        samesite=samesite_value,
        max_age=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # 토큰 유효시간과 일치
        path="/",
    )
    
    # 하위 호환: JSON 응답도 유지 (Native 환경용)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/guest")
async def authenticate_guest(
    user_service: UserService,
    response: Response,
) -> RegisteredAuthResponse:
    user = await user_service.create_guest()
    return _registered_response(user.id, response)


@router.get("/valid-token", response_model=bool)
async def check_login_status(current_user: CurrentUserOptional) -> bool:
    return current_user is not None


@router.post("/logout")
async def logout(response: Response) -> None:
    """로그아웃: httpOnly 쿠키 삭제"""
    is_local = core_settings.ENVIRONMENT == "local"
    is_prod = core_settings.ENVIRONMENT == "prod"
    
    if is_local:
        samesite_value = "lax"
    elif is_prod:
        samesite_value = "strict"
    else:
        samesite_value = "none"
    
    response.delete_cookie(
        key="access_token",
        path="/",
        secure=not is_local,
        samesite=samesite_value,
    )
    response.delete_cookie(
        key="refresh_token",
        path="/",
        secure=not is_local,
        samesite=samesite_value,
    )


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
    user_service: UserService,
    current_user: CurrentUserOptional,
    response: Response,
) -> AuthResponse:
    # 1. Google에 id_token 검증 요청
    google_response = await client.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": payload.id_token},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if google_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to verify id_token")

    data = google_response.json()

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

    if current_user is not None and current_user.is_guest:
        if auth_info.user_id is not None and auth_info.user_id != current_user.id:
            await user_service.merge_guest_into_registered_user(
                guest_user_id=current_user.id,
                target_user_id=auth_info.user_id,
            )
            return _registered_response(auth_info.user_id, response)
        if auth_info.user_id == current_user.id:
            return _registered_response(current_user.id, response)
        # 소셜이 아직 미연결이면 Unregistered(registerToken) → 클라이언트 약관/닉네임 후 POST /register 로 승급

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

    return _registered_response(auth_info.user_id, response)


@router.post("/apple")
async def authenticate_apple(
    payload: AppleAuthRequest,
    apple_idp: AppleIdpService,
    auth_info_service: AuthInfoService,
    user_service: UserService,
    current_user: CurrentUserOptional,
    response: Response,
) -> AuthResponse:
    apple_user = await apple_idp.verify_identity_token(payload.identity_token)

    auth_info = await auth_info_service.authenticate_with_apple(
        apple_id=apple_user.sub,
        email=apple_user.email,
    )

    if current_user is not None and current_user.is_guest:
        if auth_info.user_id is not None and auth_info.user_id != current_user.id:
            await user_service.merge_guest_into_registered_user(
                guest_user_id=current_user.id,
                target_user_id=auth_info.user_id,
            )
            return _registered_response(auth_info.user_id, response)
        if auth_info.user_id == current_user.id:
            return _registered_response(current_user.id, response)
        # 소셜이 아직 미연결이면 Unregistered(registerToken) → 클라이언트 약관/닉네임 후 POST /register 로 승급

    if auth_info.user_id is None:
        return UnregisteredAuthResponse(
            register_token=create_jwt_token(
                auth_info.id, token_type=TokenType.REGISTER
            ),
            prefill=PrefillCreateUser(
                name=apple_user.name,
                nickname=None,
                profile_image=None,
            ),
        )

    return _registered_response(auth_info.user_id, response)
