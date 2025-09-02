from datetime import date

from app.expenses.schemas import ExpenseRead
from app.flights.schemas import FlightRead
from app.itinerary.schemas import ItineraryRead
from app.schemas import APISchema
from .models import Role


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


class ShareCreate(APISchema):
    user_id: int
    role: Role  # editor, viewer


class ShareRead(APISchema):
    user_id: int
    role: Role


class InvitationCreate(APISchema):
    email: str
    role: Role
    expires_days: int | None = 7


class InvitationPreview(APISchema):
    plan_id: int
    email: str
    role: int
    expires_at: str | None
