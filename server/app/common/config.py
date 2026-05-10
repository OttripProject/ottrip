from app.config import BaseConfig


class EmailConfig(BaseConfig):
    CORS_ALLOWED_ORIGINS: str = ""
    INVITE_ACCEPT_URL_BASE: str = "http://localhost:8081"

    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASS: str | None = None
    SMTP_SSL: bool = False
    SMTP_STARTTLS: bool = True

    EMAIL_PROVIDER: str | None = None 
    SENDGRID_API_KEY: str | None = None
    RESEND_API_KEY: str | None = None
    EMAIL_FROM: str | None = None 

email_settings = EmailConfig()

