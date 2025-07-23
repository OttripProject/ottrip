from sqlalchemy import select, update
from sqlalchemy.orm import joinedload

from app.database.deps import SessionDep
from app.utils.dependency import dependency

from .models import Flight


@dependency
class FlightRepository:
    session: SessionDep

    async def save(self, *, flight: Flight) -> Flight:
        self.session.add(flight)
        await self.session.flush()
        return flight

    async def find_by_id(self, *, flight_id: int) -> Flight | None:
        result = await self.session.execute(
            select(Flight)
            .options(joinedload(Flight.expense))
            .where(Flight.id == flight_id, Flight.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def find_all_by_plan(self, *, plan_id: int) -> list[Flight]:
        result = await self.session.execute(
            select(Flight)
            .where(Flight.plan_id == plan_id, Flight.is_deleted.is_(False))
            .options(joinedload(Flight.expense))
        )
        return list(result.unique().scalars())

    async def remove(self, *, flight_id: int) -> None:
        stmt = (
            update(Flight)
            .where(Flight.id == flight_id, Flight.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)
        await self.session.commit()
