from fastapi import status

from app.core.router import create_router

from .schemas import PlanCreate, PlanRead, PlanReadWithInforms, PlansReadByUser
from .service import PlanService

router = create_router()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_service: PlanService,
    plan_data: PlanCreate,
) -> PlanRead:
    return await plan_service.create(plan_data=plan_data)


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
