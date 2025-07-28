from datetime import date
from typing import Optional

from app.expenses.schemas import ExpenseBase, ExpenseRead
from app.schemas import APISchema

# from .models import Accommodation


class AccommodationBase(APISchema):
    name: str
    address: str
    start_date: date
    end_date: date
    memo: Optional[str] = None


class AccommodationCreate(AccommodationBase):
    plan_id: int
    expense: ExpenseBase


class AccommodationRead(AccommodationBase):
    id: int
    expense: ExpenseRead | None = None


class AccommodationUpdate(APISchema):
    name: Optional[str] = None
    address: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_price: Optional[int] = None
    memo: Optional[str] = None
