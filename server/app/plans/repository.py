# from fastapi import HTTPException

from sqlalchemy import select, update, insert, delete, exists
from sqlalchemy.orm import joinedload, with_loader_criteria

from app.database.deps import SessionDep
from app.attachments.models import Attachment
from app.expenses.models import Expense
from app.flights.models import Flight, FlightSegment
from app.itinerary.models import Itinerary
from app.accomodation.models import Accommodation
from app.utils.dependency import dependency
from app.ai.schemas import ChecklistItemsByCategory

from .models import Plan, PlanInvitation, PlanShared, Role
from datetime import datetime


@dependency
class PlanRepository:
    session: SessionDep

    async def save(self, *, plan: Plan) -> Plan:
        self.session.add(plan)
        await self.session.flush()
        return plan

    async def exists(self, *, plan_id: int) -> bool:
        result = await self.session.scalar(
            select(exists().where(Plan.id == plan_id, Plan.is_deleted.is_(False)))
        )
        return bool(result)

    async def find_by_id(self, *, plan_id: int) -> Plan | None:
        result = await self.session.execute(
            select(Plan)
            .options(
                joinedload(Plan.owner),
                joinedload(Plan.flights).joinedload(Flight.expense),
                joinedload(Plan.flights).joinedload(Flight.flight_segments),
                joinedload(Plan.itineraries).joinedload(Itinerary.expenses),
                joinedload(Plan.accommodations),
                joinedload(Plan.expenses),
                with_loader_criteria(
                    FlightSegment, FlightSegment.is_deleted.is_(False), include_aliases=True
                ),
                with_loader_criteria(
                    Itinerary, Itinerary.is_deleted.is_(False), include_aliases=True
                ),
                with_loader_criteria(
                    Flight, Flight.is_deleted.is_(False), include_aliases=True
                ),
                with_loader_criteria(
                    Accommodation, Accommodation.is_deleted.is_(False), include_aliases=True
                ),
                with_loader_criteria(
                    Expense, Expense.is_deleted.is_(False), include_aliases=True
                ),
            )
            .where(Plan.id == plan_id, Plan.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def find_by_public_id(self, *, public_id: str) -> Plan | None:
        result = await self.session.execute(
            select(Plan)
            .options(
                joinedload(Plan.owner),
                joinedload(Plan.flights).joinedload(Flight.expense),
                joinedload(Plan.flights).joinedload(Flight.flight_segments),
                joinedload(Plan.itineraries).joinedload(Itinerary.expenses),
                joinedload(Plan.accommodations).joinedload(Accommodation.expense),
                joinedload(Plan.expenses),
                with_loader_criteria(
                    FlightSegment, FlightSegment.is_deleted.is_(False), include_aliases=True
                ),
                with_loader_criteria(
                    Itinerary, Itinerary.is_deleted.is_(False), include_aliases=True
                ),
                with_loader_criteria(
                    Flight, Flight.is_deleted.is_(False), include_aliases=True
                ),
                with_loader_criteria(
                    Accommodation, Accommodation.is_deleted.is_(False), include_aliases=True
                ),
                with_loader_criteria(
                    Expense, Expense.is_deleted.is_(False), include_aliases=True
                ),
            )
            .where(Plan.public_id == public_id, Plan.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def find_by_id_only_plan(self, *, plan_id: int) -> Plan | None:
        result = await self.session.execute(
            select(Plan).where(Plan.id == plan_id, Plan.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def find_by_id_with_owner(self, *, plan_id: int) -> Plan | None:
        result = await self.session.execute(
            select(Plan)
            .options(joinedload(Plan.owner))
            .where(Plan.id == plan_id, Plan.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def find_by_public_id_only_plan(self, *, public_id: str) -> Plan | None:
        result = await self.session.execute(
            select(Plan).where(Plan.public_id == public_id, Plan.is_deleted.is_(False))
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

    async def remove(self, *, plan_id: int) -> list[str]:
        """
        플랜과 하위 엔티티 소프트 삭제, 첨부 DB 행 삭제. R2 삭제는 호출 측에서 file_key 목록으로 수행.
        반환: 삭제한 첨부의 R2 object key 목록 (요청 종료 시점 commit 전에 R2 삭제에 사용).
        """
        key_result = await self.session.execute(
            select(Attachment.file_key).where(Attachment.plan_id == plan_id)
        )
        file_keys = list(key_result.scalars().all())

        flight_ids_subq = select(Flight.id).where(Flight.plan_id == plan_id)
        await self.session.execute(
            update(FlightSegment)
            .where(FlightSegment.flight_id.in_(flight_ids_subq))
            .values(is_deleted=True)
        )
        await self.session.execute(
            update(Flight).where(Flight.plan_id == plan_id).values(is_deleted=True)
        )
        await self.session.execute(
            update(Itinerary).where(Itinerary.plan_id == plan_id).values(is_deleted=True)
        )
        await self.session.execute(
            update(Accommodation)
            .where(Accommodation.plan_id == plan_id)
            .values(is_deleted=True)
        )
        await self.session.execute(
            update(Expense).where(Expense.plan_id == plan_id).values(is_deleted=True)
        )
        await self.session.execute(
            delete(Attachment).where(Attachment.plan_id == plan_id)
        )
        await self.session.execute(
            update(Plan)
            .where(Plan.id == plan_id, Plan.is_deleted.is_(False))
            .values(is_deleted=True)
        )
        return file_keys

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
            select(PlanShared).options(joinedload(PlanShared.shared_user)).where(PlanShared.plan_id == plan_id)
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

    async def has_edit_permission(self, *, plan_id: int, user_id: int) -> tuple[bool, bool]:
        result = await self.session.execute(
            select(Plan.id, Plan.owner_id)
            .where(Plan.id == plan_id, Plan.is_deleted.is_(False))
        )
        row = result.first()
        
        if row is None:
            return (False, False)
        
        owner_id = row[1]
        
        if owner_id == user_id:
            return (True, True)
        
        is_editor = await self.is_editor(plan_id=plan_id, user_id=user_id)
        return (True, is_editor)

    async def has_read_permission(self, *, plan_id: int, user_id: int) -> tuple[bool, bool]:
        result = await self.session.execute(
            select(Plan.id, Plan.owner_id)
            .where(Plan.id == plan_id, Plan.is_deleted.is_(False))
        )
        row = result.first()
        if row is None:
            return (False, False)
        owner_id = row[1]
        if owner_id == user_id:
            return (True, True)
        is_shared = await self.is_shared(plan_id=plan_id, user_id=user_id)
        return (True, is_shared)

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

    async def find_travel_checklist_by_public_id(
        self, *, public_id: str
    ) -> ChecklistItemsByCategory | None:
        # Plan 존재 여부와 travel_checklist를 함께 조회
        result = await self.session.execute(
            select(Plan.id, Plan.travel_checklist)
            .where(Plan.public_id == public_id, Plan.is_deleted.is_(False))
        )
        row = result.first()
        
        # Plan이 없으면 None 반환
        if row is None:
            return None
        
        # Plan은 존재하지만 travel_checklist가 없으면 빈 ChecklistItemsByCategory 반환
        travel_checklist = row[1]
        if not travel_checklist:
            return ChecklistItemsByCategory(
                basic_required=[],
                schedule_required=[],
                recommended=[],
                optional=[],
            )
        
        # categories 추출 및 변환
        categories = travel_checklist.get("categories", {})
        return ChecklistItemsByCategory(**categories)
