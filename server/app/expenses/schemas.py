from datetime import date

from app.schemas import APISchema

from .models import ExpenseCategory, ExpenseCurrency


class ExpenseBase(APISchema):
    ex_date: date
    amount: int
    category: ExpenseCategory
    currency: ExpenseCurrency
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


class ExpenseUpdate(APISchema):
    ex_date: date | None = None
    amount: int | None = None
    category: ExpenseCategory | None = None
    currency: ExpenseCurrency | None = None
    description: str | None = None
