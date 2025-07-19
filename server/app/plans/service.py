from fastapi import HTTPException

from app.auth.deps import CurrentUser
from app.utils.dependency import dependency

from .models import Plan
from .repository import PlanRepository
from .schemas import PlanCreate, PlanRead


@dependency
class PlanService:
    current_user: CurrentUser
    plan_repository: PlanRepository

    async def create(self, *, plan_data: PlanCreate) -> PlanRead:
        create_plan_data = Plan(
            title=plan_data.title,
            start_date=plan_data.start_date,
            end_date=plan_data.end_date,
            owner_id=self.current_user.id,
        )

        created_plan = await self.plan_repository.save(plan=create_plan_data)

        return PlanRead.model_validate(created_plan)

    async def read_plan(self, *, plan_id: int) -> PlanRead:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)

        if not plan:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")

        return PlanRead.model_validate(plan)
