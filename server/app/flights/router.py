from fastapi import status

from app.core.router import create_router

from .schemas import FlightCreate, FlightRead, FlightUpdate
from .service import FlightService

router = create_router()


@router.get("/{flight_id}", status_code=status.HTTP_200_OK)
async def read_flight(
    flight_service: FlightService,
    flight_id: int,
) -> FlightRead:
    """
    특정 항공편 정보를 조회합니다.
    """
    return await flight_service.read_flight(flight_id=flight_id)


@router.get("/{plan_id}/plan", status_code=status.HTTP_200_OK)
async def read_flights(
    flight_service: FlightService,
    plan_id: int,
) -> list[FlightRead]:
    """
    특정 여행에 속한 모든 항공편 정보를 조회합니다.
    """
    return await flight_service.read_flights_by_plan(plan_id=plan_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_flight(
    flight_service: FlightService,
    flight_data: FlightCreate,
) -> FlightRead:
    """
    새로운 항공편 정보를 생성합니다.
    """
    return await flight_service.create(flight_data=flight_data)


@router.patch("/{flight_id}", status_code=status.HTTP_200_OK)
async def update_flight(
    flight_service: FlightService,
    flight_id: int,
    update_data: FlightUpdate,
) -> FlightRead:
    """
    기존 항공편 정보를 수정합니다.
    """
    return await flight_service.update(flight_id=flight_id, update_data=update_data)


@router.delete("/{flight_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flight(
    flight_service: FlightService,
    flight_id: int,
) -> None:
    """
    특정 항공편 정보를 삭제합니다.
    """
    await flight_service.delete(flight_id=flight_id)
