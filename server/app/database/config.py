from urllib.parse import urlencode

from app.config import BaseConfig


class DatabaseConfig(BaseConfig):
    POSTGRES_HOST: str | None = None
    POSTGRES_USER: str | None = None
    POSTGRES_PASSWORD: str | None = None
    POSTGRES_DB: str | None = None
    POSTGRES_SSL: bool = False
    # Optional unified URL override (e.g., Render/Cloud providers)
    DATABASE_URL: str | None = None

    def create_database_uri(self, *, dialect: str, options: dict[str, str] | None):
        if not (self.POSTGRES_HOST and self.POSTGRES_USER and self.POSTGRES_PASSWORD and self.POSTGRES_DB):
            raise ValueError(
                "POSTGRES_* variables are required when DATABASE_URL is not set."
            )
        return (
            f"postgresql+{dialect}://"
            + f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}/{self.POSTGRES_DB}"
            + (f"?{urlencode(options)}" if options else "")
        )

    @property
    def DATABASE_URI(self):
        # If DATABASE_URL is provided, honor it and ensure async driver is used
        if self.DATABASE_URL and self.DATABASE_URL.strip():
            url = self.DATABASE_URL.strip()
            # Normalize common postgres schemes to asyncpg dialect for SQLAlchemy
            if url.startswith("postgres://"):
                url = "postgresql+asyncpg://" + url[len("postgres://") :]
            elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
                url = "postgresql+asyncpg://" + url[len("postgresql://") :]
            
            if self.POSTGRES_SSL:
                url += "?ssl=require"
            
            return url

database_settings = DatabaseConfig.create()
