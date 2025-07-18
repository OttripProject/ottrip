from datetime import date

# from pydantic import Field
from app.expenses.schemas import ExpenseRead
from app.flights.schemas import FlightRead
from app.itinerary.schemas import ItineraryRead
from app.schemas import APISchema


class PlanBase(APISchema):
    title: str
    start_date: date
    end_date: date


class PlanCreate(PlanBase):
    pass


class PlanUpdate(PlanBase):
    pass


class PlanRead(PlanBase):
    id: int
    flights: list[FlightRead] | None
    itineraries: list[ItineraryRead] | None
    expenses: list[ExpenseRead] | None
