import logging

from fastapi import FastAPI

from app.core.config import core_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.dev.router import router as dev_router

from . import api

configure_logging()


# 환경에 따라 Swagger 설정
def create_app() -> FastAPI:
    if core_settings.ENVIRONMENT == "prod":
        # 프로덕션: Swagger 완전 비활성화
        app = FastAPI(
            title="OTTRIP API",  # API 이름은 유지
            docs_url=None,  # Swagger UI 비활성화
            redoc_url=None,  # ReDoc 비활성화
            openapi_url=None,  # OpenAPI 스키마도 비활성화
        )
    else:
        # 개발/로컬: Swagger 활성화
        app = FastAPI(
            title="OTTRIP API",
            swagger_ui_parameters={"persistAuthorization": True},
        )

    return app


app = create_app()

logger = logging.getLogger(__name__)

app.include_router(api.router)

if core_settings.ENVIRONMENT in ["local", "dev"]:
    app.include_router(dev_router, prefix="/dev", tags=["Development"])


register_exception_handlers(app)


@app.get("/")
def main():
    return {"hello": "showbility"}
