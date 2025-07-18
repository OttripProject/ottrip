from datetime import datetime

from app.schemas import APISchema


class FlightBase(APISchema):
    title: str
    departure_time: datetime
    arrival_time: datetime


class FlightCreate(FlightBase):
    pass


class FlightRead(FlightBase):
    id: int
