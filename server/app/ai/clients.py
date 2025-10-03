import json
from typing import Dict, Any
from google.cloud import vision
from google.cloud.vision_v1 import types as vision_types
from google.oauth2 import service_account
import fitz
import openai

from app.utils.dependency import dependency

from .config import ai_settings
from .schemas import AIFlightRead


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
    
    async def parse_flight_data(self, ocr_text: str) -> Dict[str, Any]:
        """AI로 항공권 데이터 파싱"""
        try:
            prompt = f"""
항공권에서 추출된 텍스트를 분석하여 다음 정보를 JSON 형태로 추출해주세요:

텍스트:
{ocr_text}

추출할 정보:
- airline: 항공사명 (예: Korean Air, Asiana Airlines)
- flight_number: 항공편명 (예: KE 123, UA 456)
- departure_airport: 출발공항 코드 (예: ICN, NRT)
- arrival_airport: 도착공항 코드 (예: NRT, LAX)
- departure_date: 출발날짜 (YYYY-MM-DD 형식)
- departure_time: 출발시간 (HH:MM 형식)
- arrival_date: 도착날짜 (YYYY-MM-DD 형식, 있다면)
- arrival_time: 도착시간 (HH:MM 형식, 있다면)
- departure_city: 출발도시 (예: Seoul, Tokyo)
- arrival_city: 도착도시 (예: Tokyo, Los Angeles)

응답 형식:
{{
    "success": true,
    "data": {{
        "airline": "Korean Air",
        "flight_number": "KE 123",
        "departure_airport": "ICN",
        "arrival_airport": "NRT",
        "departure_date": "2024-01-15",
        "departure_time": "14:30",
        "arrival_date": null,
        "arrival_time": null,
        "departure_city": "Seoul",
        "arrival_city": "Tokyo"
    }},
    "confidence": 0.95,
    "reasoning": "추출 과정 설명"
}}

정보를 찾을 수 없는 필드는 null로 설정하고, confidence는 0.0-1.0 사이의 값으로 설정해주세요.
"""

            response = await self.client.chat.completions.create(
                model=ai_settings.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": ai_settings.ASSIST_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # 일관된 결과를 위해 낮은 temperature
                timeout=ai_settings.AI_TIMEOUT
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # JSON 파싱
            try:
                result = json.loads(ai_response)
                return result
            except json.JSONDecodeError:
                # JSON 파싱 실패 시 기본 응답
                return {
                    "success": False,
                    "error": "AI 응답을 파싱할 수 없습니다.",
                    "raw_response": ai_response
                }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"AI 파싱 중 오류 발생: {str(e)}"
            }
