import asyncio

from fastapi import HTTPException, Query, status

from app.core.router import create_router
from app.itinerary.repository import ItineraryRepository
from app.plans.repository import PlanRepository

from . import service
from .schemas import FestivalItem, NearbyAttraction, TourismDetail

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
    area_cd = str(keyword_result.get("lDongRegnCd") or "") if keyword_result else ""
    signgu_cd = (
        area_cd + str(keyword_result.get("lDongSignguCd") or "")
        if keyword_result
        else ""
    )

    async def _get_related() -> list[NearbyAttraction]:
        if not area_cd or not signgu_cd:
            return []
        return await service.get_related_attractions(
            keyword=location.name, area_cd=area_cd, signgu_cd=signgu_cd
        )

    def _is_valid_korea_coords(lat: float, lng: float) -> bool:
        return 33.0 <= lat <= 38.9 and 124.0 <= lng <= 132.0

    async def _get_location_based() -> list[NearbyAttraction]:
        if not _is_valid_korea_coords(location.latitude, location.longitude):
            return []
        return await service.get_location_based_attractions(
            mapx=location.longitude,
            mapy=location.latitude,
            area_cd=area_cd,
            signgu_cd=signgu_cd,
        )

    related, location_based = await asyncio.gather(
        _get_related(), _get_location_based()
    )

    seen_titles = {a.title for a in related}
    return list(related) + [a for a in location_based if a.title not in seen_titles]


@router.get(
    "/festivals/{plan_id}",
    status_code=status.HTTP_200_OK,
    tags=["Tourism"],
)
async def get_festivals_for_plan(
    plan_id: int,
    plan_repository: PlanRepository,
    itinerary_repository: ItineraryRepository,
) -> list[FestivalItem]:
    plan = await plan_repository.find_by_id_only_plan(plan_id=plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="플랜을 찾을 수 없습니다.")

    itineraries = await itinerary_repository.find_all_by_plan(plan_id=plan_id)
    locations = [
        (
            it.location.latitude,
            it.location.longitude,
            str(it.itinerary_date),
            it.location.name,
        )
        for it in itineraries
        if it.location and it.location.latitude and it.location.longitude
    ]

    return await service.get_festivals_near_itineraries(
        plan_start=str(plan.start_date),
        plan_end=str(plan.end_date),
        locations=locations,
    )


@router.get(
    "/detail",
    status_code=status.HTTP_200_OK,
    tags=["Tourism"],
)
async def get_tourism_detail(
    name: str | None = Query(None),
    content_id: str | None = Query(None),
    content_type_id: str | None = Query(None),
) -> TourismDetail:
    if not name and not content_id:
        raise HTTPException(
            status_code=422, detail="name 또는 content_id가 필요합니다."
        )
    detail = await service.get_tourism_detail(
        name=name,
        content_id=content_id,
        content_type_id=content_type_id,
    )
    if not detail:
        raise HTTPException(status_code=404, detail="관광지 정보를 찾을 수 없습니다.")
    return detail
