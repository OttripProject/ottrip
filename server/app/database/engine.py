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
            pool_pre_ping=True,  # 연결 사용 전에 살아있는지 확인
            # Session 모드에서는 pool_size만큼만 사용 가능 (max_overflow 무시됨)
            # 동시 요청이 많을 때를 고려하여 pool_size 증가
            pool_size=25,  # 15 -> 25로 증가 (동시 연결 수 증가)
            max_overflow=0,  # Session 모드에서는 사용되지 않음
            # 연결 재사용 시간 (초) - 너무 짧으면 재연결 오버헤드, 너무 길면 연결 누수 가능
            pool_recycle=3600,  # 300 -> 3600 (1시간)로 증가
            # 연결 타임아웃 (초) - 연결을 기다리는 최대 시간
            pool_timeout=30,  # 기본값 30초 유지
            echo=False,  # SQL 로깅 비활성화 (성능 향상)
        )
        session_factory = async_sessionmaker(
            bind=engine,
            expire_on_commit=False,
            class_=AsyncSession,
        )

        _engine_cache[loop] = EngineCache(engine=engine, sessionmaker=session_factory)

    return _engine_cache[loop]
