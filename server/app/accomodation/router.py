from fastapi import status

from app.core.router import create_router

from .schemas import AccommodationCreate, AccommodationRead, AccommodationUpdate
from .service import AccommodationService

router = create_router()


@router.get("/{accommodation_id}", status_code=status.HTTP_200_OK)
async def read_accommodation(
    accommodation_service: AccommodationService,
    accommodation_id: int,
) -> AccommodationRead:
    """
    특정 숙소 정보를 조회합니다.
    """
    return await accommodation_service.read_accommodation(
        accommodation_id=accommodation_id
    )


@router.get("/{plan_id}/plan", status_code=status.HTTP_200_OK)
async def read_accommodations(
    accommodation_service: AccommodationService,
    plan_id: int,
) -> list[AccommodationRead]:
    """
    특정 여행에 속한 모든 숙소 정보를 조회합니다.
    """
    return await accommodation_service.read_accommodations_by_plan(plan_id=plan_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_accommodation(
    accommodation_service: AccommodationService,
    accommodation_data: AccommodationCreate,
) -> AccommodationRead:
    """
    새로운 숙소 정보를 생성합니다.
    """
    return await accommodation_service.create(accommodation_data=accommodation_data)


@router.patch("/{accommodation_id}", status_code=status.HTTP_200_OK)
async def update_accommodation(
    accommodation_service: AccommodationService,
    accommodation_id: int,
    update_data: AccommodationUpdate,
) -> AccommodationRead:
    """
    기존 숙소 정보를 수정합니다.
    """
    return await accommodation_service.update(
        accommodation_id=accommodation_id, update_data=update_data
    )


@router.delete("/{accommodation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_accommodation(
    accommodation_service: AccommodationService,
    accommodation_id: int,
) -> None:
    """
    특정 숙소 정보를 삭제합니다.
    """
    await accommodation_service.delete(accommodation_id=accommodation_id)
