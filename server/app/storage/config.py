from app.config import BaseConfig


class StorageConfig(BaseConfig):
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str
    R2_BUCKET_NAME: str
    R2_PUBLIC_URL: str
    """R2 Public URL (e.g. https://pub-xxxx.r2.dev)"""

    PRESIGNED_URL_EXPIRES_IN: int = 300
    """Presigned URL 만료 시간 (초, 기본 5분)"""

    @property
    def S3_ENDPOINT_URL(self) -> str:
        return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"


storage_settings = StorageConfig.create()
