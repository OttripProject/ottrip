import logging
import time

from fastapi import status

from app.core.router import create_router

from .schemas import (
    PlanCreate,
    PlanRead,
    PlanReadWithInforms,
    PlansReadByUser,
    PlanUpdate,
    PlanMemoUpdate,
    ShareCreate,
    ShareRead,
    InvitationCreate,
)
from .service import PlanService

router = create_router()
logger = logging.getLogger("api")


@router.get("/me", status_code=status.HTTP_200_OK)
async def read_my_plans(
    plan_service: PlanService,
) -> PlansReadByUser:
    """현재 로그인 사용자의 모든 여행 계획."""
    return await plan_service.read_plans_by_user()


@router.get("/{public_id}", status_code=status.HTTP_200_OK)
async def read_plan_by_public_id(
    plan_service: PlanService,
    public_id: str,
) -> PlanReadWithInforms:
    """공개 ID로 여행 계획 조회."""
    request_start_time = time.time()
    
    try:
        result = await plan_service.read_plan_by_public_id(public_id=public_id)
        
        request_end_time = time.time()
        total_time = (request_end_time - request_start_time) * 1000
        db_time = plan_service.last_db_time_ms if hasattr(plan_service, 'last_db_time_ms') else 0
        
        logger.info(
            f"⏱️  GET /plans/{{public_id}} 성능 측정 - "
            f"총 응답시간: {total_time:.2f}ms, "
            f"DB 쿼리 시간: {db_time:.2f}ms, "
            f"기타 처리 시간: {total_time - db_time:.2f}ms, "
            f"public_id: {public_id}"
        )
        
        return result
    except Exception as e:
        request_end_time = time.time()
        total_time = (request_end_time - request_start_time) * 1000
        logger.error(
            f"❌ GET /plans/{{public_id}} 실패 - "
            f"총 응답시간: {total_time:.2f}ms, "
            f"에러: {type(e).__name__}: {str(e)}, "
            f"public_id: {public_id}"
        )
        raise


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_service: PlanService,
    plan_data: PlanCreate,
) -> PlanRead:
    return await plan_service.create(plan_data=plan_data)


@router.patch("/{plan_id}", status_code=status.HTTP_200_OK)
async def update_plan(
    plan_service: PlanService,
    plan_id: int,
    update_data: PlanUpdate,
) -> PlanRead:
    return await plan_service.update(plan_id=plan_id, update_data=update_data)


@router.patch("/{plan_id}/memo", status_code=status.HTTP_204_NO_CONTENT)
async def set_plan_memo(
    plan_service: PlanService,
    plan_id: int,
    memo_data: PlanMemoUpdate,
) -> None:
    await plan_service.set_memo(plan_id=plan_id, memo_data=memo_data)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_service: PlanService,
    plan_id: int,
) -> None:
    await plan_service.delete(plan_id=plan_id)


# --- Sharing ---
@router.get("/{plan_id}/shares", status_code=status.HTTP_200_OK)
async def list_shares(
    plan_service: PlanService,
    plan_id: int,
) -> list[ShareRead]:
    return await plan_service.list_shares(plan_id=plan_id)


@router.post("/{plan_id}/shares", status_code=status.HTTP_204_NO_CONTENT)
async def add_share(
    plan_service: PlanService,
    plan_id: int,
    body: ShareCreate,
) -> None:
    await plan_service.add_share(plan_id=plan_id, user_id=body.user_id, role=body.role)


@router.delete("/{plan_id}/shares/{handle}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_share(
    plan_service: PlanService,
    plan_id: int,
    handle: str,
) -> None:
    await plan_service.revoke_share(plan_id=plan_id, handle=handle)


# --- Invitations ---
@router.post("/{plan_id}/invitations", status_code=status.HTTP_204_NO_CONTENT)
async def create_invitation(
    plan_service: PlanService,
    plan_id: int,
    body: InvitationCreate,
):
    await plan_service.create_invitation(
        plan_id=plan_id,
        email=body.email,
        role=body.role,
        expires_days=body.expires_days,
        invited_by=plan_service.current_user.id,
    )


@router.post("/invitations/{token}/accept", status_code=status.HTTP_204_NO_CONTENT)
async def accept_invitation(
    plan_service: PlanService,
    token: str,
) -> None:
    await plan_service.accept_invitation(token=token)
