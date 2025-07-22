from datetime import date

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


class PlanUpdate(APISchema):
    title: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class PlanRead(PlanBase):
    id: int


class PlanReadWithInforms(PlanRead):
    flights: list[FlightRead] | None
    itineraries: list[ItineraryRead] | None
    expenses: list[ExpenseRead] | None


class PlansReadByUser(APISchema):
    plans: list[PlanRead]
