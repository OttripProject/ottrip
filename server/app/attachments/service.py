import asyncio
import uuid

from fastapi import HTTPException
from types_aiobotocore_s3.client import S3Client

from app.auth.deps import RequireRegisteredUser
from app.plans.repository import PlanRepository
from app.storage.config import storage_settings
from app.storage.deps import S3ClientDep
from app.utils.dependency import dependency

from .models import Attachment, AttachmentEntityType
from .repository import AttachmentRepository
from .schemas import (
    ALLOWED_CONTENT_TYPES,
    AttachmentConfirmRequest,
    AttachmentRead,
    PresignedUploadRequest,
    PresignedUploadResponse,
)


async def cascade_delete_attachments(
    *,
    entity_type: AttachmentEntityType,
    entity_id: int,
    attachment_repository: AttachmentRepository,
    s3_client: S3Client,
) -> None:
    """
    특정 엔티티에 속한 첨부파일을 R2(병렬)와 DB에서 삭제합니다.
    각 entity service의 delete 메서드에서 호출하세요.
    """
    attachments = await attachment_repository.find_by_entity(
        entity_type=entity_type,
        entity_id=entity_id,
    )
    if not attachments:
        return

    await asyncio.gather(
        *[
            s3_client.delete_object(
                Bucket=storage_settings.R2_BUCKET_NAME,
                Key=a.file_key,
            )
            for a in attachments
        ]
    )
    await attachment_repository.remove_by_entity(
        entity_type=entity_type,
        entity_id=entity_id,
    )


async def delete_r2_objects_by_keys(*, s3_client: S3Client, keys: list[str]) -> None:
    """R2에 있는 객체를 병렬 삭제합니다. DB는 호출 전에 이미 반영된 상태여야 합니다."""
    keys = [k.strip() for k in keys if k and k.strip()]
    if not keys:
        return
    await asyncio.gather(
        *[
            s3_client.delete_object(
                Bucket=storage_settings.R2_BUCKET_NAME,
                Key=key,
            )
            for key in keys
        ]
    )


@dependency
class AttachmentService:
    current_user: RequireRegisteredUser
    s3_client: S3ClientDep
    attachment_repository: AttachmentRepository
    plan_repository: PlanRepository

    async def get_presigned_upload_url(
        self, *, request: PresignedUploadRequest
    ) -> PresignedUploadResponse:
        if request.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 파일 형식입니다. 허용: {', '.join(ALLOWED_CONTENT_TYPES)}",
            )

        plan_exists, has_permission = await self.plan_repository.has_edit_permission(
            plan_id=request.plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(status_code=403, detail="첨부파일 업로드 권한이 없습니다.")

        ext = request.file_name.rsplit(".", 1)[-1].lower() if "." in request.file_name else ""
        file_key = (
            f"attachments/{request.plan_id}"
            f"/{request.entity_type.value}"
            f"/{request.entity_id}"
            f"/{uuid.uuid4()}.{ext}"
        )

        upload_url = await self.s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": storage_settings.R2_BUCKET_NAME,
                "Key": file_key,
                "ContentType": request.content_type,
                "ContentLength": request.file_size,
            },
            ExpiresIn=storage_settings.PRESIGNED_URL_EXPIRES_IN,
        )

        public_url = f"{storage_settings.R2_PUBLIC_URL}/{file_key}"

        return PresignedUploadResponse(
            upload_url=upload_url,
            file_key=file_key,
            public_url=public_url,
            expires_in=storage_settings.PRESIGNED_URL_EXPIRES_IN,
        )

    async def confirm_upload(
        self, *, request: AttachmentConfirmRequest
    ) -> AttachmentRead:
        """앱이 R2에 직접 업로드 완료 후 DB에 첨부파일 정보를 저장합니다."""
        if request.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 파일 형식입니다. 허용: {', '.join(ALLOWED_CONTENT_TYPES)}",
            )

        expected_prefix = (
            f"attachments/{request.plan_id}"
            f"/{request.entity_type.value}"
            f"/{request.entity_id}/"
        )
        if not request.file_key.startswith(expected_prefix):
            raise HTTPException(status_code=400, detail="유효하지 않은 파일 경로입니다.")

        plan_exists, has_permission = await self.plan_repository.has_edit_permission(
            plan_id=request.plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(status_code=403, detail="첨부파일 등록 권한이 없습니다.")

        existing = await self.attachment_repository.find_by_key(file_key=request.file_key)
        if existing:
            raise HTTPException(status_code=409, detail="이미 등록된 파일입니다.")

        attachment = Attachment(
            entity_type=request.entity_type,
            entity_id=request.entity_id,
            file_name=request.file_name,
            file_key=request.file_key,
            file_url=request.public_url,
            content_type=request.content_type,
            file_size=request.file_size,
            plan_id=request.plan_id,
            uploaded_by=self.current_user.id,
        )
        saved = await self.attachment_repository.save(attachment=attachment)
        return AttachmentRead.model_validate(saved)

    async def list_by_entity(
        self,
        *,
        entity_type: AttachmentEntityType,
        entity_id: int,
        plan_id: int,
    ) -> list[AttachmentRead]:
        plan_exists, has_permission = await self.plan_repository.has_read_permission(
            plan_id=plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(status_code=403, detail="첨부파일 조회 권한이 없습니다.")

        attachments = await self.attachment_repository.find_by_entity(
            entity_type=entity_type,
            entity_id=entity_id,
        )
        return [AttachmentRead.model_validate(a) for a in attachments]

    async def delete(self, *, attachment_id: int) -> None:
        """단일 첨부파일을 R2와 DB에서 삭제합니다."""
        attachment = await self.attachment_repository.find_by_id(
            attachment_id=attachment_id
        )
        if not attachment:
            raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다.")

        plan_exists, has_permission = await self.plan_repository.has_edit_permission(
            plan_id=attachment.plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(status_code=403, detail="첨부파일 삭제 권한이 없습니다.")

        await self.s3_client.delete_object(
            Bucket=storage_settings.R2_BUCKET_NAME,
            Key=attachment.file_key,
        )
        await self.attachment_repository.remove(attachment_id=attachment_id)
