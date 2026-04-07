import time
from typing import Annotated, Any, Optional, cast

import jwt
from fastapi import Depends, HTTPException
from httpx import AsyncClient
from jwt import PyJWK
from pydantic import BaseModel

from app.auth.config import auth_settings
from app.common.deps import get_http_client
from app.utils.dependency import dependency

_CLIENT_SECRET_ALG = "ES256"
_APPLE_ISSUER = "https://appleid.apple.com"
_JWKS_URL = "https://appleid.apple.com/auth/keys"
_TOKEN_URL = "https://appleid.apple.com/auth/token"
_REVOKE_URL = "https://appleid.apple.com/auth/revoke"


class AppleUserResponse(BaseModel):
    """검증된 Apple identity token 클레임."""

    sub: str
    email: Optional[str] = None
    name: Optional[str] = None


class AppleJwk(BaseModel):
    """Apple JWKS 키 항목 (일반적으로 RSA)."""

    model_config = {"extra": "ignore"}

    alg: str
    kid: str
    kty: str
    use: str = "sig"
    n: Optional[str] = None
    e: Optional[str] = None


class AppleJwks(BaseModel):
    keys: list[AppleJwk]


def normalize_boolean(value: bool | str | None) -> bool:
    """email_verified 등을 boolean으로 정규화."""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() not in ("false", "0", "")
    return bool(value) if value is not None else False


@dependency
class AppleIdpService:
    client: Annotated[AsyncClient, Depends(get_http_client)]

    async def verify_identity_token(self, identity_token: str) -> AppleUserResponse:
        """클라이언트가 받은 identity token(JWT)을 JWKS로 검증하고 sub/email을 반환합니다."""
        try:
            header = jwt.get_unverified_header(identity_token)
        except jwt.PyJWTError as e:
            raise HTTPException(status_code=401, detail="Invalid identity token") from e

        alg = header.get("alg")
        kid = header.get("kid")
        if alg is None or kid is None:
            raise HTTPException(status_code=401, detail="Invalid identity token header")

        public_key = await self._get_public_key(alg=str(alg), kid=str(kid))

        audiences = auth_settings.apple_identity_token_audiences
        if not audiences:
            raise HTTPException(
                status_code=500,
                detail="Apple JWT audience is not configured (APP_BUNDLE_IDS / APPLE_SERVICES_ID)",
            )

        try:
            payload = jwt.decode(
                identity_token,
                public_key,
                algorithms=[alg],
                audience=audiences,
                issuer=_APPLE_ISSUER,
            )
        except jwt.PyJWTError as e:
            raise HTTPException(status_code=401, detail="Invalid or expired identity token") from e

        sub = payload.get("sub")
        if not sub or not isinstance(sub, str):
            raise HTTPException(status_code=401, detail="Missing sub in identity token")

        email = payload.get("email")
        if email is not None and not isinstance(email, str):
            email = None
        email_verified = normalize_boolean(payload.get("email_verified"))
        if email is not None and not email_verified:
            email = None

        name: str | None = None
        raw_name = payload.get("name")
        if isinstance(raw_name, str):
            name = raw_name
        elif isinstance(raw_name, dict):
            d = cast(dict[str, Any], raw_name)
            first = d.get("firstName") or d.get("first_name")
            name = first if isinstance(first, str) else None

        return AppleUserResponse(sub=sub, email=email, name=name)

    async def _get_public_key(self, *, alg: str, kid: str) -> Any:
        # TODO: JWKS 캐시 (예: 24~48시간) — 매 요청마다 네트워크 호출은 비효율적
        response = await self.client.get(_JWKS_URL)
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch Apple JWKS")

        jwks = AppleJwks.model_validate_json(response.text)
        key_dict = next(
            (
                k.model_dump(exclude_none=True)
                for k in jwks.keys
                if k.kid == kid and k.alg == alg
            ),
            None,
        )
        if key_dict is None:
            raise HTTPException(
                status_code=401,
                detail=f"Apple public key not found for kid={kid} alg={alg}",
            )

        return PyJWK.from_dict(key_dict).key

    def _require_apple_server_credentials(self) -> None:
        if not all(
            [
                auth_settings.APPLE_TEAM_ID,
                auth_settings.APPLE_KEY_ID,
                auth_settings.APPLE_PRIVATE_KEY,
                auth_settings.APPLE_CLIENT_ID,
            ]
        ):
            raise HTTPException(
                status_code=503,
                detail="Apple server credentials are not configured (Team ID, Key ID, private key, client id)",
            )

    async def _generate_client_secret(self) -> str:
        """Apple API 호출용 client_secret JWT (ES256). sub = Services ID (client id)."""
        self._require_apple_server_credentials()
        raw_key = auth_settings.APPLE_PRIVATE_KEY
        assert raw_key is not None
        key_pem = raw_key.replace("\\n", "\n")
        headers = {"kid": auth_settings.APPLE_KEY_ID, "alg": _CLIENT_SECRET_ALG}
        now = int(time.time())
        payload = {
            "iss": auth_settings.APPLE_TEAM_ID,
            "iat": now,
            "exp": now + 24 * 3600,
            "aud": _APPLE_ISSUER,
            "sub": auth_settings.APPLE_CLIENT_ID,
        }
        return jwt.encode(payload, key_pem, algorithm=_CLIENT_SECRET_ALG, headers=headers)

    async def get_access_token_for_authorization_code(self, *, authorization_code: str) -> str:
        """authorization code 로 Apple access_token (웹 리다이렉트 플로우)."""
        self._require_apple_server_credentials()
        data = {
            "grant_type": "authorization_code",
            "code": authorization_code,
            "client_id": auth_settings.APPLE_CLIENT_ID,
            "client_secret": await self._generate_client_secret(),
        }
        response = await self.client.post(
            _TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=401,
                detail="Failed to exchange Apple authorization code",
            )
        body = response.json()
        token = body.get("access_token")
        if not token:
            raise HTTPException(status_code=401, detail="Missing access_token from Apple")
        return str(token)

    async def revoke_by_authorization_code(self, *, authorization_code: str) -> None:
        """authorization_code 로 access_token 발급 후 Apple /auth/revoke 호출."""
        access_token = await self.get_access_token_for_authorization_code(
            authorization_code=authorization_code
        )
        self._require_apple_server_credentials()
        data = {
            "client_id": auth_settings.APPLE_CLIENT_ID,
            "client_secret": await self._generate_client_secret(),
            "token": access_token,
            "token_type_hint": "access_token",
        }
        response = await self.client.post(
            _REVOKE_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail="Failed to revoke Apple token",
            )
