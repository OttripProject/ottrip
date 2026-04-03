import json
from pathlib import Path
from typing import Any

import fitz
import openai
from google import genai
from google.cloud import vision
from google.cloud.vision_v1 import types as vision_types
from google.oauth2 import service_account

from app.utils.dependency import dependency

from .config import ai_settings
from .schemas import AIFlightRead, AIParseResponse


@dependency
class VisionClient:

    @property
    def client(self):
        credentials_info = json.loads(ai_settings.GOOGLE_CREDENTIALS_JSON)
        credentials = service_account.Credentials.from_service_account_info(credentials_info)
        self._client = vision.ImageAnnotatorClient(credentials=credentials)

        return self._client
    
    async def extract_text_from_image(self, image_data: bytes) -> AIFlightRead:
        image_content = vision_types.Image(content=image_data)
        response = self.client.text_detection(image=image_content)
        
        texts = response.text_annotations
        
        if response.error.message:
            raise Exception(f"Vision API 오류: {response.error.message}")
        
        if not texts:
            return AIFlightRead(
                success=False,
                text="",
                confidence=0.0,
            )
        
        full_text = texts[0].description if texts else ""
        
        words = texts[1:] if len(texts) > 1 else []
        avg_confidence = sum(getattr(word, 'confidence', 0.0) for word in words) / len(words) if words else 0.0
        
        return AIFlightRead(
            success=True,
            text=full_text,
            confidence=avg_confidence,
        )

    
    async def extract_text_from_pdf(self, pdf_data: bytes) -> AIFlightRead:
        doc = fitz.open(stream=pdf_data, filetype="pdf")
        full_text = ""
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            full_text += page.get_text() + "\n"
        
        doc.close()
        
        return AIFlightRead(
            success=True,
            text=full_text,
            confidence=0.0, 
        )
        # google vision api 사용
        # try:
        #     image_content = vision_types.Image(content=pdf_data)
        #     response = self.client.document_text_detection(image=image_content)
            
        #     print("response : ", response)
        #     if response.error.message:
        #         raise Exception(f"Vision API 오류: {response.error.message}")
            
        #     full_text_annotation = response.full_text_annotation
        #     if not full_text_annotation:
        #         return AIFlightRead(
        #             success=False,
        #             text="",
        #             confidence=0.0,
        #         )
            
        #     extracted_text = full_text_annotation.text
            
        #     pages = full_text_annotation.pages
        #     page_count = len(pages)
            
        #     total_confidence = 0.0
        #     valid_pages = 0
            
        #     for page in pages:
        #         blocks = page.blocks
        #         for block in blocks:
        #             if hasattr(block, 'confidence') and block.confidence > 0:
        #                 total_confidence += block.confidence
        #                 valid_pages += 1
            
        #     avg_confidence = total_confidence / valid_pages if valid_pages > 0 else 0.0
            
        #     return AIFlightRead(
        #         success=True,
        #         text=extracted_text,
        #         confidence=avg_confidence,
        #     )
            
        # except Exception as e:
        #     return AIFlightRead(
        #         success=False,
        #         text="",
        #         confidence=0.0,
        #     )


@dependency
class OpenAIClient:
    """OpenAI API 클라이언트"""
    
    def __init__(self):
        self._client = None
    
    @property
    def client(self) -> openai.AsyncOpenAI:
        """OpenAI 클라이언트 인스턴스 반환"""
        if self._client is None:
            self._client = openai.AsyncOpenAI(
                api_key=ai_settings.OPENAI_API_KEY,
                base_url=ai_settings.OPENAI_BASE_URL
            )
        return self._client
    
    async def parse_flight_data(self, ocr_text: str) -> AIParseResponse:
        """AI로 항공권 데이터 파싱"""
        try:
            prompt_path = Path(__file__).parent / "prompt" / "flights.txt"
            with open(prompt_path, "r", encoding="utf-8") as f:
                prompt_template = f.read()
            
            prompt = prompt_template.format(ocr_text=ocr_text)

            response = await self.client.chat.completions.create(
                model=ai_settings.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": ai_settings.FLIGHT_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                timeout=ai_settings.AI_TIMEOUT
            )
            
            ai_response = response.choices[0].message.content
            if not ai_response:
                return AIParseResponse(
                    success=False,
                    error="AI 응답이 비어있습니다."
                )
            
            try:
                result = json.loads(ai_response.strip())
                return AIParseResponse(**result)
            except json.JSONDecodeError:
                return AIParseResponse(
                    success=False,
                    error="AI 응답을 파싱할 수 없습니다."
                )
            
        except Exception as e:
            return AIParseResponse(
                success=False,
                error=f"AI 파싱 중 오류 발생: {str(e)}"
            )
    
    async def generate_checklist(
        self,
        start_date: str,
        end_date: str,
        destinations: str,
        flights: str,
        itineraries: str,
        existing_checklist: str = ""
    ) -> AIParseResponse:
        """여행 체크리스트 생성"""
        try:
            prompt_path = Path(__file__).parent / "prompt" / "assistant.txt"
            with open(prompt_path, "r", encoding="utf-8") as f:
                prompt_template = f.read()
            
            prompt = prompt_template.format(
                start_date=start_date,
                end_date=end_date,
                destinations=destinations,
                flights=flights,
                itineraries=itineraries,
                existing_checklist=existing_checklist
            )
            
            response = await self.client.chat.completions.create(
                model=ai_settings.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": ai_settings.CHECKLIST_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                timeout=ai_settings.AI_TIMEOUT
            )
            
            ai_response = response.choices[0].message.content
            if not ai_response:
                return AIParseResponse(
                    success=False,
                    error="AI 응답이 비어있습니다."
                )
            
            try:
                result = json.loads(ai_response.strip())
                return AIParseResponse(
                    success=True,
                    data=result
                )
            except json.JSONDecodeError:
                return AIParseResponse(
                    success=False,
                    error="AI 응답을 파싱할 수 없습니다."
                )
            
        except Exception as e:
            return AIParseResponse(
                success=False,
                error=f"체크리스트 생성 중 오류 발생: {str(e)}"
            )


@dependency
class GeminiClient:
    """Google Gemini API 클라이언트 (google-genai SDK)."""

    def __init__(self) -> None:
        self._client: genai.Client | None = None

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            key = ai_settings.GEMINI_API_KEY or None
            self._client = genai.Client(api_key=key)
        return self._client

    async def generate_content(
        self,
        contents: str,
        *,
        config: genai.types.GenerateContentConfig | dict[str, Any] | None = None,
    ) -> str:
        response = await self.client.aio.models.generate_content(
            model=ai_settings.GEMINI_DEFAULT_MODEL,
            contents=contents,
            config=config,
        )
        text = getattr(response, "text", None)
        return text if text else ""
