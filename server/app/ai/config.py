from typing import List

from app.config import BaseConfig


class AIConfig(BaseConfig):
    # Google Cloud Vision API 설정
    GOOGLE_CREDENTIALS_JSON: str
    MAX_FILE_SIZE: int = 10 * 1024 * 1024
    ALLOWED_IMAGE_TYPES: List[str] = [
        "image/jpeg", "image/png", "image/gif", "image/bmp", 
        "image/webp", "image/tiff"
    ]
    ALLOWED_PDF_TYPES: List[str] = ["application/pdf"]

    AI_TIMEOUT: int = 30
    MAX_RETRIES: int = 3

    # Gemini 설정 (google-genai SDK, GOOGLE_API_KEY 환경변수도 지원)
    GEMINI_API_KEY: str = ""
    GEMINI_DEFAULT_MODEL: str = "gemini-3-flash-preview"

    CHECKLIST_SYSTEM_PROMPT: str = (
        "You are a travel packing checklist expert. Respond strictly in JSON format matching the example output. "
    )
    DOCUMENT_UPLOAD_ANALYZE_SYSTEM_PROMPT: str = (
        "You classify a single travel-related document from OCR text and return one JSON object: "
        "success, inferred_item_type (flight|itinerary|accommodation|expense), error, and draft "
        "with item_type matching inferred_item_type and payload containing values (Create-shaped, no plan_id) "
        "and field_meta (dot paths to certainty and editable flags). No markdown, JSON only."
    )

ai_settings = AIConfig.create()