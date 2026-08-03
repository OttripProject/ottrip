import logging

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.common.config import email_settings
from app.core.config import core_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.dev.router import router as dev_router

from . import api

configure_logging()

if core_settings.ENVIRONMENT == "prod":
    sentry_sdk.init(
        dsn=core_settings.SENTRY_DSN,
        send_default_pii=True,
    )


def create_app() -> FastAPI:
    if core_settings.ENVIRONMENT == "prod":
        app = FastAPI(
            title="OTTRIP API",
            docs_url=None,
            redoc_url=None,
            openapi_url=None,
            redirect_slashes=False,
        )
    else:
        app = FastAPI(
            title="OTTRIP API",
            swagger_ui_parameters={"persistAuthorization": True},
            redirect_slashes=False,
        )

    configured_origins = [
        origin.strip()
        for origin in email_settings.CORS_ALLOWED_ORIGINS.split(",")
        if origin.strip()
    ]
    if not configured_origins:
        configured_origins = [
            "http://localhost:8081",
            "http://localhost:19006",
            "http://localhost:3000",
            "http://127.0.0.1:8081",
            "http://127.0.0.1:19006",
            "http://127.0.0.1:3000",
        ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=configured_origins,
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
        max_age=86400,
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
    return {"hello": "ottrip"}
