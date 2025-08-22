import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

    # CORS 미들웨어 추가
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:8081",  # Expo 개발 서버
            "http://localhost:19006",  # Expo 웹
            "http://localhost:3000",   # 일반적인 개발 서버
            "http://127.0.0.1:8081",
            "http://127.0.0.1:19006",
            "http://127.0.0.1:3000",
            # 모든 localhost 변형 허용
            "http://localhost:*",
            "http://127.0.0.1:*",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Accept",
            "Accept-Language",
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Auth-Token",
            "X-Requested-With",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
        ],
        expose_headers=["*"],
        max_age=86400,  # 24시간 캐시
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
