import logging
from typing import Annotated  # , Optional

from fastapi import Depends  # , Query
from httpx import AsyncClient

# from .schemas import PaginationParams

# httpx의 DEBUG 로깅 비활성화 (토큰 등 민감한 정보 노출 방지)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


async def get_http_client():
    async with AsyncClient() as client:
        yield client


HTTPClientDep = Annotated[AsyncClient, Depends(get_http_client)]


# def get_pagination_params(
#     cursor: Annotated[Optional[int], Query()] = None,
# ) -> PaginationParams:
#     return PaginationParams(cursor=cursor)


# PaginationDep = Annotated[PaginationParams, Depends(get_pagination_params)]
