from fastapi import Depends, HTTPException

from app.accomodation.router import router as accomodation_router
from app.ai.router import router as ai_router
from app.attachments.router import router as attachments_router
from app.auth.deps import get_current_user
from app.auth.router import router as auth_router
from app.cities.router import router as cities_router
from app.core.router import create_router
from app.expenses.router import router as expenses_router
from app.flights.router import router as flights_router
from app.itinerary.router import router as itinerary_router
from app.locations.router import router as locations_router
from app.plans.repository import PlanRepository
from app.plans.router import router as plans_router
from app.plans.schemas import PlanExportViewerResponse, SnapshotData
from app.users.router import router as users_router

router = create_router()

public_router = create_router(prefix="/public")
public_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
public_router.include_router(cities_router, tags=["Cities"])


@public_router.get("/exports/{public_id}", tags=["Plans"])
async def get_plan_export(
    public_id: str,
    plan_repository: PlanRepository,
) -> PlanExportViewerResponse:
    export = await plan_repository.find_export_by_public_id(public_id=public_id)
    if not export:
        raise HTTPException(status_code=404, detail="내보내기를 찾을 수 없습니다.")
    return PlanExportViewerResponse(
        public_id=export.public_id,
        snapshot=SnapshotData.model_validate(export.snapshot_data),
        created_at=export.created_at,
    )


private_router = create_router(
    prefix="/private",
    dependencies=[Depends(get_current_user)],
)
private_router.include_router(users_router, prefix="/users", tags=["Users"])
private_router.include_router(flights_router, prefix="/flights", tags=["Flights"])
private_router.include_router(itinerary_router, prefix="/itinerary", tags=["Itinerary"])
private_router.include_router(plans_router, prefix="/plans", tags=["Plans"])
private_router.include_router(expenses_router, prefix="/expenses", tags=["Expenses"])
private_router.include_router(ai_router, prefix="/ai", tags=["AI"])
private_router.include_router(
    accomodation_router, prefix="/accommodations", tags=["Accommodations"]
)
private_router.include_router(
    attachments_router, prefix="/attachments", tags=["Attachments"]
)
private_router.include_router(locations_router, prefix="/locations", tags=["Locations"])

router.include_router(public_router)
router.include_router(private_router)
