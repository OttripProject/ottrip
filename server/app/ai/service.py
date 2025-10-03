from typing import Dict, Any

from app.auth.deps import CurrentUser
from app.utils.dependency import dependency

from .clients import VisionClient, OpenAIClient
from .config import ai_settings
from .schemas import AIFlightRead


@dependency
class AIService:
    current_user: CurrentUser
    vision_client: VisionClient
    openai_client: OpenAIClient
      
    async def extract_text_from_image(self, image_data: bytes) -> AIFlightRead:
        return await self.vision_client.extract_text_from_image(image_data)
    
    async def extract_text_from_pdf(self, pdf_data: bytes) -> AIFlightRead:
        return await self.vision_client.extract_text_from_pdf(pdf_data)
    
    async def parse_flight_data_with_ai(self, ocr_text: str) -> Dict[str, Any]:
        return await self.openai_client.parse_flight_data(ocr_text)
    
    async def process_flight_ticket(self, file_data: bytes, content_type: str, filename: str) -> Dict[str, Any]:
        """항공권 이미지/PDF 전체 처리 (OCR + AI)"""
        try:
            # 파일 크기 검증
            if len(file_data) > ai_settings.MAX_FILE_SIZE:
                return {
                    "success": False,
                    "error": f"파일 크기가 너무 큽니다. 최대 {ai_settings.MAX_FILE_SIZE // (1024*1024)}MB까지 지원합니다."
                }
            
            # 파일 타입에 따른 OCR 처리
            if content_type in ai_settings.ALLOWED_IMAGE_TYPES:         
                ocr_result = await self.extract_text_from_image(file_data)
                
            elif content_type in ai_settings.ALLOWED_PDF_TYPES:
                ocr_result = await self.extract_text_from_pdf(file_data)
                
            else:
                return {
                    "success": False,
                    "error": "지원하지 않는 파일 형식입니다."
                }
            
            if not ocr_result.success:
                return ocr_result

            # AI로 항공권 데이터 파싱
            ai_result = await self.parse_flight_data_with_ai(ocr_result.text)
            
            # 결과 통합
            return {
                "success": True,
                "ocr_result": ocr_result,
                "ai_result": ai_result,
                "flight_data": ai_result.get("data", {}) if ai_result.get("success") else {},
                "file_info": {
                    "filename": filename,
                    "content_type": content_type,
                    "size": len(file_data)
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"파일 처리 중 오류 발생: {str(e)}"
            }
