from datetime import date, time

from app.expenses.schemas import ExpenseBase, ExpenseRead, ExpenseUpdate
from app.schemas import APISchema
from pydantic import Field, model_validator


class AccommodationBase(APISchema):
    name: str = Field(..., max_length=10)
    place: str | None = Field(default=None, max_length=100)
    country: str
    city: str
    checkin_date: date
    checkout_date: date
    checkin_time: time
    checkout_time: time
    description: str | None = None

    @model_validator(mode="after")
    def validate_dates_times(self):
        if self.checkout_date < self.checkin_date:
            raise ValueError("체크아웃 날짜는 체크인 날짜 이후여야 합니다.")
        if self.checkout_date == self.checkin_date and self.checkout_time <= self.checkin_time:
            raise ValueError("같은 날짜에서는 체크아웃 시간이 체크인 시간보다 늦어야 합니다.")
        if self.checkin_time.minute % 15 != 0 or self.checkout_time.minute % 15 != 0:
            raise ValueError("체크인/아웃 시간은 15분 단위여야 합니다.")
        return self


class AccommodationCreate(AccommodationBase):
    plan_id: int
    expense: ExpenseBase


class AccommodationRead(AccommodationBase):
    id: int
    expense: ExpenseRead | None = None


class AccommodationUpdate(APISchema):
    name: str | None = Field(default=None, max_length=10)
    place: str | None = Field(default=None, max_length=100)
    country: str | None = None
    city: str | None = None
    checkin_date: date | None = None
    checkout_date: date | None = None
    checkin_time: time | None = None
    checkout_time: time | None = None
    description: str | None = None
    expense: ExpenseUpdate | None = None