from datetime import datetime

from app.schemas import APISchema


class LocationCreate(APISchema):
    name: str
    place_id: str
    latitude: float
    longitude: float
    address: str | None = None
    has_coords: bool = True
    area_cd: str | None = None
    signgu_cd: str | None = None


class LocationUpdate(APISchema):
    name: str
    place_id: str | None = None
    latitude: float
    longitude: float
    address: str | None = None
    has_coords: bool | None = None
    area_cd: str | None = None
    signgu_cd: str | None = None


class LocationRead(APISchema):
    id: int
    name: str
    place_id: str
    latitude: float
    longitude: float
    address: str | None = None
    has_coords: bool
    area_cd: str | None = None
    signgu_cd: str | None = None
    updated_at: datetime
