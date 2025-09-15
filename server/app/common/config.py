from app.config import BaseConfig


class EmailConfig(BaseConfig):
    EMAIL_FROM: str = "Ottrip <noreply@ottrip.official.com>"
    SMTP_HOST: str
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASS: str
    SMTP_SSL: bool = False
    SMTP_STARTTLS: bool = True
    INVITE_ACCEPT_URL_BASE: str = (
        "http://localhost:8081"
    )
    # 추가: 배포 환경에서 CORS 오리진 허용을 위한 환경변수 입력(쉼표 구분)
    CORS_ALLOWED_ORIGINS: str = ""


email_settings = EmailConfig.create()


