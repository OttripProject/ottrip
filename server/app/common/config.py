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


email_settings = EmailConfig.create()


