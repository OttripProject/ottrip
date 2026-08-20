from fastapi import HTTPException

from app.core.router import create_router
from app.database.deps import SessionDep

from .repository import create_location, update_location
from .schemas import LocationCreate, LocationRead, LocationUpdate

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


@router.put("/{location_id}", response_model=LocationRead)
async def update_location_endpoint(
    location_id: int,
    data: LocationUpdate,
    session: SessionDep,
) -> LocationRead:
    location = await update_location(session, location_id, data)
    if not location:
        raise HTTPException(status_code=404, detail="Location을 찾을 수 없습니다.")
    await session.commit()
    await session.refresh(location)
    return LocationRead.model_validate(location)
