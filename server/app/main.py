import logging

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

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


@app.get("/privacy", response_class=HTMLResponse, include_in_schema=False)
def privacy_policy():
    html = """<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>개인정보 처리방침 | OTTRIP</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f9f9f9; color: #1a1a1a; }
    .container { max-width: 720px; margin: 0 auto; padding: 48px 24px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    .effective-date { font-size: 14px; color: #666; margin-bottom: 40px; }
    h2 { font-size: 16px; font-weight: 700; margin-top: 32px; margin-bottom: 12px; }
    p, li { font-size: 15px; line-height: 1.7; color: #333; }
    ul { padding-left: 20px; margin-top: 8px; }
    li { margin-bottom: 4px; }
    .section { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>개인정보 처리방침</h1>
    <p class="effective-date">시행일: 2026년 3월 15일</p>

    <div class="section">
      <h2>1. 수집 항목</h2>
      <ul>
        <li><strong>필수:</strong> 이메일(구글 계정 로그인 시 제공), 닉네임, 성별(이모지 선택)</li>
        <li><strong>자동 수집:</strong> 접속 기록, 서비스 이용 기록, 쿠키, 기기 정보(브라우저 종류, OS 등)</li>
      </ul>
    </div>

    <div class="section">
      <h2>2. 수집 목적</h2>
      <ul>
        <li>회원 식별 및 본인 확인</li>
        <li>여행 일정 및 비용 데이터 저장·관리</li>
        <li>서비스 제공, 운영 및 품질 개선</li>
        <li>공지사항 전달 및 이용자 문의 대응</li>
        <li>부정 이용 방지 및 안전한 서비스 이용 환경 조성</li>
      </ul>
    </div>

    <div class="section">
      <h2>3. 보유 및 이용 기간</h2>
      <ul>
        <li>원칙적으로 회원 탈퇴 시 지체 없이 파기</li>
        <li>단, 관련 법령에 따라 아래와 같이 일정 기간 보관할 수 있음
          <ul>
            <li>계약·청약철회 기록: 5년 (전자상거래법)</li>
            <li>대금 결제 및 재화 공급 기록: 5년 (전자상거래법)</li>
            <li>소비자 불만 및 분쟁처리 기록: 3년 (전자상거래법)</li>
            <li>서비스 접속 기록: 3개월 (통신비밀보호법)</li>
          </ul>
        </li>
      </ul>
    </div>

    <div class="section">
      <h2>4. 동의 거부 권리 및 불이익 안내</h2>
      <ul>
        <li>회원은 개인정보 수집·이용에 동의하지 않을 권리가 있습니다.</li>
        <li>단, 필수 항목에 동의하지 않을 경우 회원가입 및 서비스 이용이 제한됩니다.</li>
      </ul>
    </div>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html)
