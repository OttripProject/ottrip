from enum import Enum

from app.config import BaseConfig


class Environment(str, Enum):
    LOCAL = "local"
    DEV = "dev"
    PROD = "prod"


class CoreConfig(BaseConfig):
    ENVIRONMENT: Environment = Environment.LOCAL


core_settings = CoreConfig.create()
