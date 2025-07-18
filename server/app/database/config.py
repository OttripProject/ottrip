from urllib.parse import urlencode

from app.config import BaseConfig


class DatabaseConfig(BaseConfig):
    POSTGRES_HOST: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_SSL: bool = False

    def create_database_uri(self, *, dialect: str, options: dict[str, str] | None):
        return (
            f"postgresql+{dialect}://"
            + f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}/{self.POSTGRES_DB}"
            + (f"?{urlencode(options)}" if options else "")
        )

    @property
    def DATABASE_URI(self):
        return self.create_database_uri(
            dialect="asyncpg",
            options={"ssl": "require"} if self.POSTGRES_SSL else None,
        )


database_settings = DatabaseConfig.create()
