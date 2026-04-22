from datetime import date
from typing import Optional

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

    async def find_all_by_plan(self, *, plan_id: int, ex_date: Optional[date] = None) -> list[Expense]:
        query = select(Expense).where(
            Expense.plan_id == plan_id, Expense.is_deleted.is_(False)
        )
        if ex_date is not None:
            query = query.where(Expense.ex_date == ex_date)
        result = await self.session.execute(query)
        return list(result.unique().scalars())

    async def find_all_by_itinerary(self, *, itinerary_id: int) -> list[Expense]:
        result = await self.session.execute(
            select(Expense).where(
                Expense.itinerary_id == itinerary_id, Expense.is_deleted.is_(False)
            )
        )
        return list(result.unique().scalars())

    async def find_by_flight_id(self, *, flight_id: int) -> Expense | None:
        """Flight ID로 expense 찾기 (soft delete 여부 관계없이)"""
        result = await self.session.execute(
            select(Expense).where(Expense.flight_id == flight_id)
        )
        return result.unique().scalar_one_or_none()

    async def find_by_accommodation_id(self, *, accommodation_id: int) -> Expense | None:
        """Accommodation ID로 expense 찾기 (soft delete 여부 관계없이)"""
        result = await self.session.execute(
            select(Expense).where(Expense.accommodation_id == accommodation_id)
        )
        return result.unique().scalar_one_or_none()

    async def remove(self, *, expense_id: int) -> None:
        stmt = (
            update(Expense)
            .where(Expense.id == expense_id, Expense.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)
        # commit은 get_db()에서 처리됨

    async def soft_delete_by_flight_id(self, *, flight_id: int) -> None:
        stmt = (
            update(Expense)
            .where(Expense.flight_id == flight_id, Expense.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)

    async def soft_delete_by_accommodation_id(self, *, accommodation_id: int) -> None:
        stmt = (
            update(Expense)
            .where(
                Expense.accommodation_id == accommodation_id,
                Expense.is_deleted.is_(False),
            )
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)

    async def soft_delete_by_itinerary_id(self, *, itinerary_id: int) -> None:
        stmt = (
            update(Expense)
            .where(Expense.itinerary_id == itinerary_id, Expense.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)
