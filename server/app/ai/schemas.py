from typing import Any
from app.schemas import APISchema


class AIFlightBase(APISchema):
    success: bool
    text: str
    confidence: float

class AIFlightRead(AIFlightBase):
    pass


class AIParseResponse(APISchema):
    success: bool
    data: dict[str, Any] | None = None
    error: str | None = None
    confidence: float | None = None
    reasoning: str | None = None


# Travel Checklist Schemas
class ChecklistItem(APISchema):
    id: int
    name: str
    reason: str
    is_checked: bool = False


class ChecklistItemsByCategory(APISchema):
    basic_required: list[ChecklistItem] = []
    schedule_required: list[ChecklistItem] = []
    recommended: list[ChecklistItem] = []
    optional: list[ChecklistItem] = []


class ChecklistRead(APISchema):
    categories: ChecklistItemsByCategory


class ChecklistCreateRequest(APISchema):
    force_regenerate: bool = False


class ChecklistCreateResponse(APISchema):
    success: bool
    message: str
    checklist: ChecklistRead | None = None


class ChecklistUpdateRequest(APISchema):
    checklist: ChecklistRead


class ChecklistItemCheckRequest(APISchema):
    is_checked: bool