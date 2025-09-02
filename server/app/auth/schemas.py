from datetime import datetime
from typing import Literal, Union

from pydantic import Field
from typing_extensions import Annotated

from app.schemas import APISchema


class PublicJWK(APISchema):
    """ES256 기준"""

    alg: Literal["ES256"]
    use: Literal["sig"]
    kty: Literal["EC"]
    crv: Literal["P-256"]
    x: str
    y: str
    kid: str


class PrivateJWK(PublicJWK):
    d: str


class ServerTime(APISchema):
    time: datetime


class PrefillCreateUser(APISchema):
    name: str | None
    nickname: str | None
    profile_image: str | None


class TokenResponse(APISchema):
    access_token: str
    refresh_token: str


class RegisteredAuthResponse(TokenResponse):
    is_registered: Literal[True] = True


class UnregisteredAuthResponse(APISchema):
    is_registered: Literal[False] = False
    register_token: str
    prefill: PrefillCreateUser


AuthResponse = Annotated[
    Union[RegisteredAuthResponse, UnregisteredAuthResponse],
    Field(discriminator="is_registered"),
]


class GoogleLoginUrlResponse(APISchema):
    url: str


class GoogleCallbackRequest(APISchema):
    code: str
    state: str = "default"
