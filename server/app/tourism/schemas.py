from app.schemas import APISchema


class NearbyAttraction(APISchema):
    content_id: str
    content_type_id: str
    title: str
    image_url: str | None = None
    address: str | None = None


class TourismDetail(APISchema):
    content_id: str
    content_type_id: str | None = None
    title: str | None = None
    address: str | None = None
    homepage: str | None = None
    tel: str | None = None
    overview: str | None = None
    image_url: str | None = None
