from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from pydantic import Field

from app.accomodation.schemas import AccommodationRead
from app.expenses.models import ExpenseCategory, ExpenseCurrency
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


# --- Export ---


class ExportSegment(APISchema):
    country: str
    city: str
    start_date: date
    end_date: date
    order_index: int


class ExportItinerary(APISchema):
    id: int
    title: str
    country: str | None = None
    city: str | None = None
    location: str | None = None
    location_latitude: float | None = None
    location_longitude: float | None = None
    location_has_coords: bool | None = None
    itinerary_date: date
    start_time: time
    end_time: time


class ExportFlightSegment(APISchema):
    order: int
    departure_airport: str
    arrival_airport: str
    departure_time: datetime
    arrival_time: datetime


class ExportFlight(APISchema):
    id: int
    segments: list[ExportFlightSegment] = []


class ExportAccommodation(APISchema):
    id: int
    name: str
    checkin_date: date
    checkout_date: date
    checkin_time: time
    checkout_time: time
    location_name: str | None = None
    location_latitude: float | None = None
    location_longitude: float | None = None
    location_has_coords: bool | None = None


class ExportExpense(APISchema):
    category: ExpenseCategory
    amount: Decimal
    currency: ExpenseCurrency
    description: str | None = None
    ex_date: date
    itinerary_id: int | None = None
    flight_id: int | None = None
    accommodation_id: int | None = None


class ExportPlan(APISchema):
    title: str
    start_date: date
    end_date: date
    segments: list[ExportSegment] = []


class SnapshotData(APISchema):
    plan: ExportPlan
    itineraries: list[ExportItinerary] = []
    flights: list[ExportFlight] = []
    accommodations: list[ExportAccommodation] = []
    expenses: list[ExportExpense] | None = None
    checklist: dict[str, Any] | None = None


class PlanExportCreate(APISchema):
    include_expenses: bool = False
    include_checklist: bool = False


class PlanExportCreateResponse(APISchema):
    public_id: str


class PlanExportViewerResponse(APISchema):
    public_id: str
    snapshot: SnapshotData
    created_at: datetime


class PlanExportSaveResponse(APISchema):
    plan_public_id: str
