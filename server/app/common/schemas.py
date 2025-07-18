from typing import TypeVar  # Generic, List,

from app.schemas import APISchema

T = TypeVar("T")


class StatusResponse(APISchema):
    ok: bool
    message: str


class ValidationResult(APISchema):
    error: str | None


# class PaginationParams(APISchema):
#     cursor: int | None


# class Page(APISchema, Generic[T]):
#     list: List[T]
#     next_cursor: int | None


# class PageWithCount(Page[T], Generic[T]):
#     total_count: int
