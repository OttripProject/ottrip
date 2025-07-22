from datetime import date, time

from app.expenses.schemas import ExpenseRead
from app.schemas import APISchema


# - 입력 항목: 제목 / 시작~종료 시간 / 상세 내용 / 국가·도시 / 지출 항목
class ItineraryBase(APISchema):
    title: str
    itinerary_date: date
    start_time: time
    end_time: time
    description: str | None = None
    country: str | None = None
    city: str | None = None
    location: str | None = None


class ItineraryCreate(ItineraryBase):
    plan_id: int


class ItineraryRead(ItineraryBase):
    id: int
    expenses: list[ExpenseRead] | None = None


class ItineraryUpdate(APISchema):
    title: str | None = None
    itinerary_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    description: str | None = None
    country: str | None = None
    city: str | None = None
    location: str | None = None
