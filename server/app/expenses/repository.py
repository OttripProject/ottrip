from sqlalchemy import select, update
from sqlalchemy.orm import joinedload

from app.database.deps import SessionDep
from app.utils.dependency import dependency

from .models import Expense


@dependency
class ExpenseRepository:
    session: SessionDep

    async def save(self, *, expense: Expense) -> Expense:
        self.session.add(expense)
        await self.session.flush()
        return expense

    async def find_by_id(self, *, expense_id: int) -> Expense | None:
        result = await self.session.execute(
            select(Expense)
            .options(joinedload(Expense.plan))
            .where(Expense.id == expense_id, Expense.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def find_all_by_plan(self, *, plan_id: int) -> list[Expense]:
        result = await self.session.execute(
            select(Expense).where(
                Expense.plan_id == plan_id, Expense.is_deleted.is_(False)
            )
        )
        return list(result.unique().scalars())

    async def find_all_by_itinerary(self, *, itinerary_id: int) -> list[Expense]:
        result = await self.session.execute(
            select(Expense).where(
                Expense.itinerary_id == itinerary_id, Expense.is_deleted.is_(False)
            )
        )
        return list(result.unique().scalars())

    async def remove(self, *, expense_id: int) -> None:
        stmt = (
            update(Expense)
            .where(Expense.id == expense_id, Expense.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)
        await self.session.commit()
