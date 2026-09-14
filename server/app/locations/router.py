from fastapi import HTTPException

from app.core.router import create_router
from app.database.deps import SessionDep
from app.tourism import service as tourism_service

from .repository import create_location, update_location
from .schemas import LocationCreate, LocationRead, LocationUpdate

router = create_router()


async def _fetch_area_codes(
    name: str, lat: float | None = None, lng: float | None = None
) -> tuple[str | None, str | None]:
    """장소명+좌표로 KOR_SERVICE2 검색 → (area_cd, signgu_cd) 반환. 실패 시 (None, None)."""
    try:
        return await tourism_service.find_area_codes(name, lat, lng)
    except Exception:
        return None, None


@router.post("", response_model=LocationRead, status_code=201)
async def create_location_endpoint(
    data: LocationCreate,
    session: SessionDep,
) -> LocationRead:
    # area_cd/signgu_cd가 없으면 KOR_SERVICE2로 조회 (실패해도 저장은 진행)
    if not data.area_cd or not data.signgu_cd:
        area_cd, signgu_cd = await _fetch_area_codes(
            data.name, data.latitude, data.longitude
        )
        data = data.model_copy(update={"area_cd": area_cd, "signgu_cd": signgu_cd})

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
    if not data.area_cd or not data.signgu_cd:
        area_cd, signgu_cd = await _fetch_area_codes(
            data.name, data.latitude, data.longitude
        )
        data = data.model_copy(update={"area_cd": area_cd, "signgu_cd": signgu_cd})

    location = await update_location(session, location_id, data)
    if not location:
        raise HTTPException(status_code=404, detail="Location을 찾을 수 없습니다.")
    await session.commit()
    await session.refresh(location)
    return LocationRead.model_validate(location)
