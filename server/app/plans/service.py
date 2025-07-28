from fastapi import HTTPException

from app.auth.deps import CurrentUser
from app.users.repository import UserRepository
from app.utils.dependency import dependency

from .models import Plan
from .repository import PlanRepository
from .schemas import (
    PlanCreate,
    PlanRead,
    PlanReadWithInforms,
    PlansReadByUser,
    PlanUpdate,
)


@dependency
class PlanService:
    current_user: CurrentUser
    plan_repository: PlanRepository
    user_repository: UserRepository

    async def create(self, *, plan_data: PlanCreate) -> PlanRead:
        create_plan_data = Plan(
            title=plan_data.title,
            start_date=plan_data.start_date,
            end_date=plan_data.end_date,
            owner_id=self.current_user.id,
        )

        created_plan = await self.plan_repository.save(plan=create_plan_data)

        return PlanRead.model_validate(created_plan)

    async def read_plan(self, *, plan_id: int) -> PlanReadWithInforms:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)

        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")

        return PlanReadWithInforms.model_validate(plan)

    async def read_plans_by_user(self) -> PlansReadByUser:
        user = await self.user_repository.find_by_id(user_id=self.current_user.id)
        if not user:
            raise HTTPException(status_code=400, detail="사용자를 찾을 수 없습니다.")

        plans = await self.plan_repository.find_all_by_user(
            user_id=self.current_user.id
        )
        plans_list = [PlanRead.model_validate(plan) for plan in plans]

        return PlansReadByUser(plans=plans_list)

    async def delete(self, *, plan_id: int) -> None:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="해당 계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            raise HTTPException(
                status_code=400, detail="해당 계획 삭제 권한이 없습니다."
            )

        await self.plan_repository.remove(plan_id=plan_id)

    async def update(self, *, plan_id: int, update_data: PlanUpdate) -> PlanRead:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            raise HTTPException(status_code=400, detail="계획 수정 권한이 없습니다.")

        if update_data.title:
            plan.title = update_data.title
        if update_data.start_date:
            plan.start_date = update_data.start_date
        if update_data.end_date:
            plan.end_date = update_data.end_date

        updated_plan = await self.plan_repository.save(plan=plan)

        return PlanRead.model_validate(updated_plan)
