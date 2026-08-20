from sqlalchemy import select, update
from sqlalchemy.orm import joinedload, with_loader_criteria

from app.database.deps import SessionDep
from app.expenses.models import Expense
from app.utils.dependency import dependency

from .models import Accommodation


@dependency
class AccommodationRepository:
    session: SessionDep

    async def save(self, *, accommodation: Accommodation) -> Accommodation:
        self.session.add(accommodation)
        await self.session.flush()
        await self.session.refresh(accommodation, attribute_names=["location"])
        return accommodation

    async def find_by_id(self, *, accommodation_id: int) -> Accommodation | None:
        result = await self.session.execute(
            select(Accommodation)
            .options(
                joinedload(Accommodation.expense),
                joinedload(Accommodation.plan),
                with_loader_criteria(
                    Expense, Expense.is_deleted.is_(False), include_aliases=True
                ),
            )
            .where(
                Accommodation.id == accommodation_id,
                Accommodation.is_deleted.is_(False),
            )
        )
        return result.unique().scalar_one_or_none()

    async def find_all_by_plan(self, *, plan_id: int) -> list[Accommodation]:
        result = await self.session.execute(
            select(Accommodation)
            .where(
                Accommodation.plan_id == plan_id, Accommodation.is_deleted.is_(False)
            )
            .options(
                joinedload(Accommodation.expense),
                with_loader_criteria(
                    Expense, Expense.is_deleted.is_(False), include_aliases=True
                ),
            )
        )
        return list(result.unique().scalars())

    async def remove(self, *, accommodation_id: int) -> None:
        stmt = (
            update(Accommodation)
            .where(
                Accommodation.id == accommodation_id,
                Accommodation.is_deleted.is_(False),
            )
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)
        # commit은 get_db()에서 처리됨
