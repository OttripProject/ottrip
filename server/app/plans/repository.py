# from fastapi import HTTPException

from app.database.deps import SessionDep
from app.utils.dependency import dependency

from .models import Plan


@dependency
class PlanRepository:
    session: SessionDep

    async def save(self, *, plan: Plan) -> Plan:
        self.session.add(plan)
        await self.session.flush()
        return plan
