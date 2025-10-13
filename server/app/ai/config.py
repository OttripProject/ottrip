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

    FLIGHT_SYSTEM_PROMPT: str = (
        "You are an expert in analyzing flight ticket text. Provide accurate and structured JSON responses."
    )
    CHECKLIST_SYSTEM_PROMPT: str = (
        "You are a travel packing checklist expert. Respond strictly in JSON format matching the example output. "
    )

ai_settings = AIConfig.create()