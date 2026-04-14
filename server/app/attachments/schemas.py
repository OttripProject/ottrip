from datetime import datetime

from pydantic import Field

from app.schemas import APISchema

from .models import AttachmentEntityType

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
}

MAX_FILE_SIZE = 20 * 1024 * 1024
"""최대 파일 크기: 20MB"""


class PresignedUploadRequest(APISchema):
    plan_id: int
    entity_type: AttachmentEntityType
    entity_id: int
    file_name: str = Field(..., max_length=255)
    content_type: str = Field(..., max_length=100)
    file_size: int = Field(..., gt=0, le=MAX_FILE_SIZE)


class PresignedUploadResponse(APISchema):
    upload_url: str
    file_key: str
    public_url: str
    expires_in: int


class AttachmentConfirmRequest(APISchema):
    plan_id: int
    entity_type: AttachmentEntityType
    entity_id: int
    file_key: str
    file_name: str = Field(..., max_length=255)
    content_type: str = Field(..., max_length=100)
    file_size: int = Field(..., gt=0, le=MAX_FILE_SIZE)
    public_url: str


class AttachmentRead(APISchema):
    id: int
    entity_type: AttachmentEntityType
    entity_id: int
    file_name: str
    file_url: str
    content_type: str
    file_size: int
    plan_id: int
    uploaded_by: int
    created_at: datetime
