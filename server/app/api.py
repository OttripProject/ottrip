from fastapi import Depends

from app.auth.deps import get_current_user

# public
from app.auth.router import router as auth_router
from app.core.router import create_router
from app.expenses.router import router as expenses_router

# private
from app.flights.router import router as flights_router
from app.itinerary.router import router as itinerary_router
from app.plans.router import router as plans_router
from app.users.router import router as users_router

router = create_router()

public_router = create_router(prefix="/public")
public_router.include_router(auth_router, prefix="/auth", tags=["Auth"])

private_router = create_router(
    prefix="/private",
    dependencies=[Depends(get_current_user)],
)
private_router.include_router(users_router, prefix="/users", tags=["Users"])
private_router.include_router(flights_router, prefix="/flights", tags=["Flights"])
private_router.include_router(itinerary_router, prefix="/itinerary", tags=["Itinerary"])
private_router.include_router(plans_router, prefix="/plans", tags=["Plans"])
private_router.include_router(expenses_router, prefix="/expenses", tags=["Expenses"])

router.include_router(public_router)
router.include_router(private_router)
