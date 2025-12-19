# app/logging/routes.py
import json
import logging
import re
import time
import uuid
from functools import partial

from fastapi import APIRouter, Request, Response
from fastapi.routing import APIRoute

logger = logging.getLogger("api")


def mask_sensitive_data(data: str) -> str:
    """응답 본문에서 민감한 정보(토큰 등)를 마스킹합니다."""
    if not data:
        return data
    
    try:
        # JSON 파싱 시도
        parsed = json.loads(data)
        
        # 토큰 필드 마스킹
        sensitive_fields = [
            'accessToken', 'access_token', 'refreshToken', 'refresh_token',
            'registerToken', 'register_token', 'id_token', 'idToken'
        ]
        
        def mask_recursive(obj):
            if isinstance(obj, dict):
                return {
                    k: mask_recursive(v) if k not in sensitive_fields else "***MASKED***"
                    for k, v in obj.items()
                }
            elif isinstance(obj, list):
                return [mask_recursive(item) for item in obj]
            return obj
        
        masked = mask_recursive(parsed)
        return json.dumps(masked, ensure_ascii=False)
    except (json.JSONDecodeError, TypeError):
        # JSON이 아니거나 파싱 실패 시 정규식으로 토큰 패턴 마스킹
        # JWT 토큰 패턴: 세 부분으로 나뉜 base64 문자열
        token_pattern = r'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
        masked = re.sub(token_pattern, '***MASKED_TOKEN***', data)
        return masked


class LoggingRoute(APIRoute):
    def get_route_handler(self):
        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request) -> Response:
            request_id = str(uuid.uuid4())
            start_time = time.time()

            logger.info(
                f"Request started: {request.method} {request.url.path} [{request_id}]"
            )

            response = await original_route_handler(request)

            process_time = (time.time() - start_time) * 1000
            
            # 응답 본문 읽기 (한 번만 읽을 수 있으므로 주의)
            response_body = bytes(response.body).decode('utf-8')
            masked_body = mask_sensitive_data(response_body)
            
            logger.info(
                f"Request completed: {request.method} {request.url.path} [{request_id}] "
                f"status={response.status_code} time={process_time:.2f}ms "
                f"response={masked_body}"
            )

            return response

        return custom_route_handler


create_router = partial(APIRouter, route_class=LoggingRoute)
"""모든 라우터 생성 시 사용할 헬퍼 함수"""
