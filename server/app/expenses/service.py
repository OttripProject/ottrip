# from fastapi import HTTPException

from app.auth.deps import CurrentUser
from app.utils.dependency import dependency

# from .models import Expense
from .repository import ExpenseRepository

# from .schemas import ExpenseCreate, ExpenseCreateWithFlight, ExpenseRead


@dependency
class ExpenseService:
    current_user: CurrentUser
    expense_repository: ExpenseRepository

    # async def create(self, *, expense_data: ExpenseCreate) -> ExpenseRead:
    #     create_expense_data = Expense(
    #         amount=expense_data.amount,
    #         category=expense_data.category,
    #         description=expense_data.description,
    #         date=expense_data.date,
    #         plan_id=expense_data.plan_id,
    #     )
    #     created_expense = await self.expense_repository.save(
    #         expense=create_expense_data
    #     )

    #     return ExpenseRead.model_validate(created_expense)

    # async def read_expense(self, *, expense_id: int) -> ExpenseRead:
    #     expense = await self.expense_repository.find_by_id(expense_id=expense_id)

    #     if not expense:
    #         raise HTTPException(status_code=404, detail="해당 비용을 찾을 수 없습니다.")

    #     return ExpenseRead.model_validate(expense)
