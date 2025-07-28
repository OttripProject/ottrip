from fastapi import HTTPException

from app.auth.deps import CurrentUser
from app.expenses.models import Expense
from app.expenses.repository import ExpenseRepository
from app.plans.repository import PlanRepository
from app.utils.dependency import dependency

from .models import Flight
from .repository import FlightRepository
from .schemas import FlightCreate, FlightRead, FlightUpdate


@dependency
class FlightService:
    current_user: CurrentUser
    flight_repository: FlightRepository
    expense_repository: ExpenseRepository
    plan_repository: PlanRepository

    async def create(self, *, flight_data: FlightCreate) -> FlightRead:
        create_flight_data = Flight(
            airline=flight_data.airline,
            flight_number=flight_data.flight_number,
            departure_airport=flight_data.departure_airport,
            arrival_airport=flight_data.arrival_airport,
            departure_time=flight_data.departure_time,
            arrival_time=flight_data.arrival_time,
            seat_class=flight_data.seat_class,
            seat_number=flight_data.seat_number,
            duration=flight_data.duration,
            memo=flight_data.memo,
            plan_id=flight_data.plan_id,
        )
        created_flight = await self.flight_repository.save(flight=create_flight_data)

        if flight_data.expense:
            expense = Expense(
                amount=flight_data.expense.amount,
                category=flight_data.expense.category,
                description=flight_data.expense.description,
                ex_date=flight_data.expense.ex_date,
                plan_id=created_flight.plan_id,
            )
            created_expense = await self.expense_repository.save(expense=expense)
            created_flight.expense = created_expense
            created_expense.flight_id = created_flight.id

        return FlightRead.model_validate(created_flight)

    async def read_flight(self, *, flight_id: int) -> FlightRead:
        flight = await self.flight_repository.find_by_id(flight_id=flight_id)

        if not flight:
            raise HTTPException(
                status_code=400, detail="해당 항공편을 찾을 수 없습니다."
            )

        return FlightRead.model_validate(flight)

    async def read_flights_by_plan(self, *, plan_id: int) -> list[FlightRead]:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")

        flights = await self.flight_repository.find_all_by_plan(plan_id=plan_id)
        flights_list = [FlightRead.model_validate(flight) for flight in flights]

        return flights_list

    async def update(self, *, flight_id: int, update_data: FlightUpdate) -> FlightRead:
        flight = await self.flight_repository.find_by_id(flight_id=flight_id)
        if not flight:
            raise HTTPException(
                status_code=404, detail="해당 항공편을 찾을 수 없습니다."
            )
        if flight.plan.owner_id != self.current_user.id:
            raise HTTPException(
                status_code=400, detail="해당 항공편에 대한 수정 권한이 없습니다."
            )

        if update_data.airline:
            flight.airline = update_data.airline
        if update_data.flight_number:
            flight.flight_number = update_data.flight_number
        if update_data.departure_airport:
            flight.departure_airport = update_data.departure_airport
        if update_data.arrival_airport:
            flight.arrival_airport = update_data.arrival_airport
        if update_data.departure_time:
            flight.departure_time = update_data.departure_time
        if update_data.arrival_time:
            flight.arrival_time = update_data.arrival_time
        if update_data.seat_class:
            flight.seat_class = update_data.seat_class
        if update_data.seat_number:
            flight.seat_number = update_data.seat_number
        if update_data.duration:
            flight.duration = update_data.duration
        if update_data.memo:
            flight.memo = update_data.memo

        updated_flight = await self.flight_repository.save(flight=flight)

        return FlightRead.model_validate(updated_flight)

    async def delete(self, *, flight_id: int) -> None:
        flight = await self.flight_repository.find_by_id(flight_id=flight_id)
        if not flight:
            raise HTTPException(status_code=400, detail="항공편을 찾을 수 없습니다.")
        if flight.plan.owner_id != self.current_user.id:
            raise HTTPException(
                status_code=400, detail="해당 항공편 삭제에 대한 권한이 없습니다."
            )

        await self.flight_repository.remove(flight_id=flight_id)
