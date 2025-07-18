# from fastapi import status

# from app.auth.deps import CurrentUser
from app.core.router import create_router

# from .schemas import UserRead, UserUpdate
# from .service import UserService

router = create_router()


# @router.get("/me", status_code=status.HTTP_200_OK)
# async def read_user_self(
#     user_service: UserService, current_user: CurrentUser
# ) -> UserReadProfile:
#     return await user_service.get_profile(user_id=current_user.id)


# @router.put("/me")
# async def update_user_info(
#     user_service: UserService, update_data: UserUpdate, current_user: CurrentUser
# ) -> UserRead:
#     return await user_service.update(
#         updated_data=update_data, current_user=current_user
#     )
