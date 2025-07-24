from fastapi import HTTPException

from app.auth.deps import CurrentUser
from app.utils.dependency import dependency

from .models import Expense
from .repository import ExpenseRepository
from .schemas import ExpenseCreate, ExpenseRead, ExpenseUpdate


@dependency
class ExpenseService:
    current_user: CurrentUser
    expense_repository: ExpenseRepository

    async def create(self, *, expense_data: ExpenseCreate) -> ExpenseRead:
        create_expense_data = Expense(
            amount=expense_data.amount,
            category=expense_data.category,
            description=expense_data.description,
            ex_date=expense_data.ex_date,
            plan_id=expense_data.plan_id,
        )
        created_expense = await self.expense_repository.save(
            expense=create_expense_data
        )

        return ExpenseRead.model_validate(created_expense)

    async def read_expense(self, *, expense_id: int) -> ExpenseRead:
        expense = await self.expense_repository.find_by_id(expense_id=expense_id)

        if not expense:
            raise HTTPException(status_code=404, detail="해당 비용을 찾을 수 없습니다.")

        return ExpenseRead.model_validate(expense)

    async def read_expenses_by_plan(self, *, plan_id: int) -> list[ExpenseRead]:
        expenses = await self.expense_repository.find_all_by_plan(plan_id=plan_id)
        expenses_list = [ExpenseRead.model_validate(expense) for expense in expenses]

        return expenses_list

    async def update(
        self, *, expense_id: int, update_data: ExpenseUpdate
    ) -> ExpenseRead:
        expense = await self.expense_repository.find_by_id(expense_id=expense_id)
        if not expense:
            raise HTTPException(status_code=404, detail="해당 비용을 찾을 수 없습니다.")
        if expense.plan.owner_id != self.current_user.id:
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

        updated_expense = await self.expense_repository.save(expense=expense)

        return ExpenseRead.model_validate(updated_expense)

    async def delete(self, *, expense_id: int) -> None:
        expense = await self.expense_repository.find_by_id(expense_id=expense_id)
        if not expense:
            raise HTTPException(status_code=404, detail="해당 비용을 찾을 수 없습니다.")
        if expense.plan.owner_id != self.current_user.id:
            raise HTTPException(
                status_code=400, detail="해당 비용에 대한 삭제 권한이 없습니다."
            )

        await self.expense_repository.remove(expense_id=expense_id)
