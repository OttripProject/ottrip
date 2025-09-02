from datetime import datetime

from app.schemas import APISchema


class ItineraryBase(APISchema):
    title: str
    start_time: datetime
    end_time: datetime


class ItineraryCreate(ItineraryBase):
    pass


class ItineraryRead(ItineraryBase):
    id: int
