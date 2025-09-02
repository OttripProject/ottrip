from sqlalchemy import select, update
from sqlalchemy.orm import joinedload

from app.database.deps import SessionDep
from app.utils.dependency import dependency

from .models import Itinerary


@dependency
class ItineraryRepository:
    session: SessionDep

    async def save(self, *, itinerary: Itinerary) -> Itinerary:
        self.session.add(itinerary)
        await self.session.flush()
        return itinerary

    async def find_by_id(self, *, itinerary_id: int) -> Itinerary | None:
        result = await self.session.execute(
            select(Itinerary)
            .options(
                joinedload(Itinerary.plan),
                joinedload(Itinerary.expenses),
            )
            .where(Itinerary.id == itinerary_id, Itinerary.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def find_all_by_plan(self, *, plan_id: int) -> list[Itinerary]:
        result = await self.session.execute(
            select(Itinerary)
            .options(joinedload(Itinerary.expenses))
            .where(Itinerary.plan_id == plan_id, Itinerary.is_deleted.is_(False))
        )
        return list(result.unique().scalars())

    async def remove(self, *, itinerary_id: int) -> None:
        stmt = (
            update(Itinerary)
            .where(Itinerary.id == itinerary_id, Itinerary.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)
        await self.session.commit()
