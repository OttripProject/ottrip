import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

# from app.storage.exceptions import StorageError

logger = logging.getLogger("uvicorn.error")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):  # type: ignore
        # 민감한 정보 제외: 상태 코드와 에러 타입만 로깅
        logger.error(f"HTTPException: status_code={exc.status_code}, detail_type={type(exc.detail).__name__}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):  # type: ignore
        # 민감한 정보 제외: 예외 타입과 메시지만 로깅 (전체 traceback은 제외)
        error_type = type(exc).__name__
        error_message = str(exc) if exc else "Unknown error"
        # 에러 메시지가 너무 길거나 민감한 정보를 포함할 수 있는 경우 제한
        if len(error_message) > 200:
            error_message = error_message[:200] + "..."
        logger.error(f"Unhandled error: {error_type}: {error_message}")
        return JSONResponse(
            status_code=500, content={"detail": "Internal server error"}
        )

    # @app.exception_handler(StorageError)
    # async def storage_error_handler(request: Request, exc: StorageError):  # type: ignore
    #     logger.error(f"Storage error: {str(exc)}")
    #     return JSONResponse(
    #         status_code=exc.status_code,
    #         content={"detail": exc.detail},
    #     )
