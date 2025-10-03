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

    # OpenAI 설정
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    DEFAULT_MODEL: str = "gpt-4o-mini"    
    AI_TIMEOUT: int = 30 
    MAX_RETRIES: int = 3 
    ASSIST_SYSTEM_PROMPT: str = (
        "당신은 항공권 텍스트 분석 전문가입니다. 정확하고 구조화된 JSON 응답을 제공해주세요."
    )

ai_settings = AIConfig.create()