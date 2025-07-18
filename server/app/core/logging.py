import logging

from app.core.config import Environment, core_settings

_LOG_LEVEL_MAP = {
    Environment.LOCAL: "DEBUG",
    Environment.DEV: "INFO",
    Environment.PROD: "WARNING",
}


def get_log_level() -> str:
    """현재 환경에 맞는 로그 레벨 반환"""
    return _LOG_LEVEL_MAP.get(core_settings.ENVIRONMENT, "INFO")


LOG_FORMAT_DEBUG = "%(levelname)s:%(message)s:%(pathname)s:%(funcName)s:%(lineno)d"


def configure_logging():
    log_level = get_log_level()

    if log_level in ["DEBUG", "INFO"]:
        logging.basicConfig(level=log_level, format=LOG_FORMAT_DEBUG)
        return

    logging.basicConfig(level=log_level)
