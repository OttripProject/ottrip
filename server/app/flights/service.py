from fastapi import HTTPException

from app.auth.deps import CurrentUser
from app.expenses.models import Expense, ExpenseCategory, ExpenseCurrency
from app.expenses.repository import ExpenseRepository
from app.plans.repository import PlanRepository
from app.utils.dependency import dependency

from .models import Flight, FlightSegment
from .repository import FlightRepository
from .schemas import (
    FlightCreate,
    FlightRead,
    FlightUpdate,
    FlightSegmentCreate,
    FlightSegmentRead,
    FlightSegmentUpdate,
)


@dependency
class FlightService:
    current_user: CurrentUser
    flight_repository: FlightRepository
    expense_repository: ExpenseRepository
    plan_repository: PlanRepository

    async def create(self, *, flight_data: FlightCreate) -> int:
        plan = await self.plan_repository.find_by_id(plan_id=flight_data.plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=flight_data.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=403, detail="해당 항공편에 대한 생성 권한이 없습니다."
                )
        create_flight_data = Flight(
            reservation_number=flight_data.reservation_number,
            passenger_name=flight_data.passenger_name,
            plan_id=flight_data.plan_id,
        )
        created_flight = await self.flight_repository.save(flight=create_flight_data)

        if not flight_data.segments or len(flight_data.segments) < 1:
            raise HTTPException(status_code=400, detail="세그먼트는 최소 1개 이상이어야 합니다.")

        for idx, seg in enumerate(flight_data.segments, start=1):
            segment = FlightSegment(
                flight_id=created_flight.id,
                airline=seg.airline,
                flight_number=seg.flight_number,
                departure_airport=seg.departure_airport,
                arrival_airport=seg.arrival_airport,
                departure_time=seg.departure_time,
                arrival_time=seg.arrival_time,
                seat_class=seg.seat_class or "",
                seat_number=seg.seat_number or "",
                order=idx,
            )
            await self.flight_repository.save_segment(segment=segment)

        first_departure_date = min(s.departure_time for s in flight_data.segments).date()
        if flight_data.expense:
            expense = Expense(
                amount=float(flight_data.expense.amount),
                category=ExpenseCategory.FLIGHT,
                description=flight_data.expense.description,
                currency=flight_data.expense.currency,
                ex_date=first_departure_date,
                plan_id=created_flight.plan_id,
            )
            created_expense = await self.expense_repository.save(expense=expense)
            created_flight.expense = created_expense
            created_expense.flight_id = created_flight.id

        return int(created_flight.id)

    async def read_flight(self, *, flight_id: int) -> FlightRead:
        flight = await self.flight_repository.find_by_id(flight_id=flight_id)

        if not flight:
            raise HTTPException(
                status_code=400, detail="해당 항공편을 찾을 수 없습니다."
            )

        if flight.plan.owner_id != self.current_user.id:
            is_shared = await self.plan_repository.is_shared(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_shared:
                raise HTTPException(status_code=403, detail="항공편 조회 권한이 없습니다.")

        return FlightRead.model_validate(flight)

    async def read_flights_by_plan(self, *, plan_id: int) -> list[FlightRead]:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")

        if plan.owner_id != self.current_user.id:
            is_shared = await self.plan_repository.is_shared(
                plan_id=plan_id, user_id=self.current_user.id
            )
            if not is_shared:
                raise HTTPException(status_code=403, detail="항공편 조회 권한이 없습니다.")

        flights = await self.flight_repository.find_all_by_plan(plan_id=plan_id)
        flights_list = [FlightRead.model_validate(flight) for flight in flights]

        return flights_list

    async def update(self, *, flight_id: int, update_data: FlightUpdate) -> None:
        flight = await self.flight_repository.find_by_id(flight_id=flight_id)
        if not flight:
            
            raise HTTPException(
                status_code=404, detail="해당 항공편을 찾을 수 없습니다."
            )
        if flight.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=403, detail="해당 항공편에 대한 수정 권한이 없습니다."
                )

        if update_data.reservation_number is not None:
            flight.reservation_number = update_data.reservation_number
        if update_data.passenger_name is not None:
            flight.passenger_name = update_data.passenger_name

        first_departure_date = None
        if update_data.segments is not None:
            if len(update_data.segments) < 1:
                raise HTTPException(status_code=400, detail="세그먼트는 최소 1개 이상이어야 합니다.")
            to_create: list[FlightSegment] = []
            first_departure_date = min(
                (seg.departure_time for seg in update_data.segments),
                key=lambda d: d,
            ).date()
            for seg in update_data.segments:
                to_create.append(
                    FlightSegment(
                        flight_id=flight.id,
                        airline=seg.airline,
                        flight_number=seg.flight_number,
                        departure_airport=seg.departure_airport,
                        arrival_airport=seg.arrival_airport,
                        departure_time=seg.departure_time,
                        arrival_time=seg.arrival_time,
                        seat_class=seg.seat_class or "",
                        seat_number=seg.seat_number or "",
                        order=0,
                    )
                )
            await self.flight_repository.replace_segments(
                flight_id=flight.id, new_segments=to_create
            )
            if flight.expense:
                flight.expense.ex_date = first_departure_date
        await self.flight_repository.save(flight=flight)
            

        if update_data.expense:
            if flight.expense:
                if update_data.expense.amount is not None:
                    flight.expense.amount = float(update_data.expense.amount)
                if update_data.expense.description is not None:
                    flight.expense.description = update_data.expense.description
                if update_data.expense.currency is not None:
                    flight.expense.currency = update_data.expense.currency
                if first_departure_date is not None:
                    flight.expense.ex_date = first_departure_date

                updated_expense = await self.expense_repository.save(
                    expense=flight.expense
                )
                flight.expense = updated_expense
            else:
                existing_expense = await self.expense_repository.find_by_flight_id(flight_id=flight.id)
                
                if existing_expense:
                    existing_expense.is_deleted = False
                    if update_data.expense.amount is not None:
                        existing_expense.amount = float(update_data.expense.amount)
                    if update_data.expense.description is not None:
                        existing_expense.description = update_data.expense.description
                    if update_data.expense.currency is not None:
                        existing_expense.currency = update_data.expense.currency
                    if first_departure_date is not None:
                        existing_expense.ex_date = first_departure_date

                    updated_expense = await self.expense_repository.save(expense=existing_expense)
                    flight.expense = updated_expense
                else:
                    if first_departure_date is None:
                        first_departure_date = min(s.departure_time for s in flight.flight_segments).date()                
                    expense = Expense(
                        amount=float(update_data.expense.amount or 0),
                        category=ExpenseCategory.FLIGHT,
                        description=update_data.expense.description or flight.reservation_number,
                        currency=update_data.expense.currency or ExpenseCurrency.KRW,
                        ex_date=first_departure_date,
                        plan_id=flight.plan_id,
                    )
                    created_expense = await self.expense_repository.save(expense=expense)
                    flight.expense = created_expense
                    created_expense.flight_id = flight.id

        return None

    async def delete(self, *, flight_id: int) -> None:
        flight = await self.flight_repository.find_by_id(flight_id=flight_id)
        if not flight:
            raise HTTPException(status_code=400, detail="항공편을 찾을 수 없습니다.")
        if flight.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=403, detail="해당 항공편에 대한 수정 권한이 없습니다."
                )

        await self.flight_repository.soft_delete_segments_by_flight(flight_id=flight_id)
        await self.expense_repository.soft_delete_by_flight_id(flight_id=flight_id)
        await self.flight_repository.remove(flight_id=flight_id)

    async def add_segment(self, *, data: FlightSegmentCreate) -> FlightSegmentRead:
        flight = await self.flight_repository.find_by_id(flight_id=data.flight_id)
        if not flight:
            raise HTTPException(status_code=404, detail="항공권을 찾을 수 없습니다.")
        if flight.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(status_code=403, detail="세그먼트 추가 권한이 없습니다.")
        segment = FlightSegment(
            flight_id=data.flight_id,
            airline=data.airline,
            flight_number=data.flight_number,
            departure_airport=data.departure_airport,
            arrival_airport=data.arrival_airport,
            departure_time=data.departure_time,
            arrival_time=data.arrival_time,
            seat_class=data.seat_class or "",
            seat_number=data.seat_number or "",
            order=len(flight.flight_segments) + 1,
        )
        created = await self.flight_repository.save_segment(segment=segment)
        return FlightSegmentRead.model_validate(created)

    async def update_segment(self, *, segment_id: int, data: FlightSegmentUpdate) -> FlightSegmentRead:
        seg = await self.flight_repository.find_segment_by_id(segment_id=segment_id)
        if not seg:
            raise HTTPException(status_code=404, detail="세그먼트를 찾을 수 없습니다.")
        flight = seg.flight
        if flight.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(status_code=403, detail="세그먼트 수정 권한이 없습니다.")
        if data.airline is not None:
            seg.airline = data.airline
        if data.flight_number is not None:
            seg.flight_number = data.flight_number
        if data.departure_airport is not None:
            seg.departure_airport = data.departure_airport
        if data.arrival_airport is not None:
            seg.arrival_airport = data.arrival_airport
        if data.departure_time is not None:
            seg.departure_time = data.departure_time
        if data.arrival_time is not None:
            seg.arrival_time = data.arrival_time
        if data.seat_class is not None:
            seg.seat_class = data.seat_class or ""
        if data.seat_number is not None:
            seg.seat_number = data.seat_number or ""
        saved = await self.flight_repository.save_segment(segment=seg)
        return FlightSegmentRead.model_validate(saved)

    async def delete_segment(self, *, segment_id: int) -> None:
        seg = await self.flight_repository.find_segment_by_id(segment_id=segment_id)
        if not seg:
            return
        flight = seg.flight
        if flight.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(status_code=403, detail="세그먼트 삭제 권한이 없습니다.")
        await self.flight_repository.soft_delete_segment(segment_id=segment_id)
