# app/logging/routes.py
import logging
import time
import uuid
from functools import partial

from fastapi import APIRouter, Request, Response
from fastapi.routing import APIRoute

logger = logging.getLogger("api")


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
            logger.info(
                f"Request completed: {request.method} {request.url.path} [{request_id}] "
                f"status={response.status_code} time={process_time:.2f}ms "
                f"response={bytes(response.body).decode('utf-8')}"
            )

            return response

        return custom_route_handler


create_router = partial(APIRouter, route_class=LoggingRoute)
"""모든 라우터 생성 시 사용할 헬퍼 함수"""
