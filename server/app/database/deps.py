from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from .engine import get_engine


async def get_db():
    engine = get_engine()

    async with engine.sessionmaker() as db:
        try:
            yield db
            await db.commit()
        except:
            await db.rollback()
            raise


SessionDep = Annotated[AsyncSession, Depends(get_db)]
