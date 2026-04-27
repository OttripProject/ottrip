from sqlalchemy import and_, delete, exists, select, update
from app.auth.models import UserAuthInfo

from app.database.deps import SessionDep
from app.utils.dependency import dependency
from .schemas import UserRead

from .models import Gender, User
from .schemas import UserCreate, UserUpdate


@dependency
class UserRepository:
    session: SessionDep

    async def is_handle_taken(self, *, handle: str) -> bool:
        return bool(
            await self.session.scalar(select(exists().where(User.handle == handle)))
        )

    async def is_nickname_taken(self, *, nickname: str) -> bool:
        return bool(
            await self.session.scalar(select(exists().where(User.nickname == nickname)))
        )

    async def is_handle_taken_excluding(
        self, *, handle: str, except_user_id: int
    ) -> bool:
        return bool(
            await self.session.scalar(
                select(
                    exists().where(
                        and_(User.handle == handle, User.id != except_user_id)
                    )
                )
            )
        )

    async def is_nickname_taken_excluding(
        self, *, nickname: str, except_user_id: int
    ) -> bool:
        return bool(
            await self.session.scalar(
                select(
                    exists().where(
                        and_(User.nickname == nickname, User.id != except_user_id)
                    )
                )
            )
        )

    async def find_by_id(self, *, user_id: int) -> User | None:
        return await self.session.get(User, user_id)

    async def find_id_by_handle(self, *, user_handle: str) -> int | None:
        return await self.session.scalar(
            select(User.id).where(User.handle == user_handle)
        )

    async def find_user_read_by_id(self, *, user_id: int) -> UserRead | None:
        user = await self.session.get(User, user_id)
        if user is None:
            return None
        return UserRead(
            handle=user.handle,
            nickname=user.nickname,
            description=user.description,
            gender=(user.gender if user.gender is not None else Gender.OTHER),
            email=user.email,
            is_guest=user.is_guest,
        )

    async def create(self, *, user_data: UserCreate, email: str | None = None) -> User | None:
        user_dict = user_data.model_dump()
        user_dict['email'] = email
        created_user = User(**user_dict)
        self.session.add(created_user)
        await self.session.flush()
        await self.session.refresh(created_user)

        return created_user

    async def promote_guest_to_registered(
        self, *, user_id: int, email: str | None
    ) -> None:
        await self.session.execute(
            update(User)
            .where(User.id == user_id)
            .where(User.is_deleted.is_(False))
            .values(is_guest=False, email=email)
        )
        await self.session.flush()

    async def upgrade_guest_in_place(
        self, *, user_id: int, user_data: UserCreate, email: str
    ) -> None:
        await self.session.execute(
            update(User)
            .where(User.id == user_id)
            .where(User.is_deleted.is_(False))
            .where(User.is_guest.is_(True))
            .values(
                handle=user_data.handle,
                nickname=user_data.nickname,
                description=user_data.description,
                gender=user_data.gender,
                agreed_terms=user_data.agreed_terms,
                agreed_privacy=user_data.agreed_privacy,
                agreed_marketing=user_data.agreed_marketing
                if user_data.agreed_marketing is not None
                else False,
                is_guest=False,
                email=email,
            )
        )
        await self.session.flush()

    async def update(self, *, user_id: int, updated_data: UserUpdate) -> User | None:
        updated_data_dict = updated_data.model_dump(exclude_unset=True)

        updated_user = await self.session.scalar(
            update(User)
            .where(User.id == user_id)
            .values(**updated_data_dict)
            .returning(User)
        )

        return updated_user

    async def delete_user_auth(self, *, user_id: int) -> None:
        await self.session.execute(
            delete(UserAuthInfo).where(UserAuthInfo.user_id == user_id)
        )

    async def soft_delete_user(self, *, user_id: int) -> None:
        await self.session.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                is_deleted=True,
                handle=f"deleted_{user_id}",
                nickname=f"deleted_{user_id}",
                )
        )
