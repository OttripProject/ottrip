from datetime import datetime

from app.schemas import APISchema


class LocationCreate(APISchema):
    name: str
    place_id: str
    latitude: float
    longitude: float
    address: str | None = None
    from_google: bool = True


class LocationUpdate(APISchema):
    name: str
    latitude: float
    longitude: float
    address: str | None = None


class LocationRead(APISchema):
    id: int
    name: str
    place_id: str
    latitude: float
    longitude: float
    address: str | None = None
    from_google: bool
    updated_at: datetime
