from fastapi import HTTPException
from datetime import datetime, timedelta, timezone
import secrets

from app.auth.deps import CurrentUser
from app.users.repository import UserRepository
from app.auth.repository import AuthRepository
from app.utils.dependency import dependency

from .models import Plan
from .models import Role, InvitationStatus
from .repository import PlanRepository
from .schemas import (
    PlanCreate,
    PlanRead,
    PlanReadWithInforms,
    PlansReadByUser,
    PlanUpdate,
    PlanMemoUpdate,
    ShareRead,
)
from app.utils.email import build_invitation_accept_link, send_invitation_email


@dependency
class PlanService:
    current_user: CurrentUser
    plan_repository: PlanRepository
    user_repository: UserRepository
    auth_repository: AuthRepository

    async def create(self, *, plan_data: PlanCreate) -> PlanRead:
        create_plan_data = Plan(
            title=plan_data.title,
            start_date=plan_data.start_date,
            end_date=plan_data.end_date,
            memo = plan_data.memo or "",
            owner_id=self.current_user.id,
        )

        created_plan = await self.plan_repository.save(plan=create_plan_data)

        return PlanRead.model_validate(created_plan)

    async def read_plan(self, *, plan_id: int) -> PlanReadWithInforms:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)

        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        plan_data = PlanReadWithInforms.model_validate(plan)
        if plan.owner_id == self.current_user.id:
            plan_data.my_role = Role.EDITOR
        else:
            is_editor = await self.plan_repository.is_editor(plan_id=plan_id, user_id=self.current_user.id)
            if is_editor:
                plan_data.my_role = Role.EDITOR
            else:
                is_shared = await self.plan_repository.is_shared(plan_id=plan_id, user_id=self.current_user.id)
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
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="해당 계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            raise HTTPException(status_code=403, detail="해당 계획 삭제 권한이 없습니다.")

        await self.plan_repository.remove(plan_id=plan_id)

    async def update(self, *, plan_id: int, update_data: PlanUpdate) -> PlanRead:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            raise HTTPException(status_code=403, detail="계획 수정 권한이 없습니다.")

        if update_data.title:
            plan.title = update_data.title
        if update_data.start_date:
            plan.start_date = update_data.start_date
        if update_data.end_date:
            plan.end_date = update_data.end_date

        updated_plan = await self.plan_repository.save(plan=plan)

        return PlanRead.model_validate(updated_plan)

    async def set_memo(self, *, plan_id: int, memo_data: PlanMemoUpdate) -> None:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(status_code=403, detail="메모 수정 권한이 없습니다.")
        plan.memo = memo_data.memo or ""
        await self.plan_repository.save(plan=plan)

    # --- Sharing ---
    async def add_share(self, *, plan_id: int, user_id: int, role: Role) -> None:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            raise HTTPException(status_code=403, detail="권한이 없습니다.")
        await self.plan_repository.upsert_shared(plan_id=plan_id, user_id=user_id, role=role)

    async def list_shares(self, *, plan_id: int) -> list[ShareRead]:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
        shared_plans = await self.plan_repository.list_shared(plan_id=plan_id)
        return [
            ShareRead(handle=shared_plan.shared_user.handle, role=shared_plan.role, nickname=(shared_plan.shared_user.nickname if shared_plan.shared_user else ""))
            for shared_plan in shared_plans
        ]

    async def revoke_share(self, *, plan_id: int, handle: str) -> None:
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            raise HTTPException(status_code=403, detail="권한이 없습니다.")
        user_id = await self.user_repository.find_id_by_handle(user_handle=handle)
        if not user_id:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        await self.plan_repository.revoke_shared(plan_id=plan_id, user_id=user_id)

    # --- Invitations ---
    async def create_invitation(self, *, plan_id: int, email: str, role: Role, expires_days: int | None, invited_by: int):
        plan = await self.plan_repository.find_by_id(plan_id=plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id:
            raise HTTPException(status_code=403, detail="권한이 없습니다.")

        token = secrets.token_urlsafe(32)
        expires_at: datetime | None = (
            datetime.now(timezone.utc) + timedelta(days=expires_days)
            if expires_days else None
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
            send_invitation_email(
                to_email=inv.email,
                plan_title=plan.title,
                role=role.value if hasattr(role, "value") else str(role),
                accept_link=accept_link,
                expires_at_iso=inv.expires_at.isoformat() if inv.expires_at else None,
            )
        except Exception:
            pass
        return inv

    async def accept_invitation(self, *, token: str) -> None:
        invitation = await self.plan_repository.find_valid_invitation(token=token)
        if not invitation or invitation.status != InvitationStatus.PENDING:
            raise HTTPException(status_code=404, detail="유효하지 않은 초대입니다.")
        auth_info = await self.auth_repository.find_by_criteria(user_id=self.current_user.id)
        current_email = (auth_info.verified_email or "").lower() if auth_info else ""
        if current_email != invitation.email.lower():
            raise HTTPException(status_code=403, detail="초대된 이메일과 일치하지 않습니다.")

        from datetime import datetime, timezone
        if invitation.expires_at and invitation.expires_at <= datetime.now(timezone.utc):
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
