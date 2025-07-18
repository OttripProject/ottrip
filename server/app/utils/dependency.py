from dataclasses import dataclass
from typing import Annotated, cast

from fastapi import Depends


def dependency[T: type](cls: T) -> T:
    alias = Annotated[cls, Depends(cast(T, dataclass(cls)))]
    return cast(T, alias)
