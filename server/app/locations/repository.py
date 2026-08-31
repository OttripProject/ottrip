from sqlalchemy import select

from app.database.deps import SessionDep

from .models import Location
from .schemas import LocationCreate, LocationUpdate


async def get_location(session: SessionDep, location_id: int) -> Location | None:
    result = await session.execute(select(Location).where(Location.id == location_id))
    return result.scalar_one_or_none()


async def delete_location(session: SessionDep, location_id: int) -> None:
    location = await get_location(session, location_id)
    if location:
        await session.delete(location)


async def create_location(session: SessionDep, data: LocationCreate) -> Location:
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
    if data.place_id is not None:
        location.place_id = data.place_id
    if data.from_google is not None:
        location.from_google = data.from_google
    if data.area_cd is not None:
        location.area_cd = data.area_cd
    if data.signgu_cd is not None:
        location.signgu_cd = data.signgu_cd

    await session.flush()
    return location
