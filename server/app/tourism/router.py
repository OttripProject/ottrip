from fastapi import HTTPException, Query, status

from app.core.router import create_router
from app.itinerary.repository import ItineraryRepository

from . import service
from .schemas import NearbyAttraction, TourismDetail

router = create_router()


@router.get(
    "/nearby/{itinerary_id}",
    status_code=status.HTTP_200_OK,
    tags=["Tourism"],
)
async def get_nearby_attractions(
    itinerary_id: int,
    itinerary_repository: ItineraryRepository,
) -> list[NearbyAttraction]:
    itinerary = await itinerary_repository.find_by_id(itinerary_id=itinerary_id)
    if not itinerary:
        raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다.")

    location = itinerary.location
    if not location:
        return []

    keyword_result = await service.search_kor_keyword(location.name)
    if not keyword_result:
        return []

    area_cd = str(keyword_result.get("lDongRegnCd") or "")
    signgu_cd = area_cd + str(keyword_result.get("lDongSignguCd") or "")
    if not area_cd or not signgu_cd:
        return []

    return await service.get_related_attractions(
        keyword=location.name, area_cd=area_cd, signgu_cd=signgu_cd
    )


@router.get(
    "/detail",
    status_code=status.HTTP_200_OK,
    tags=["Tourism"],
)
async def get_tourism_detail(
    name: str = Query(...),
) -> TourismDetail:
    detail = await service.get_tourism_detail_by_name(name=name)
    if not detail:
        raise HTTPException(status_code=404, detail="관광지 정보를 찾을 수 없습니다.")
    return detail
