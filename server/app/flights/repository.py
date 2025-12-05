from sqlalchemy import select, update
from sqlalchemy.orm import joinedload, with_loader_criteria

from app.database.deps import SessionDep
from app.expenses.models import Expense
from app.utils.dependency import dependency

from .models import Flight, FlightSegment


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
            .options(
                joinedload(Flight.plan),
                joinedload(Flight.expense),
                joinedload(Flight.flight_segments),
                with_loader_criteria(
                    FlightSegment, FlightSegment.is_deleted.is_(False), include_aliases=True
                ),
                with_loader_criteria(
                    Expense, Expense.is_deleted.is_(False), include_aliases=True
                ),
            )
            .where(Flight.id == flight_id, Flight.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def find_all_by_plan(self, *, plan_id: int) -> list[Flight]:
        result = await self.session.execute(
            select(Flight)
            .where(Flight.plan_id == plan_id, Flight.is_deleted.is_(False))
            .options(
                joinedload(Flight.expense),
                joinedload(Flight.flight_segments),
                with_loader_criteria(
                    FlightSegment, FlightSegment.is_deleted.is_(False), include_aliases=True
                ),
                with_loader_criteria(
                    Expense, Expense.is_deleted.is_(False), include_aliases=True
                ),
            )
        )
        return list(result.unique().scalars())

    async def remove(self, *, flight_id: int) -> None:
        stmt = (
            update(Flight)
            .where(Flight.id == flight_id, Flight.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)

    # --- Segments ---
    async def save_segment(self, *, segment: FlightSegment) -> FlightSegment:
        self.session.add(segment)
        await self.session.flush()
        return segment

    async def find_segment_by_id(self, *, segment_id: int) -> FlightSegment | None:
        result = await self.session.execute(
            select(FlightSegment)
            .options(joinedload(FlightSegment.flight))
            .where(FlightSegment.id == segment_id, FlightSegment.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def find_segments_by_flight(self, *, flight_id: int) -> list[FlightSegment]:
        result = await self.session.execute(
            select(FlightSegment)
            .where(FlightSegment.flight_id == flight_id, FlightSegment.is_deleted.is_(False))
            .order_by(FlightSegment.order)
        )
        return list(result.scalars())

    async def soft_delete_segment(self, *, segment_id: int) -> None:
        stmt = (
            update(FlightSegment)
            .where(FlightSegment.id == segment_id, FlightSegment.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)
        # commit은 get_db()에서 처리됨

    async def soft_delete_segments_by_flight(self, *, flight_id: int) -> None:
        stmt = (
            update(FlightSegment)
            .where(FlightSegment.flight_id == flight_id, FlightSegment.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)

    async def replace_segments(self, *, flight_id: int, new_segments: list[FlightSegment]) -> list[FlightSegment]:
        await self.session.execute(
            update(FlightSegment)
            .where(FlightSegment.flight_id == flight_id, FlightSegment.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        created: list[FlightSegment] = []
        for idx, seg in enumerate(new_segments, start=1):
            seg.flight_id = flight_id
            seg.order = idx
            self.session.add(seg)
            created.append(seg)
        await self.session.flush()
        return created
