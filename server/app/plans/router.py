from fastapi import status

from app.core.router import create_router

from .schemas import (
    PlanCreate,
    PlanRead,
    PlanReadWithInforms,
    PlansReadByUser,
    PlanUpdate,
)
from .service import PlanService

router = create_router()


@router.get("/{plan_id}", status_code=status.HTTP_200_OK)
async def read_plan(
    plan_service: PlanService,
    plan_id: int,
) -> PlanReadWithInforms:
    return await plan_service.read_plan(plan_id=plan_id)


@router.get("/{user_id}/user", status_code=status.HTTP_200_OK)
async def read_user_plans(
    plan_service: PlanService,
    user_id: int,
) -> PlansReadByUser:
    return await plan_service.read_plans_by_user(user_id=user_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_service: PlanService,
    plan_data: PlanCreate,
) -> PlanRead:
    return await plan_service.create(plan_data=plan_data)


@router.patch("/{plan_id}", status_code=status.HTTP_200_OK)
async def update_plan(
    plan_service: PlanService,
    plan_id: int,
    update_data: PlanUpdate,
) -> PlanRead:
    return await plan_service.update(plan_id=plan_id, update_data=update_data)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_service: PlanService,
    plan_id: int,
) -> None:
    await plan_service.delete(plan_id=plan_id)
