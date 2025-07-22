from fastapi import HTTPException

from app.auth.deps import CurrentUser
from app.utils.dependency import dependency

from .models import Itinerary
from .repository import ItineraryRepository
from .schemas import ItineraryCreate, ItineraryRead, ItineraryUpdate


@dependency
class ItineraryService:
    current_user: CurrentUser
    itinerary_repository: ItineraryRepository

    async def create(self, *, itinerary_data: ItineraryCreate) -> ItineraryRead:
        create_itinerary_data = Itinerary(
            title=itinerary_data.title,
            itinerary_date=itinerary_data.itinerary_date,
            start_time=itinerary_data.start_time,
            end_time=itinerary_data.end_time,
            description=itinerary_data.description,
            country=itinerary_data.country,
            city=itinerary_data.city,
            location=itinerary_data.location,
            plan_id=itinerary_data.plan_id,
        )

        created_itinerary = await self.itinerary_repository.save(
            itinerary=create_itinerary_data
        )

        return ItineraryRead.model_validate(created_itinerary)

    async def read_itinerary(self, *, itinerary_id: int) -> ItineraryRead:
        itinerary = await self.itinerary_repository.find_by_id(
            itinerary_id=itinerary_id
        )

        if not itinerary:
            raise HTTPException(status_code=404, detail="해당 일정을 찾을 수 없습니다.")

        return ItineraryRead.model_validate(itinerary)

    async def read_itineraries_by_plan(self, *, plan_id: int) -> list[ItineraryRead]:
        itineraries = await self.itinerary_repository.find_all_by_plan(plan_id=plan_id)
        itineraries_list = [
            ItineraryRead.model_validate(itinerary) for itinerary in itineraries
        ]

        return itineraries_list

    async def update(
        self, *, itinerary_id: int, update_data: ItineraryUpdate
    ) -> ItineraryRead:
        itinerary = await self.itinerary_repository.find_by_id(
            itinerary_id=itinerary_id
        )
        if not itinerary:
            raise HTTPException(status_code=400, detail="일정을 찾을 수 없습니다.")
        if itinerary.plan.owner_id != self.current_user.id:
            raise HTTPException(status_code=400, detail="일정 수정 권한이 없습니다.")

        if update_data.title:
            itinerary.title = update_data.title
        if update_data.itinerary_date:
            itinerary.itinerary_date = update_data.itinerary_date
        if update_data.start_time:
            itinerary.start_time = update_data.start_time
        if update_data.end_time:
            itinerary.end_time = update_data.end_time
        if update_data.description:
            itinerary.description = update_data.description
        if update_data.country:
            itinerary.country = update_data.country
        if update_data.city:
            itinerary.city = update_data.city

        updated_itinerary = await self.itinerary_repository.save(itinerary=itinerary)

        return ItineraryRead.model_validate(updated_itinerary)

    async def delete(self, *, itinerary_id: int) -> None:
        itinerary = await self.itinerary_repository.find_by_id(
            itinerary_id=itinerary_id
        )
        if not itinerary:
            raise HTTPException(status_code=400, detail="일정을 찾을 수 없습니다.")
        if itinerary.plan.owner_id != self.current_user.id:
            raise HTTPException(status_code=400, detail="일정 수정 권한이 없습니다.")

        await self.itinerary_repository.remove(itinerary_id=itinerary_id)
