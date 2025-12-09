from datetime import date

from decimal import Decimal
from typing import Annotated

from pydantic import Field

from app.schemas import APISchema

from .models import ExpenseCategory, ExpenseCurrency


class ExpenseBase(APISchema):
    ex_date: date
    amount: Annotated[Decimal, Field(ge=0, max_digits=20, decimal_places=2)]
    category: ExpenseCategory
    currency: ExpenseCurrency
    description: str | None = None


class ExpenseCreate(ExpenseBase):
    plan_id: int


class ExpenseCreateWithFlight(ExpenseCreate):
    flight_id: int


class ExpenseCreateWithItinerary(ExpenseCreate):
    itinerary_id: int | None = None


class ExpenseBatchCreate(APISchema):
    """여러 지출을 한 번에 생성하기 위한 스키마"""
    plan_id: int
    itinerary_id: int | None = None
    flight_id: int | None = None
    accommodation_id: int | None = None
    expenses: list[ExpenseBase] = Field(min_length=1)


class ExpenseRead(ExpenseBase):
    id: int
    itinerary_id: int | None = None
    flight_id: int | None = None
    accommodation_id: int | None = None


class ExpenseUpdate(APISchema):
    ex_date: date | None = None
    amount: int | None = None
    category: ExpenseCategory | None = None
    currency: ExpenseCurrency | None = None
    description: str | None = None
