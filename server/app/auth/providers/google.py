from typing import Any
from urllib.parse import urlencode

from fastapi import HTTPException
from httpx import AsyncClient
from pydantic import BaseModel, EmailStr

from app.auth.config import auth_settings


class GoogleUser(BaseModel):
    sub: str
    email: EmailStr
    email_verified: bool
    name: str | None = None
    picture: str | None = None


def get_google_login_url(state: str) -> str:
    params = {
        "client_id": auth_settings.GOOGLE_CLIENT_ID,
        "redirect_uri": auth_settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{'https://accounts.google.com/o/oauth2/v2/auth'}?{urlencode(params)}"


async def get_google_token(*, client: AsyncClient, code: str) -> dict[str, Any]:
    response = await client.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": auth_settings.GOOGLE_CLIENT_ID,
            "client_secret": auth_settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": auth_settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to fetch Google token")

    return response.json()


async def get_google_user(*, client: AsyncClient, access_token: str) -> GoogleUser:
    response = await client.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to fetch user info")

    return GoogleUser(**response.json())
