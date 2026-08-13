from app.core.router import create_router
from app.database.deps import SessionDep

from .repository import create_location
from .schemas import LocationCreate, LocationRead

router = create_router()


@router.post("", response_model=LocationRead, status_code=201)
async def create_location_endpoint(
    data: LocationCreate,
    session: SessionDep,
) -> LocationRead:
    location = await create_location(session, data)
    await session.commit()
    await session.refresh(location)
    return LocationRead.model_validate(location)
