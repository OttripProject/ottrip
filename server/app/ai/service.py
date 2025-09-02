from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel

from .config import ai_settings


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: Optional[str] = None
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    response_format: Optional[Dict[str, Any]] = None


class OpenAIService:
    def __init__(self, *, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or ai_settings.OPENAI_API_KEY
        self.base_url = (base_url or ai_settings.OPENAI_BASE_URL).rstrip("/")

    async def chat(self, payload: ChatRequest) -> Dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        model = payload.model or ai_settings.DEFAULT_MODEL
        request_json: Dict[str, Any] = {
            "model": model,
            "messages": [m.model_dump() for m in payload.messages],
            "temperature": payload.temperature,
        }
        if payload.max_tokens is not None:
            request_json["max_tokens"] = payload.max_tokens
        if payload.response_format is not None:
            request_json["response_format"] = payload.response_format

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=request_json, headers=headers)
            resp.raise_for_status()
            data: Dict[str, Any] = resp.json()
            return data


