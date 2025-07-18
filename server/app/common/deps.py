from typing import Annotated  # , Optional

from fastapi import Depends  # , Query
from httpx import AsyncClient

# from .schemas import PaginationParams


async def get_http_client():
    async with AsyncClient() as client:
        yield client


HTTPClientDep = Annotated[AsyncClient, Depends(get_http_client)]


# def get_pagination_params(
#     cursor: Annotated[Optional[int], Query()] = None,
# ) -> PaginationParams:
#     return PaginationParams(cursor=cursor)


# PaginationDep = Annotated[PaginationParams, Depends(get_pagination_params)]
