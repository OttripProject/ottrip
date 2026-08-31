from sqlalchemy import select

from app.database.deps import SessionDep

from .models import Location
from .schemas import LocationCreate, LocationUpdate


async def get_location(session: SessionDep, location_id: int) -> Location | None:
    result = await session.execute(select(Location).where(Location.id == location_id))
    return result.scalar_one_or_none()


async def get_location_by_place_id(
    session: SessionDep, place_id: str
) -> Location | None:
    result = await session.execute(
        select(Location).where(Location.place_id == place_id)
    )
    return result.scalar_one_or_none()


async def create_location(session: SessionDep, data: LocationCreate) -> Location:
    if data.place_id:
        existing = await get_location_by_place_id(session, data.place_id)
        if existing:
            return existing

    location = Location(
        name=data.name,
        place_id=data.place_id,
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address,
        from_google=data.from_google,
        area_cd=data.area_cd,
        signgu_cd=data.signgu_cd,
    )
    session.add(location)
    await session.flush()
    return location


async def update_location(
    session: SessionDep, location_id: int, data: LocationUpdate
) -> Location | None:
    location = await get_location(session, location_id)
    if not location:
        return None

    location.name = data.name
    location.latitude = data.latitude
    location.longitude = data.longitude
    location.address = data.address

    await session.flush()
    return location
