from app.schemas import APISchema


class CityResponse(APISchema):
    id: int
    city_ko: str | None
    city: str
    country_ko: str | None
    iso2: str | None
