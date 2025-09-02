from fastapi import HTTPException

from app.auth.deps import CurrentUser
from app.itinerary.repository import ItineraryRepository
from app.plans.repository import PlanRepository
from app.utils.dependency import dependency

from .models import Expense
from .repository import ExpenseRepository
from .schemas import ExpenseCreate, ExpenseRead, ExpenseUpdate


@dependency
class ExpenseService:
    current_user: CurrentUser
    expense_repository: ExpenseRepository
    itinerary_repository: ItineraryRepository
    plan_repository: PlanRepository

    async def create(self, *, expense_data: ExpenseCreate) -> ExpenseRead:
        plan = await self.plan_repository.find_by_id(plan_id=expense_data.plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=expense_data.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(status_code=400, detail="해당 비용에 대한 생성 권한이 없습니다.")
        create_expense_data = Expense(
            amount=expense_data.amount,
            category=expense_data.category,
            currency=expense_data.currency,
            description=expense_data.description,
            ex_date=expense_data.ex_date,
            plan_id=expense_data.plan_id,
        )
        created_expense = await self.expense_repository.save(
            expense=create_expense_data
        )
        # 선택적으로 일정/항공과 연결
        itinerary_id = getattr(expense_data, "itinerary_id", None)
        if itinerary_id:
            created_expense.itinerary_id = itinerary_id
        flight_id = getattr(expense_data, "flight_id", None)
        if flight_id:
            created_expense.flight_id = flight_id

        return ExpenseRead.model_validate(created_expense)

    async def read_expense(self, *, expense_id: int) -> ExpenseRead:
        expense = await self.expense_repository.find_by_id(expense_id=expense_id)

        if not expense:
            raise HTTPException(status_code=404, detail="해당 비용을 찾을 수 없습니다.")

        return ExpenseRead.model_validate(expense)

    async def read_expenses_by_plan(self, *, plan_id: int) -> list[ExpenseRead]:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")

        expenses = await self.expense_repository.find_all_by_plan(plan_id=plan_id)
        expenses_list = [ExpenseRead.model_validate(expense) for expense in expenses]

        return expenses_list

    async def read_expenses_by_itinerary(
        self, *, itinerary_id: int
    ) -> list[ExpenseRead]:
        itinerary = await self.itinerary_repository.find_by_id(
            itinerary_id=itinerary_id
        )
        if not itinerary:
            raise HTTPException(status_code=404, detail="해당 일정을 찾을 수 없습니다.")

        expenses = await self.expense_repository.find_all_by_itinerary(
            itinerary_id=itinerary_id
        )
        expenses_list = [ExpenseRead.model_validate(expense) for expense in expenses]

        return expenses_list

    async def update(
        self, *, expense_id: int, update_data: ExpenseUpdate
    ) -> ExpenseRead:
        expense = await self.expense_repository.find_by_id(expense_id=expense_id)
        if not expense:
            raise HTTPException(status_code=404, detail="해당 비용을 찾을 수 없습니다.")
        if expense.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=expense.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=400, detail="해당 비용에 대한 수정 권한이 없습니다."
                )

        if update_data.amount:
            expense.amount = update_data.amount
        if update_data.category:
            expense.category = update_data.category
        if update_data.description:
            expense.description = update_data.description
        if update_data.ex_date:
            expense.ex_date = update_data.ex_date
        if update_data.currency:
            expense.currency = update_data.currency

        updated_expense = await self.expense_repository.save(expense=expense)

        return ExpenseRead.model_validate(updated_expense)

    async def delete(self, *, expense_id: int) -> None:
        expense = await self.expense_repository.find_by_id(expense_id=expense_id)
        if not expense:
            raise HTTPException(status_code=404, detail="해당 비용을 찾을 수 없습니다.")
        if expense.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=expense.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=400, detail="해당 비용에 대한 수정 권한이 없습니다."
                )

        await self.expense_repository.remove(expense_id=expense_id)
