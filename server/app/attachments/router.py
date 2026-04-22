from fastapi import Query, status

from app.core.router import create_router

from .models import AttachmentEntityType
from .schemas import (
    AttachmentConfirmRequest,
    AttachmentRead,
    PresignedUploadRequest,
    PresignedUploadResponse,
)
from .service import AttachmentService

router = create_router()


@router.post("/presigned-upload", status_code=status.HTTP_200_OK)
async def get_presigned_upload_url(
    attachment_service: AttachmentService,
    request: PresignedUploadRequest,
) -> PresignedUploadResponse:
    return await attachment_service.get_presigned_upload_url(request=request)


@router.post("/confirm", status_code=status.HTTP_201_CREATED)
async def confirm_upload(
    attachment_service: AttachmentService,
    request: AttachmentConfirmRequest,
) -> AttachmentRead:
    return await attachment_service.confirm_upload(request=request)


@router.get("", status_code=status.HTTP_200_OK)
async def list_attachments(
    attachment_service: AttachmentService,
    plan_id: int = Query(...),
    entity_type: AttachmentEntityType = Query(...),
    entity_id: int = Query(...),
) -> list[AttachmentRead]:
    return await attachment_service.list_by_entity(
        entity_type=entity_type,
        entity_id=entity_id,
        plan_id=plan_id,
    )


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_service: AttachmentService,
    attachment_id: int,
) -> None:
    await attachment_service.delete(attachment_id=attachment_id)
