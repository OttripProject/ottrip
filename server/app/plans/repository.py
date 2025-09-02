# from fastapi import HTTPException

from sqlalchemy import select, update, insert, delete
from sqlalchemy.orm import joinedload

from app.database.deps import SessionDep
from app.flights.models import Flight
from app.itinerary.models import Itinerary
from app.utils.dependency import dependency

from .models import Plan, PlanInvitation, PlanShared, Role
from datetime import datetime


@dependency
class PlanRepository:
    session: SessionDep

    async def save(self, *, plan: Plan) -> Plan:
        self.session.add(plan)
        await self.session.flush()
        return plan

    async def find_by_id(self, *, plan_id: int) -> Plan | None:
        result = await self.session.execute(
            select(Plan)
            .options(
                joinedload(Plan.owner),
                joinedload(Plan.flights).joinedload(Flight.expense),
                joinedload(Plan.itineraries).joinedload(Itinerary.expenses),
                joinedload(Plan.expenses),
            )
            .where(Plan.id == plan_id, Plan.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def find_all_by_user(self, *, user_id: int) -> list[Plan]:
        owned_ids = select(Plan.id).where(
            Plan.owner_id == user_id, Plan.is_deleted.is_(False)
        )
        shared_ids = (
            select(Plan.id)
            .join(PlanShared, PlanShared.plan_id == Plan.id)
            .where(PlanShared.shared_user_id == user_id, Plan.is_deleted.is_(False))
        )
        union_ids = owned_ids.union(shared_ids).subquery()
        result = await self.session.execute(
            select(Plan).where(Plan.id.in_(select(union_ids.c.id)))
        )
        return list(result.unique().scalars())

    async def remove(self, *, plan_id: int) -> None:
        stmt = (
            update(Plan)
            .where(Plan.id == plan_id, Plan.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)

    # --- Sharing ---
    async def upsert_shared(self, *, plan_id: int, user_id: int, role: Role) -> None:
        # naive upsert: try update, if 0 rows then insert
        res = await self.session.execute(
            update(PlanShared)
            .where(PlanShared.plan_id == plan_id, PlanShared.shared_user_id == user_id)
            .values(role=role)
        )
        if res.rowcount == 0:
            await self.session.execute(
                insert(PlanShared).values(
                    plan_id=plan_id, shared_user_id=user_id, role=role
                )
            )


    async def list_shared(self, *, plan_id: int) -> list[PlanShared]:
        result = await self.session.execute(
            select(PlanShared).where(PlanShared.plan_id == plan_id)
        )
        return list(result.scalars())

    async def revoke_shared(self, *, plan_id: int, user_id: int) -> None:
        await self.session.execute(
            delete(PlanShared).where(
                PlanShared.plan_id == plan_id, PlanShared.shared_user_id == user_id
            )
        )


    async def is_shared(self, *, plan_id: int, user_id: int) -> bool:
        result = await self.session.execute(
            select(PlanShared).where(
                PlanShared.plan_id == plan_id,
                PlanShared.shared_user_id == user_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def is_editor(self, *, plan_id: int, user_id: int) -> bool:
        result = await self.session.execute(
            select(PlanShared).where(
                PlanShared.plan_id == plan_id,
                PlanShared.shared_user_id == user_id,
                PlanShared.role == Role.EDITOR,
            )
        )
        return result.scalar_one_or_none() is not None

    # --- Invitations ---
    async def create_invitation(
        self,
        *,
        plan_id: int,
        email: str,
        role: Role,
        token: str,
        expires_at: datetime | None,
        invited_by: int,
    ) -> PlanInvitation:
        invitation = PlanInvitation(
            plan_id=plan_id,
            email=email,
            role=role,
            token=token,
            expires_at=expires_at,
            invited_by=invited_by,
        )
        self.session.add(invitation)
        await self.session.flush()
        return invitation

    async def find_valid_invitation(self, *, token: str):
        result = await self.session.execute(
            select(PlanInvitation).where(PlanInvitation.token == token)
        )
        return result.scalar_one_or_none()

    async def mark_invitation_status(self, *, invitation_id: int, status: str) -> None:
        await self.session.execute(
            update(PlanInvitation)
            .where(PlanInvitation.id == invitation_id)
            .values(status=status)
        )
