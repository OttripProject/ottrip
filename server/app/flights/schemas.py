from datetime import datetime

from app.expenses.schemas import ExpenseBase, ExpenseRead, ExpenseUpdate
from app.schemas import APISchema


class FlightBase(APISchema):
    airline: str
    flight_number: str
    departure_airport: str
    arrival_airport: str
    departure_time: datetime
    arrival_time: datetime
    seat_class: str
    seat_number: str
    duration: str | None = None
    memo: str | None = None


class FlightCreate(FlightBase):
    plan_id: int
    expense: ExpenseBase


class FlightRead(FlightBase):
    id: int
    expense: ExpenseRead | None = None


class FlightUpdate(APISchema):
    departure_time: datetime | None = None
    arrival_time: datetime | None = None
    airline: str | None = None
    flight_number: str | None = None
    departure_airport: str | None = None
    arrival_airport: str | None = None
    seat_class: str | None = None
    seat_number: str | None = None
    duration: str | None = None
    memo: str | None = None
    expense: ExpenseUpdate | None = None
