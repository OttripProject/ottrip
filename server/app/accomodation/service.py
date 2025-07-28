from fastapi import HTTPException

from app.auth.deps import CurrentUser
from app.expenses.models import Expense
from app.expenses.repository import ExpenseRepository
from app.utils.dependency import dependency

from .models import Accommodation
from .repository import AccommodationRepository
from .schemas import AccommodationCreate, AccommodationRead, AccommodationUpdate


@dependency
class AccommodationService:
    current_user: CurrentUser
    accommodation_repository: AccommodationRepository
    expense_repository: ExpenseRepository

    async def create(
        self, *, accommodation_data: AccommodationCreate
    ) -> AccommodationRead:
        create_accommodation_data = Accommodation(
            name=accommodation_data.name,
            address=accommodation_data.address,
            start_date=accommodation_data.start_date,
            end_date=accommodation_data.end_date,
            memo=accommodation_data.memo,
            plan_id=accommodation_data.plan_id,
        )
        created_accommodation = await self.accommodation_repository.save(
            accommodation=create_accommodation_data
        )

        if accommodation_data.expense:
            expense = Expense(
                amount=accommodation_data.expense.amount,
                category=accommodation_data.expense.category,
                description=accommodation_data.expense.description,
                ex_date=accommodation_data.expense.ex_date,
                plan_id=created_accommodation.plan_id,
            )
            created_expense = await self.expense_repository.save(expense=expense)
            created_accommodation.expense = created_expense
            created_expense.accommodation_id = created_accommodation.id

        return AccommodationRead.model_validate(created_accommodation)

    async def read_accommodation(self, *, accommodation_id: int) -> AccommodationRead:
        accommodation = await self.accommodation_repository.find_by_id(
            accommodation_id=accommodation_id
        )

        if not accommodation:
            raise HTTPException(status_code=400, detail="해당 숙소를 찾을 수 없습니다.")

        return AccommodationRead.model_validate(accommodation)

    async def read_accommodations_by_plan(
        self, *, plan_id: int
    ) -> list[AccommodationRead]:
        accommodations = await self.accommodation_repository.find_all_by_plan(
            plan_id=plan_id
        )
        accommodations_list = [
            AccommodationRead.model_validate(accommodation)
            for accommodation in accommodations
        ]

        return accommodations_list

    async def update(
        self, *, accommodation_id: int, update_data: AccommodationUpdate
    ) -> AccommodationRead:
        accommodation = await self.accommodation_repository.find_by_id(
            accommodation_id=accommodation_id
        )
        if not accommodation:
            raise HTTPException(status_code=400, detail="해당 숙소를 찾을 수 없습니다.")
        if accommodation.plan.owner_id != self.current_user.id:
            raise HTTPException(
                status_code=400, detail="해당 숙소에 대한 수정 권한이 없습니다."
            )

        if update_data.name:
            accommodation.name = update_data.name
        if update_data.address:
            accommodation.address = update_data.address
        if update_data.start_date:
            accommodation.start_date = update_data.start_date
        if update_data.end_date:
            accommodation.end_date = update_data.end_date
        if update_data.memo:
            accommodation.memo = update_data.memo

        updated_accommodation = await self.accommodation_repository.save(
            accommodation=accommodation
        )

        return AccommodationRead.model_validate(updated_accommodation)

    async def delete(self, *, accommodation_id: int) -> None:
        accommodation = await self.accommodation_repository.find_by_id(
            accommodation_id=accommodation_id
        )
        if not accommodation:
            raise HTTPException(status_code=400, detail="해당 숙소를 찾을 수 없습니다.")
        if accommodation.plan.owner_id != self.current_user.id:
            raise HTTPException(
                status_code=400, detail="해당 숙소에 대한 삭제 권한이 없습니다."
            )

        await self.accommodation_repository.remove(accommodation_id=accommodation_id)
