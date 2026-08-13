from datetime import date, time

from app.expenses.schemas import ExpenseRead
from app.locations.schemas import LocationRead
from app.schemas import APISchema


class ItineraryBase(APISchema):
    title: str
    itinerary_date: date
    start_time: time
    end_time: time
    description: str | None = None
    country: str | None = None
    city: str | None = None


class ItineraryCreate(ItineraryBase):
    plan_id: int
    location_id: int | None = None


class ItineraryRead(ItineraryBase):
    id: int
    location: LocationRead | None = None
    expenses: list[ExpenseRead] | None = None


class ItineraryUpdate(APISchema):
    title: str | None = None
    itinerary_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    description: str | None = None
    country: str | None = None
    city: str | None = None
    location_id: int | None = None


class ItineraryAssistResponse(APISchema):
    packing: list[str]
    attractions: list[str]
    local_tips: list[str]
