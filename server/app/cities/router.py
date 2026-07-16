from fastapi import Query

from app.core.router import create_router
from app.database.deps import SessionDep

from .repository import search_cities
from .schemas import CityResponse

router = create_router()


@router.get("/cities", response_model=list[CityResponse])
async def get_cities(
    session: SessionDep,
    q: str | None = Query(default=None),
    iso2: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
) -> list[CityResponse]:
    cities = await search_cities(session, q=q, iso2=iso2, skip=skip, limit=limit)
    return [CityResponse.model_validate(c) for c in cities]
