import random

from app.auth.schemas import TokenResponse
from app.auth.service import AuthInfoService
from app.auth.token import TokenType, create_jwt_token, create_token_pair
from app.core.router import create_router
from app.users.models import Gender
from app.users.schemas import UserCreate
from app.users.service import UserService

router = create_router()


@router.get("/create-test-user-token")
async def get_token(user_id: int):
    """
    유저 토큰 생성 테스트
    """
    return create_jwt_token(user_id, token_type=TokenType.AUTH)


@router.get("/create-test-register-token")
async def get_register_token(
    auth_info_service: AuthInfoService,
    email: str,
) -> str:
    """
    회원가입 토큰 생성 테스트
    """
    info = await auth_info_service.authenticate_with_email(email=email)

    return create_jwt_token(info.id, token_type=TokenType.REGISTER)


@router.post("/create-test-user")
async def create_test_user(
    auth_info_service: AuthInfoService,
    user_service: UserService,
) -> TokenResponse:
    """
    테스트 유저 생성
    """
    random_number = random.randint(1, 1000000)
    email = f"testuser{random_number}@test.com"
    auth = await auth_info_service.authenticate_with_email(email=email)

    test_user = UserCreate(
        handle=f"testuser{random_number}",
        nickname=f"testuser{random_number}",
        description="테스트용 유저입니다.",
        gender=Gender.MALE,
    )

    created_user = await user_service.register(user_data=test_user, auth=auth)
    access_token, refresh_token = create_token_pair(created_user.id)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
