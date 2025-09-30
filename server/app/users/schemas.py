import re
from typing import Annotated

from pydantic import EmailStr, Field

from app.schemas import APISchema

from .models import Gender

Handle = Annotated[
    str,
    Field(min_length=2, max_length=36, pattern=re.compile(r"^[a-z0-9_.-]+$")),
]

Description = Annotated[
    str,
    Field(
        "",
        max_length=1000,
    ),
]


class UserBase(APISchema):
    handle: Handle
    nickname: str
    description: Description
    gender: Gender


class UserCreate(UserBase):
    agreed_terms: bool | None = None
    agreed_privacy: bool | None = None
    agreed_marketing: bool | None = None


class UserUpdate(APISchema):
    nickname: str | None = None
    description: Description | None = None
    gender: Gender | None = None


class UserRead(UserBase):
    email: EmailStr
