import asyncio
from typing import Dict, NamedTuple

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import database_settings


class EngineCache(NamedTuple):
    engine: AsyncEngine
    sessionmaker: async_sessionmaker[AsyncSession]


_engine_cache: Dict[asyncio.AbstractEventLoop, EngineCache] = {}


def get_engine() -> EngineCache:
    """
    전역 엔진을 사용하면 Event loop mismatch가 발생할 수 있으므로
    이벤트 루프별로 엔진을 만들어서 사용하도록 합니다.
    """
    loop = asyncio.get_event_loop()

    if loop not in _engine_cache:
        engine = create_async_engine(
            database_settings.DATABASE_URI,
            pool_pre_ping=True,
            pool_size=15,  # Session 모드에서는 pool_size만큼만 사용 가능 (max_overflow 무시됨)
            max_overflow=0,  # Session 모드에서는 사용되지 않음
            pool_recycle=300,
        )
        session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

        _engine_cache[loop] = EngineCache(engine=engine, sessionmaker=session_factory)

    return _engine_cache[loop]
