from fastapi import status

from app.core.router import create_router

from .schemas import PlanCreate, PlanRead
from .service import PlanService

router = create_router()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_service: PlanService,
    plan_data: PlanCreate,
) -> PlanRead:
    return await plan_service.create(plan_data=plan_data)
