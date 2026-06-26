from datetime import date

from pydantic import Field

from app.accomodation.schemas import AccommodationRead
from app.expenses.schemas import ExpenseRead
from app.flights.schemas import FlightRead
from app.itinerary.schemas import ItineraryRead
from app.schemas import APISchema

from .models import Role


class PlanSegmentBase(APISchema):
    country: str
    city: str
    start_date: date
    end_date: date


class PlanSegmentCreate(PlanSegmentBase):
    pass


class PlanSegmentRead(PlanSegmentBase):
    id: int
    order_index: int


class PlanBase(APISchema):
    title: str = Field(..., max_length=50)
    memo: str = ""


class PlanCreate(PlanBase):
    segments: list[PlanSegmentCreate]


class PlanUpdate(APISchema):
    title: str | None = Field(None, max_length=50)
    segments: list[PlanSegmentCreate] | None = None


class PlanRead(PlanBase):
    id: int
    public_id: str
    start_date: date
    end_date: date
    segments: list[PlanSegmentRead] = []


class PlanReadWithInforms(PlanRead):
    flights: list[FlightRead] | None
    itineraries: list[ItineraryRead] | None
    expenses: list[ExpenseRead] | None
    accommodations: list[AccommodationRead] | None
    my_role: Role | None = None


class PlansReadByUser(APISchema):
    plans: list[PlanRead]


class ShareCreate(APISchema):
    user_id: int
    role: Role  # editor, viewer


class ShareUpdate(APISchema):
    handle: str
    role: Role  # editor, viewer


class ShareRead(APISchema):
    handle: str
    role: Role | None = None
    nickname: str
    email: str


class InvitationCreate(APISchema):
    email: str
    role: Role
    expires_days: int | None = 7


class PlanMemoUpdate(APISchema):
    memo: str = ""


class InvitationPreview(APISchema):
    plan_id: int
    email: str
    role: int
    expires_at: str | None
