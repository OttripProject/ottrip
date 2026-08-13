from app.schemas import APISchema


class LocationCreate(APISchema):
    name: str
    place_id: str
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
