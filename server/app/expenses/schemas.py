from datetime import date

from app.schemas import APISchema

from .models import ExpenseCategory

# 날짜, 금액, 카테고리, 메모


class ExpenseBase(APISchema):
    date: date
    amount: int
    category: ExpenseCategory
    description: str | None = None


class ExpenseCreate(ExpenseBase):
    plan_id: int


class ExpenseCreateWithFlight(ExpenseCreate):
    flight_id: int | None = None
    category: ExpenseCategory = ExpenseCategory.FLIGHT


class ExpenseCreateWithItinerary(ExpenseCreate):
    itinerary_id: int | None = None


class ExpenseRead(ExpenseBase):
    id: int
