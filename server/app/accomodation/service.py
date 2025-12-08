from fastapi import HTTPException

from app.auth.deps import CurrentUser
from app.expenses.models import Expense
from app.expenses.schemas import ExpenseCategory, ExpenseCurrency
from app.expenses.repository import ExpenseRepository
from app.plans.repository import PlanRepository
from app.utils.dependency import dependency

from .models import Accommodation
from .repository import AccommodationRepository
from .schemas import AccommodationCreate, AccommodationRead, AccommodationUpdate


@dependency
class AccommodationService:
    current_user: CurrentUser
    accommodation_repository: AccommodationRepository
    expense_repository: ExpenseRepository
    plan_repository: PlanRepository

    async def create(
        self, *, accommodation_data: AccommodationCreate
    ) -> AccommodationRead:
        plan_exists, has_permission = await self.plan_repository.has_edit_permission(
            plan_id=accommodation_data.plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(status_code=403, detail="해당 숙소에 대한 생성 권한이 없습니다.")
        create_accommodation_data = Accommodation(
            name=accommodation_data.name,
            place=accommodation_data.place,
            country=accommodation_data.country,
            city=accommodation_data.city,
            checkin_date=accommodation_data.checkin_date,
            checkout_date=accommodation_data.checkout_date,
            checkin_time=accommodation_data.checkin_time,
            checkout_time=accommodation_data.checkout_time,
            description=accommodation_data.description,
            plan_id=accommodation_data.plan_id,
        )
        created_accommodation = await self.accommodation_repository.save(
            accommodation=create_accommodation_data
        )

        if accommodation_data.expense:
            expense = Expense(
                amount=float(accommodation_data.expense.amount),
                category=ExpenseCategory.ACCOMMODATION,
                description=accommodation_data.expense.description,
                currency=accommodation_data.expense.currency,
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

        if accommodation.plan.owner_id != self.current_user.id:
            is_shared = await self.plan_repository.is_shared(
                plan_id=accommodation.plan_id, user_id=self.current_user.id
            )
            if not is_shared:
                raise HTTPException(status_code=403, detail="숙소 조회 권한이 없습니다.")

        return AccommodationRead.model_validate(accommodation)

    async def read_accommodations_by_plan(
        self, *, plan_id: int
    ) -> list[AccommodationRead]:
        plan_exists, has_permission = await self.plan_repository.has_read_permission(
            plan_id=plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(status_code=403, detail="해당 숙소에 대한 조회 권한이 없습니다.")

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
            is_editor = await self.plan_repository.is_editor(
                plan_id=accommodation.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=403, detail="해당 숙소에 대한 수정 권한이 없습니다."
                )

        if update_data.name:
            accommodation.name = update_data.name
        if update_data.place is not None:
            accommodation.place = update_data.place
        if update_data.country is not None:
            accommodation.country = update_data.country
        if update_data.city is not None:
            accommodation.city = update_data.city
        if update_data.checkin_date:
            accommodation.checkin_date = update_data.checkin_date   
        if update_data.checkout_date:
            accommodation.checkout_date = update_data.checkout_date
        if update_data.checkin_time:
            accommodation.checkin_time = update_data.checkin_time
        if update_data.checkout_time:
            accommodation.checkout_time = update_data.checkout_time
        if update_data.description:
            accommodation.description = update_data.description

        updated_accommodation = await self.accommodation_repository.save(
            accommodation=accommodation
        )

        if update_data.expense:
            # 기존 expense가 있는 경우 (soft delete되지 않은 경우)
            if accommodation.expense:
                if update_data.expense.amount is not None:
                    accommodation.expense.amount = float(update_data.expense.amount)
                accommodation.expense.category = ExpenseCategory.ACCOMMODATION
                if update_data.expense.description is not None:
                    accommodation.expense.description = update_data.expense.description
                if update_data.expense.ex_date is not None:
                    accommodation.expense.ex_date = update_data.expense.ex_date
                if update_data.expense.currency is not None:
                    accommodation.expense.currency = update_data.expense.currency

                updated_expense = await self.expense_repository.save(
                    expense=accommodation.expense
                )
                updated_accommodation.expense = updated_expense
            else:
                existing_expense = await self.expense_repository.find_by_accommodation_id(accommodation_id=accommodation.id)
                
                if existing_expense:
                    existing_expense.is_deleted = False
                    if update_data.expense.amount is not None:
                        existing_expense.amount = float(update_data.expense.amount)
                    existing_expense.category = ExpenseCategory.ACCOMMODATION
                    if update_data.expense.description is not None:
                        existing_expense.description = update_data.expense.description
                    if update_data.expense.ex_date is not None:
                        existing_expense.ex_date = update_data.expense.ex_date
                    if update_data.expense.currency is not None:
                        existing_expense.currency = update_data.expense.currency

                    updated_expense = await self.expense_repository.save(expense=existing_expense)
                    updated_accommodation.expense = updated_expense
                else:
                    expense = Expense(
                        amount=float(update_data.expense.amount or 0),
                        category=ExpenseCategory.ACCOMMODATION,
                        description=update_data.expense.description or accommodation.name,
                        currency=update_data.expense.currency or ExpenseCurrency.KRW,
                        ex_date=update_data.expense.ex_date or accommodation.checkin_date,
                        plan_id=accommodation.plan_id,
                    )
                    created_expense = await self.expense_repository.save(expense=expense)
                    updated_accommodation.expense = created_expense
                    created_expense.accommodation_id = updated_accommodation.id

        return AccommodationRead.model_validate(updated_accommodation)

    async def delete(self, *, accommodation_id: int) -> None:
        accommodation = await self.accommodation_repository.find_by_id(
            accommodation_id=accommodation_id
        )
        if not accommodation:
            raise HTTPException(status_code=400, detail="해당 숙소를 찾을 수 없습니다.")
        if accommodation.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=accommodation.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=403, detail="해당 숙소에 대한 수정 권한이 없습니다."
                )

        await self.expense_repository.soft_delete_by_accommodation_id(
            accommodation_id=accommodation_id
        )
        await self.accommodation_repository.remove(accommodation_id=accommodation_id)
