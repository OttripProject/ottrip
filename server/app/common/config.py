from pydantic_settings import BaseSettings


class EmailSettings(BaseSettings):
    # CORS/Links
    CORS_ALLOWED_ORIGINS: str = ""
    INVITE_ACCEPT_URL_BASE: str = "http://localhost:8081"

    # SMTP (optional when using HTTP email provider)
    EMAIL_FROM: str = "no-reply@localhost"
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASS: str | None = None
    SMTP_SSL: bool = False
    SMTP_STARTTLS: bool = True


email_settings = EmailSettings()


class CommonSettings(BaseSettings):
    EMAIL_PROVIDER: str | None = None  
    SENDGRID_API_KEY: str | None = None
    EMAIL_FROM: str | None = None  

common_settings = CommonSettings()


