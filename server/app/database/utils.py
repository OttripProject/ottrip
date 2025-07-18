from alembic import command, config
from sqlalchemy import Connection

from app.database.engine import get_engine


def run_upgrade(connection: Connection, cfg: config.Config):
    cfg.attributes["connection"] = connection
    command.upgrade(cfg, "head")


async def run_migrations():
    """Run alembic migrations in runtime

    https://alembic.sqlalchemy.org/en/latest/cookbook.html#programmatic-api-use-connection-sharing-with-asyncio
    """
    async with get_engine().engine.begin() as conn:
        await conn.run_sync(run_upgrade, config.Config("alembic.ini"))
