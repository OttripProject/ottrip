# from fastapi import HTTPException

from sqlalchemy import select, update
from sqlalchemy.orm import joinedload

from app.database.deps import SessionDep
from app.flights.models import Flight
from app.itinerary.models import Itinerary
from app.utils.dependency import dependency

from .models import Plan


@dependency
class PlanRepository:
    session: SessionDep

    async def save(self, *, plan: Plan) -> Plan:
        self.session.add(plan)
        await self.session.flush()
        return plan

    async def find_by_id(self, *, plan_id: int) -> Plan | None:
        result = await self.session.execute(
            select(Plan)
            .options(
                joinedload(Plan.owner),
                joinedload(Plan.flights).joinedload(Flight.expense),
                joinedload(Plan.itineraries).joinedload(Itinerary.expenses),
                joinedload(Plan.expenses),
            )
            .where(Plan.id == plan_id, Plan.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def find_all_by_user(self, *, user_id: int) -> list[Plan]:
        result = await self.session.execute(
            select(Plan).where(Plan.owner_id == user_id, Plan.is_deleted.is_(False))
        )
        return list(result.unique().scalars())

    async def remove(self, *, plan_id: int) -> None:
        stmt = (
            update(Plan)
            .where(Plan.id == plan_id, Plan.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)
        await self.session.commit()
