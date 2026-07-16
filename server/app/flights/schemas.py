from datetime import datetime

from pydantic import Field

from app.expenses.schemas import ExpenseCreate, ExpenseRead, ExpenseUpdate
from app.schemas import APISchema


class FlightBase(APISchema):
    reservation_number: str | None = None
    passenger_name: str | None = None
    ticket_number: str | None = None
    booking_reference: str | None = None


class FlightCreate(FlightBase):
    plan_id: int
    segments: list["FlightSegmentBase"] = Field(min_length=1)
    expense: ExpenseCreate | None = None


class FlightRead(FlightBase):
    id: int
    expense: ExpenseRead | None = None
    # ORM 속성명을 맞춰 중첩 세그먼트를 직렬화 (JSON에선 flightSegments)
    flight_segments: list["FlightSegmentRead"] | None = None


class FlightUpdate(APISchema):
    reservation_number: str | None = None
    passenger_name: str | None = None
    ticket_number: str | None = None
    booking_reference: str | None = None
    expense: ExpenseUpdate | None = None
    segments: list["FlightSegmentBase"] | None = None


class FlightSegmentBase(APISchema):
    id: int | None = None  # 업데이트 시 기존 segment id
    airline: str | None = None
    flight_number: str | None = None
    departure_airport: str
    arrival_airport: str
    departure_time: datetime
    arrival_time: datetime
    seat_class: str | None = None
    seat_number: str | None = None
    gate: str | None = None
    terminal: str | None = None


class FlightSegmentCreate(FlightSegmentBase):
    flight_id: int


class FlightSegmentRead(FlightSegmentBase):
    id: int
    order: int


class FlightSegmentUpdate(APISchema):
    airline: str | None = None
    flight_number: str | None = None
    departure_airport: str | None = None
    arrival_airport: str | None = None
    departure_time: datetime | None = None
    arrival_time: datetime | None = None
    seat_class: str | None = None
    seat_number: str | None = None
    gate: str | None = None
    terminal: str | None = None
