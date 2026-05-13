from enum import Enum
from typing import Annotated, Any, Literal, Union

from pydantic import Field

from app.schemas import APISchema


class ItemType(str, Enum):
    FLIGHT = "flight"
    ITINERARY = "itinerary"
    ACCOMMODATION = "accommodation"
    EXPENSE = "expense"


# ---------------------------------------------------------------------------
# 문서 텍스트 추출 (이미지 OCR / PDF 텍스트 레이어)
# ---------------------------------------------------------------------------
class DocumentTextExtraction(APISchema):
    """이미지·PDF 등에서 추출한 원시 텍스트."""

    success: bool
    text: str
    confidence: float


# ---------------------------------------------------------------------------
# LLM JSON 파싱 (체크리스트·레거시 항공 파싱 등 공통 래퍼)
# ---------------------------------------------------------------------------
class AIParseResponse(APISchema):
    success: bool
    data: dict[str, Any] | None = None
    error: str | None = None
    confidence: float | None = None
    reasoning: str | None = None


# ---------------------------------------------------------------------------
# 파일 1개 → 타입 추론 + 초안 (Gemini 1-call) 응답 계약
# ---------------------------------------------------------------------------
class FlightItemDraft(APISchema):
    """항공 초안. `payload`는 기존 항공 JSON(배열 루트 등) 그대로 둘 수 있음."""

    item_type: Literal[ItemType.FLIGHT] = ItemType.FLIGHT
    payload: Any = None


class ItineraryItemDraft(APISchema):
    item_type: Literal[ItemType.ITINERARY] = ItemType.ITINERARY
    payload: dict[str, Any] = Field(default_factory=dict)


class AccommodationItemDraft(APISchema):
    item_type: Literal[ItemType.ACCOMMODATION] = ItemType.ACCOMMODATION
    payload: dict[str, Any] = Field(default_factory=dict)


class ExpenseItemDraft(APISchema):
    item_type: Literal[ItemType.EXPENSE] = ItemType.EXPENSE
    payload: dict[str, Any] = Field(default_factory=dict)


DocumentItemDraft = Annotated[
    Union[FlightItemDraft, ItineraryItemDraft, AccommodationItemDraft, ExpenseItemDraft],
    Field(discriminator="item_type"),
]


class DocumentUploadAnalyzeResponse(APISchema):
    """단일 업로드 파이프라인: 1-call로 추론된 아이템 타입 및 초안."""

    success: bool
    inferred_item_type: ItemType | None = None
    draft: DocumentItemDraft | None = None
    error: str | None = None


# Travel Checklist Schemas
class ChecklistItem(APISchema):
    id: int
    name: str
    reason: str
    is_checked: bool = False
    is_custom: bool = False  # True: 사용자 추가, False: AI 생성
    date: str | None = None


class ChecklistItemsByCategory(APISchema):
    basic_required: list[ChecklistItem] = []
    schedule_required: list[ChecklistItem] = []
    recommended: list[ChecklistItem] = []
    optional: list[ChecklistItem] = []


class ChecklistRead(APISchema):
    categories: ChecklistItemsByCategory


class ChecklistCreateRequest(APISchema):
    force_regenerate: bool = False
    date: str | None = None  # YYYY-MM-DD 형식, None이면 전체 체크리스트 항목


class ChecklistCreateResponse(APISchema):
    success: bool
    message: str
    checklist: ChecklistRead | None = None


class ChecklistUpdateRequest(APISchema):
    checklist: ChecklistRead


class ChecklistItemCheckRequest(APISchema):
    is_checked: bool


class ChecklistItemAddRequest(APISchema):
    name: str
    reason: str = ""
    category: str = "basic_required"  # basic_required, schedule_required, recommended, optional
    date: str | None = None
