from datetime import datetime

from app.schemas import APISchema


class LocationCreate(APISchema):
    name: str
    place_id: str
    latitude: float
    longitude: float
    address: str | None = None
    from_google: bool = True
    area_cd: str | None = None
    signgu_cd: str | None = None


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
    area_cd: str | None = None
    signgu_cd: str | None = None
    updated_at: datetime
