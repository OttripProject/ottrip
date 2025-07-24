from fastapi import status

from app.core.router import create_router

from .schemas import ExpenseCreate, ExpenseRead, ExpenseUpdate
from .service import ExpenseService

router = create_router()


@router.get("/{expense_id}", status_code=status.HTTP_200_OK)
async def read_expense(
    expense_service: ExpenseService,
    expense_id: int,
) -> ExpenseRead:
    """
    특정 비용 정보를 조회합니다.
    """
    return await expense_service.read_expense(expense_id=expense_id)


@router.get("/{plan_id}/plan", status_code=status.HTTP_200_OK)
async def read_expenses(
    expense_service: ExpenseService,
    plan_id: int,
) -> list[ExpenseRead]:
    """
    특정 여행에 속한 모든 비용 정보를 조회합니다.
    """
    return await expense_service.read_expenses_by_plan(plan_id=plan_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_service: ExpenseService,
    expense_data: ExpenseCreate,
) -> ExpenseRead:
    """
    새로운 비용 정보를 생성합니다.
    """
    return await expense_service.create(expense_data=expense_data)


@router.patch("/{expense_id}", status_code=status.HTTP_200_OK)
async def update_expense(
    expense_service: ExpenseService,
    expense_id: int,
    update_data: ExpenseUpdate,
) -> ExpenseRead:
    """
    기존 비용 정보를 수정합니다.
    """
    return await expense_service.update(expense_id=expense_id, update_data=update_data)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_service: ExpenseService,
    expense_id: int,
) -> None:
    """
    특정 비용 정보를 삭제합니다.
    """
    await expense_service.delete(expense_id=expense_id)
