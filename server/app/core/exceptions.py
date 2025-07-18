import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

# from app.storage.exceptions import StorageError

logger = logging.getLogger("uvicorn.error")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):  # type: ignore
        logger.error(f"HTTPException: {str(exc)}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):  # type: ignore
        logger.error(f"Unhandled error: {str(exc)}")
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
