from fastapi import status

from app.core.router import create_router

from .schemas import ItineraryCreate, ItineraryRead, ItineraryUpdate
from .service import ItineraryService

router = create_router()


@router.get("/{itinerary_id}", status_code=status.HTTP_200_OK)
async def read_itinerary(
    itinerary_service: ItineraryService,
    itinerary_id: int,
) -> ItineraryRead:
    return await itinerary_service.read_itinerary(itinerary_id=itinerary_id)


@router.get("/{plan_id}/plan", status_code=status.HTTP_200_OK)
async def read_itineraries_by_plan(
    itinerary_service: ItineraryService,
    plan_id: int,
) -> list[ItineraryRead]:
    return await itinerary_service.read_itineraries_by_plan(plan_id=plan_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_itinerary(
    itinerary_service: ItineraryService,
    itinerary_data: ItineraryCreate,
) -> ItineraryRead:
    return await itinerary_service.create(itinerary_data=itinerary_data)


@router.patch("/{itinerary_id}", status_code=status.HTTP_200_OK)
async def update_itinerary(
    itinerary_service: ItineraryService,
    itinerary_id: int,
    update_data: ItineraryUpdate,
) -> ItineraryRead:
    return await itinerary_service.update(
        itinerary_id=itinerary_id, update_data=update_data
    )


@router.delete("/{itinerary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_itinerary(
    itinerary_service: ItineraryService,
    itinerary_id: int,
) -> None:
    await itinerary_service.delete(itinerary_id=itinerary_id)
