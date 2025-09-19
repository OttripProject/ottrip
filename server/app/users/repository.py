from sqlalchemy import exists, select, update
from app.auth.models import UserAuthInfo

from app.database.deps import SessionDep
from app.utils.dependency import dependency
from .schemas import UserRead

from .models import User
from .schemas import UserCreate, UserUpdate


@dependency
class UserRepository:
    session: SessionDep

    async def is_handle_taken(self, *, handle: str) -> bool:
        return bool(
            await self.session.scalar(select(exists().where(User.handle == handle)))
        )

    async def find_by_id(self, *, user_id: int) -> User | None:
        return await self.session.get(User, user_id)

    async def find_id_by_handle(self, *, user_handle: str) -> int | None:
        return await self.session.scalar(
            select(User.id).where(User.handle == user_handle)
        )

    async def find_user_read_by_id(self, *, user_id: int) -> UserRead | None:
        result = await self.session.execute(
            select(User, UserAuthInfo.verified_email)
            .join(UserAuthInfo, UserAuthInfo.user_id == User.id)
            .where(User.id == user_id)
        )
        row = result.one_or_none()
        if row is None:
            return None
        user, verified_email = row
        user_profile = {
            "handle": user.handle,
            "nickname": user.nickname,
            "description": user.description,
            "gender": user.gender,
            "email": verified_email,
        }
        return UserRead(**user_profile)

    async def create(self, *, user_data: UserCreate) -> User | None:
        created_user = User(**user_data.model_dump())
        self.session.add(created_user)
        await self.session.flush()
        await self.session.refresh(created_user)

        return created_user

    async def update(self, *, user_id: int, updated_data: UserUpdate) -> User | None:
        updated_data_dict = updated_data.model_dump(exclude_unset=True)

        updated_user = await self.session.scalar(
            update(User)
            .where(User.id == user_id)
            .values(**updated_data_dict)
            .returning(User)
        )

        return updated_user
