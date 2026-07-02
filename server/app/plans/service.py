import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

from app.accomodation.models import Accommodation
from app.attachments.service import delete_r2_objects_by_keys
from app.auth.deps import CurrentUser
from app.auth.repository import AuthRepository
from app.expenses.models import Expense
from app.flights.models import Flight, FlightSegment
from app.itinerary.models import Itinerary
from app.storage.deps import S3ClientDep
from app.users.repository import UserRepository
from app.utils.dependency import dependency
from app.utils.email import build_invitation_accept_link, send_invitation_email_resend

from .models import InvitationStatus, Plan, PlanExport, PlanSegment, Role
from .repository import PlanRepository
from .schemas import (
    ExportAccommodation,
    ExportExpense,
    ExportFlight,
    ExportFlightSegment,
    ExportItinerary,
    ExportPlan,
    ExportSegment,
    PlanCreate,
    PlanExportCreate,
    PlanExportCreateResponse,
    PlanExportSaveResponse,
    PlanMemoUpdate,
    PlanRead,
    PlanReadWithInforms,
    PlansReadByUser,
    PlanUpdate,
    ShareRead,
    SnapshotData,
)

logger = logging.getLogger("api")


@dependency
class PlanService:
    current_user: CurrentUser
    plan_repository: PlanRepository
    user_repository: UserRepository
    auth_repository: AuthRepository
    s3_client: S3ClientDep

    async def create(self, *, plan_data: PlanCreate) -> PlanRead:
        segments = [
            PlanSegment(
                country=s.country,
                city=s.city,
                start_date=s.start_date,
                end_date=s.end_date,
                order_index=i,
            )
            for i, s in enumerate(plan_data.segments)
        ]
        start_date = min(s.start_date for s in plan_data.segments)
        end_date = max(s.end_date for s in plan_data.segments)

        create_plan_data = Plan(
            title=plan_data.title,
            start_date=start_date,
            end_date=end_date,
            memo=plan_data.memo or "",
            owner_id=self.current_user.id,
            public_id=str(uuid.uuid4()),
            segments=segments,
        )

        created_plan = await self.plan_repository.save(plan=create_plan_data)

        return PlanRead.model_validate(created_plan)

    async def read_plan_by_public_id(self, *, public_id: str) -> PlanReadWithInforms:
        """public_id로 plan을 조회"""

        plan = await self.plan_repository.find_by_public_id(public_id=public_id)

        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")

        if plan.owner_id == self.current_user.id:
            plan_data = PlanReadWithInforms.model_validate(plan)
            plan_data.my_role = Role.EDITOR
            return plan_data
        else:
            is_editor = await self.plan_repository.is_editor(
                plan_id=plan.id, user_id=self.current_user.id
            )

            if is_editor:
                plan_data = PlanReadWithInforms.model_validate(plan)
                plan_data.my_role = Role.EDITOR
                return plan_data
            else:
                # 세 번째 DB 쿼리: shared 확인
                is_shared = await self.plan_repository.is_shared(
                    plan_id=plan.id, user_id=self.current_user.id
                )

                if is_shared:
                    plan_data = PlanReadWithInforms.model_validate(plan)
                    plan_data.my_role = Role.VIEWER
                    return plan_data

        raise HTTPException(status_code=403, detail="해당 계획에 대한 권한이 없습니다.")

    async def read_plan(self, *, plan_id: int) -> PlanReadWithInforms:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)

        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        plan_data = PlanReadWithInforms.model_validate(plan)
        if plan.owner_id == self.current_user.id:
            plan_data.my_role = Role.EDITOR
        else:
            is_editor = await self.plan_repository.is_editor(
                plan_id=plan_id, user_id=self.current_user.id
            )
            if is_editor:
                plan_data.my_role = Role.EDITOR
            else:
                is_shared = await self.plan_repository.is_shared(
                    plan_id=plan_id, user_id=self.current_user.id
                )
                plan_data.my_role = Role.VIEWER if is_shared else None

        return plan_data

    async def read_plans_by_user(self) -> PlansReadByUser:
        user = await self.user_repository.find_by_id(user_id=self.current_user.id)
        if not user:
            raise HTTPException(status_code=400, detail="사용자를 찾을 수 없습니다.")

        plans = await self.plan_repository.find_all_by_user(
            user_id=self.current_user.id
        )
        plans_list = [PlanRead.model_validate(plan) for plan in plans]

        return PlansReadByUser(plans=plans_list)

    async def delete(self, *, plan_id: int) -> None:
        plan_exists, has_permission = await self.plan_repository.has_edit_permission(
            plan_id=plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(
                status_code=403, detail="해당 계획 삭제 권한이 없습니다."
            )

        plan = await self.plan_repository.find_by_id_only_plan(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")

        shared_count = await self.plan_repository.count_plan_shared(plan_id=plan_id)
        if shared_count > 0:
            if plan.owner_id != self.current_user.id:
                raise HTTPException(
                    status_code=403,
                    detail="공유 중인 플랜의 삭제·소유권 이전은 오너만 할 수 있습니다.",
                )
            successor_id = (
                await self.plan_repository.pick_owner_successor_on_account_delete(
                    plan_id=plan_id
                )
            )
            if successor_id is None:
                file_keys = await self.plan_repository.remove(plan_id=plan_id)
                await delete_r2_objects_by_keys(
                    s3_client=self.s3_client, keys=file_keys
                )
                return
            await self.plan_repository.transfer_plan_owner_and_drop_shared_row(
                plan_id=plan_id, new_owner_id=successor_id
            )
            return

        file_keys = await self.plan_repository.remove(plan_id=plan_id)
        await delete_r2_objects_by_keys(s3_client=self.s3_client, keys=file_keys)

    async def update(self, *, plan_id: int, update_data: PlanUpdate) -> PlanRead:
        plan = await self.plan_repository.find_by_id_with_segments(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=403, detail="해당 계획 수정 권한이 없습니다."
                )

        if update_data.title:
            plan.title = update_data.title

        if update_data.segments is not None:
            plan.segments = [
                PlanSegment(
                    country=s.country,
                    city=s.city,
                    start_date=s.start_date,
                    end_date=s.end_date,
                    order_index=i,
                )
                for i, s in enumerate(update_data.segments)
            ]
            plan.start_date = min(s.start_date for s in update_data.segments)
            plan.end_date = max(s.end_date for s in update_data.segments)

        updated_plan = await self.plan_repository.save(plan=plan)

        return PlanRead.model_validate(updated_plan)

    async def set_memo(self, *, plan_id: int, memo_data: PlanMemoUpdate) -> None:
        plan = await self.plan_repository.find_by_id_only_plan(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=403, detail="메모 수정 권한이 없습니다."
                )
        plan.memo = memo_data.memo or ""
        await self.plan_repository.save(plan=plan)

    # --- Sharing ---
    async def add_share(self, *, plan_id: int, user_id: int, role: Role) -> None:
        plan_exists, has_permission = await self.plan_repository.has_edit_permission(
            plan_id=plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(
                status_code=403, detail="해당 계획 공유 권한이 없습니다."
            )
        await self.plan_repository.upsert_shared(
            plan_id=plan_id, user_id=user_id, role=role
        )

    async def list_shares(self, *, plan_id: int) -> list[ShareRead]:
        plan = await self.plan_repository.find_by_id_with_owner(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
        shared_plans = await self.plan_repository.list_shared(plan_id=plan_id)

        owner_read = ShareRead(
            handle=plan.owner.handle,
            role=None,
            nickname=plan.owner.nickname,
            email=plan.owner.email or "",
        )
        shared_reads = [
            ShareRead(
                handle=shared_plan.shared_user.handle,
                role=shared_plan.role,
                nickname=shared_plan.shared_user.nickname,
                email=shared_plan.shared_user.email or "",
            )
            for shared_plan in shared_plans
        ]
        return [owner_read] + shared_reads

    async def update_share(self, *, plan_id: int, handle: str, role: Role) -> None:
        plan_exists, has_permission = await self.plan_repository.has_edit_permission(
            plan_id=plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(
                status_code=403, detail="해당 계획 공유 권한이 없습니다."
            )
        user_id = await self.user_repository.find_id_by_handle(user_handle=handle)
        if not user_id:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        await self.plan_repository.upsert_shared(
            plan_id=plan_id, user_id=user_id, role=role
        )

    async def revoke_share(self, *, plan_id: int, handle: str) -> None:
        plan_exists, has_permission = await self.plan_repository.has_edit_permission(
            plan_id=plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(
                status_code=403, detail="해당 계획 공유 권한이 없습니다."
            )
        user_id = await self.user_repository.find_id_by_handle(user_handle=handle)
        if not user_id:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        await self.plan_repository.revoke_shared(plan_id=plan_id, user_id=user_id)

    # --- Invitations ---
    async def create_invitation(
        self,
        *,
        plan_id: int,
        email: str,
        role: Role,
        expires_days: int | None,
        invited_by: int,
    ):
        plan = await self.plan_repository.find_by_id_only_plan(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=403, detail="해당 계획 초대 권한이 없습니다."
                )

        token = secrets.token_urlsafe(32)
        expires_at: datetime | None = (
            datetime.now(timezone.utc) + timedelta(days=expires_days)
            if expires_days
            else None
        )
        inv = await self.plan_repository.create_invitation(
            plan_id=plan_id,
            email=email.strip().lower(),
            role=role,
            token=token,
            expires_at=expires_at,
            invited_by=invited_by,
        )
        accept_link = build_invitation_accept_link(token)
        try:
            send_invitation_email_resend(
                to_email=inv.email,
                plan_title=plan.title,
                role=role.value if hasattr(role, "value") else str(role),
                accept_link=accept_link,
                expires_at_iso=inv.expires_at.isoformat() if inv.expires_at else None,
            )
            # send_invitation_email(
            #     to_email=inv.email,
            #     plan_title=plan.title,
            #     role=role.value if hasattr(role, "value") else str(role),
            #     accept_link=accept_link,
            #     expires_at_iso=inv.expires_at.isoformat() if inv.expires_at else None,
            # )
        except Exception as e:
            import logging

            logger = logging.getLogger("uvicorn.error")
            email_domain = inv.email.split("@")[1] if "@" in inv.email else "unknown"
            error_message = str(e) if len(str(e)) <= 200 else str(e)[:200] + "..."
            logger.error(
                f"초대 이메일 전송 실패: plan_id={plan_id}, email_domain={email_domain}, "
                f"error={type(e).__name__}: {error_message}",
                exc_info=True,
            )
        return inv

    async def accept_invitation(self, *, token: str) -> None:
        invitation = await self.plan_repository.find_valid_invitation(token=token)
        if not invitation or invitation.status != InvitationStatus.PENDING:
            raise HTTPException(status_code=404, detail="유효하지 않은 초대입니다.")
        auth_info = await self.auth_repository.find_by_criteria(
            user_id=self.current_user.id
        )
        current_email = (auth_info.verified_email or "").lower() if auth_info else ""
        if current_email != invitation.email.lower():
            raise HTTPException(
                status_code=403, detail="초대된 이메일과 일치하지 않습니다."
            )

        if invitation.expires_at and invitation.expires_at <= datetime.now(
            timezone.utc
        ):
            raise HTTPException(status_code=400, detail="초대가 만료되었습니다.")

        await self.plan_repository.upsert_shared(
            plan_id=invitation.plan_id,
            user_id=self.current_user.id,
            role=invitation.role,
        )
        await self.plan_repository.mark_invitation_status(
            invitation_id=invitation.id,
            status=InvitationStatus.ACCEPTED.name,
        )

    # --- Export ---

    async def create_export(
        self, *, plan_id: int, request: PlanExportCreate
    ) -> PlanExportCreateResponse:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")

        has_permission = plan.owner_id == self.current_user.id or (
            await self.plan_repository.is_editor(
                plan_id=plan_id, user_id=self.current_user.id
            )
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="내보내기 권한이 없습니다.")

        snapshot = SnapshotData(
            plan=ExportPlan(
                title=plan.title,
                start_date=plan.start_date,
                end_date=plan.end_date,
                segments=[
                    ExportSegment(
                        country=s.country,
                        city=s.city,
                        start_date=s.start_date,
                        end_date=s.end_date,
                        order_index=s.order_index,
                    )
                    for s in plan.segments
                ],
            ),
            itineraries=[
                ExportItinerary(
                    id=it.id,
                    title=it.title,
                    country=it.country,
                    city=it.city,
                    location=it.location,
                    itinerary_date=it.itinerary_date,
                    start_time=it.start_time,
                    end_time=it.end_time,
                )
                for it in plan.itineraries
                if not it.is_deleted
            ],
            flights=[
                ExportFlight(
                    id=flight.id,
                    segments=[
                        ExportFlightSegment(
                            order=seg.order,
                            departure_airport=seg.departure_airport,
                            arrival_airport=seg.arrival_airport,
                            departure_time=seg.departure_time,
                            arrival_time=seg.arrival_time,
                        )
                        for seg in flight.flight_segments
                        if not seg.is_deleted
                    ],
                )
                for flight in plan.flights
                if not flight.is_deleted
            ],
            accommodations=[
                ExportAccommodation(
                    id=acc.id,
                    name=acc.name,
                    checkin_date=acc.checkin_date,
                    checkout_date=acc.checkout_date,
                    checkin_time=acc.checkin_time,
                    checkout_time=acc.checkout_time,
                )
                for acc in plan.accommodations
                if not acc.is_deleted
            ],
            expenses=(
                [
                    ExportExpense(
                        category=exp.category,
                        amount=exp.amount,  # type: ignore[arg-type]
                        currency=exp.currency,
                        description=exp.description,
                        ex_date=exp.ex_date,
                        itinerary_id=exp.itinerary_id,
                        flight_id=exp.flight_id,
                        accommodation_id=exp.accommodation_id,
                    )
                    for exp in plan.expenses
                    if not exp.is_deleted
                ]
                if request.include_expenses
                else None
            ),
            checklist=plan.travel_checklist if request.include_checklist else None,
        )

        export = await self.plan_repository.save_export(
            export=PlanExport(
                public_id=str(uuid.uuid4()),
                source_plan_id=plan.id,
                snapshot_data=snapshot.model_dump(mode="json"),
            )
        )
        return PlanExportCreateResponse(public_id=export.public_id)

    async def save_as_plan(self, *, public_id: str) -> PlanExportSaveResponse:
        export = await self.plan_repository.find_export_by_public_id(
            public_id=public_id
        )
        if not export:
            raise HTTPException(status_code=404, detail="내보내기를 찾을 수 없습니다.")

        snapshot = SnapshotData.model_validate(export.snapshot_data)
        snap_plan = snapshot.plan
        session = self.plan_repository.session

        new_plan = Plan(
            title=snap_plan.title,
            start_date=snap_plan.start_date,
            end_date=snap_plan.end_date,
            owner_id=self.current_user.id,
            public_id=str(uuid.uuid4()),
            travel_checklist=snapshot.checklist,
            segments=[
                PlanSegment(
                    country=s.country,
                    city=s.city,
                    start_date=s.start_date,
                    end_date=s.end_date,
                    order_index=s.order_index,
                )
                for s in snap_plan.segments
            ],
        )
        session.add(new_plan)
        await session.flush()

        itinerary_id_map: dict[int, int] = {}
        flight_id_map: dict[int, int] = {}
        accommodation_id_map: dict[int, int] = {}

        for it in snapshot.itineraries:
            new_it = Itinerary(
                title=it.title,
                description=None,
                country=it.country,
                city=it.city,
                location=it.location,
                itinerary_date=it.itinerary_date,
                start_time=it.start_time,
                end_time=it.end_time,
                plan_id=new_plan.id,
            )
            session.add(new_it)
            await session.flush()
            itinerary_id_map[it.id] = new_it.id

        for flight in snapshot.flights:
            new_flight = Flight(
                reservation_number="",
                passenger_name="",
                ticket_number="",
                booking_reference="",
                plan_id=new_plan.id,
            )
            session.add(new_flight)
            await session.flush()
            flight_id_map[flight.id] = new_flight.id
            for seg in flight.segments:
                session.add(
                    FlightSegment(
                        order=seg.order,
                        airline="",
                        flight_number="",
                        departure_airport=seg.departure_airport,
                        arrival_airport=seg.arrival_airport,
                        departure_time=seg.departure_time,
                        arrival_time=seg.arrival_time,
                        seat_class="",
                        seat_number="",
                        gate="",
                        terminal="",
                        flight_id=new_flight.id,
                    )
                )

        for acc in snapshot.accommodations:
            new_acc = Accommodation(
                name=acc.name,
                place=None,
                country=None,
                city=None,
                checkin_date=acc.checkin_date,
                checkout_date=acc.checkout_date,
                checkin_time=acc.checkin_time,
                checkout_time=acc.checkout_time,
                description=None,
                plan_id=new_plan.id,
            )
            session.add(new_acc)
            await session.flush()
            accommodation_id_map[acc.id] = new_acc.id

        if snapshot.expenses:
            for exp in snapshot.expenses:
                new_exp = Expense(
                    category=exp.category,
                    amount=exp.amount,  # type: ignore[arg-type]
                    currency=exp.currency,
                    description=exp.description,
                    ex_date=exp.ex_date,
                    plan_id=new_plan.id,
                )
                new_exp.itinerary_id = (
                    itinerary_id_map.get(exp.itinerary_id) if exp.itinerary_id else None
                )
                new_exp.flight_id = (
                    flight_id_map.get(exp.flight_id) if exp.flight_id else None
                )
                new_exp.accommodation_id = (
                    accommodation_id_map.get(exp.accommodation_id)
                    if exp.accommodation_id
                    else None
                )
                session.add(new_exp)

        await session.flush()
        return PlanExportSaveResponse(plan_public_id=new_plan.public_id)
