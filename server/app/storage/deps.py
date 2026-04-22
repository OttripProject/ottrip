from typing import Annotated

import aioboto3
from aiobotocore.config import AioConfig
from fastapi import Depends
from types_aiobotocore_s3.client import S3Client

from app.storage.config import storage_settings


async def get_s3_client():
    session = aioboto3.Session()
    async with session.client(
        "s3",
        endpoint_url=storage_settings.S3_ENDPOINT_URL,
        aws_access_key_id=storage_settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=storage_settings.R2_SECRET_ACCESS_KEY,
        config=AioConfig(signature_version="s3v4"),
        region_name="auto",
    ) as s3:
        yield s3


S3ClientDep = Annotated[S3Client, Depends(get_s3_client)]
