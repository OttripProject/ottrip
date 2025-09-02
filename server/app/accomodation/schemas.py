from datetime import date

from app.expenses.schemas import ExpenseBase, ExpenseRead, ExpenseUpdate
from app.schemas import APISchema


class AccommodationBase(APISchema):
    name: str
    address: str
    start_date: date
    end_date: date
    memo: str | None = None


class AccommodationCreate(AccommodationBase):
    plan_id: int
    expense: ExpenseBase


class AccommodationRead(AccommodationBase):
    id: int
    expense: ExpenseRead | None = None


class AccommodationUpdate(APISchema):
    name: str | None = None
    address: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    memo: str | None = None
    expense: ExpenseUpdate | None = None
