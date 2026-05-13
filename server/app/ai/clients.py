import json
from pathlib import Path
from typing import Any

from app.utils.dependency import dependency

from .config import ai_settings
from .schemas import AIParseResponse, DocumentTextExtraction


@dependency
class VisionClient:
    @property
    def client(self):
        from google.cloud import vision
        from google.oauth2 import service_account

        credentials_info = json.loads(ai_settings.GOOGLE_CREDENTIALS_JSON)
        credentials = service_account.Credentials.from_service_account_info(
            credentials_info
        )
        self._client = vision.ImageAnnotatorClient(credentials=credentials)

        return self._client

    async def extract_text_from_image(self, image_data: bytes) -> DocumentTextExtraction:
        from google.cloud.vision_v1 import types as vision_types

        image_content = vision_types.Image(content=image_data)
        response = self.client.text_detection(image=image_content)

        texts = response.text_annotations

        if response.error.message:
            raise Exception(f"Vision API 오류: {response.error.message}")

        if not texts:
            return DocumentTextExtraction(
                success=False,
                text="",
                confidence=0.0,
            )

        full_text = texts[0].description if texts else ""

        words = texts[1:] if len(texts) > 1 else []
        avg_confidence = (
            sum(getattr(word, "confidence", 0.0) for word in words) / len(words)
            if words
            else 0.0
        )

        return DocumentTextExtraction(
            success=True,
            text=full_text,
            confidence=avg_confidence,
        )

    async def extract_text_from_pdf(self, pdf_data: bytes) -> DocumentTextExtraction:
        import fitz

        doc = fitz.open(stream=pdf_data, filetype="pdf")
        full_text = ""

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            full_text += page.get_text() + "\n"

        doc.close()

        return DocumentTextExtraction(
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
        #         return DocumentTextExtraction(
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

        #     return DocumentTextExtraction(
        #         success=True,
        #         text=extracted_text,
        #         confidence=avg_confidence,
        #     )

        # except Exception as e:
        #     return DocumentTextExtraction(
        #         success=False,
        #         text="",
        #         confidence=0.0,
        #     )


@dependency
class GeminiClient:
    """Google Gemini API 클라이언트 (google-genai SDK)."""

    def __init__(self) -> None:
        self._client = None

    @property
    def client(self) -> Any:
        from google import genai

        if self._client is None:
            key = ai_settings.GEMINI_API_KEY
            self._client = genai.Client(api_key=key)
        return self._client

    async def generate_content(
        self,
        contents: str,
        *,
        config: Any = None,
    ) -> str:
        response = await self.client.aio.models.generate_content(
            model=ai_settings.GEMINI_DEFAULT_MODEL,
            contents=contents,
            config=config,
        )
        text = getattr(response, "text", None)
        return text if text else ""

    async def generate_checklist(
        self,
        start_date: str,
        end_date: str,
        destinations: str,
        flights: str,
        itineraries: str,
        existing_checklist: str = "",
    ) -> AIParseResponse:
        """여행 체크리스트 생성 (assistant.txt 프롬프트·JSON 스키마)."""
        from google import genai

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
                existing_checklist=existing_checklist,
            )

            config = genai.types.GenerateContentConfig(
                system_instruction=ai_settings.CHECKLIST_SYSTEM_PROMPT,
                temperature=0.7,
                response_mime_type="application/json",
            )

            response = await self.client.aio.models.generate_content(
                model=ai_settings.GEMINI_DEFAULT_MODEL,
                contents=prompt,
                config=config,
            )

            ai_response = getattr(response, "text", None) or ""
            if not ai_response.strip():
                return AIParseResponse(
                    success=False,
                    error="AI 응답이 비어있습니다.",
                )

            try:
                result = json.loads(ai_response.strip())
                return AIParseResponse(
                    success=True,
                    data=result,
                )
            except json.JSONDecodeError:
                return AIParseResponse(
                    success=False,
                    error="AI 응답을 파싱할 수 없습니다.",
                )

        except Exception as e:
            return AIParseResponse(
                success=False,
                error=f"체크리스트 생성 중 오류 발생: {str(e)}",
            )

    async def analyze_document_upload(self, ocr_text: str) -> dict[str, Any]:
        from google import genai

        err = {"success": False, "inferred_item_type": None, "error": "", "draft": None}

        try:
            prompt_path = Path(__file__).parent / "prompt" / "document_upload_analyze.txt"
            with open(prompt_path, "r", encoding="utf-8") as f:
                prompt_template = f.read()
            prompt = prompt_template.replace("{ocr_text}", ocr_text)

            config = genai.types.GenerateContentConfig(
                system_instruction=ai_settings.DOCUMENT_UPLOAD_ANALYZE_SYSTEM_PROMPT,
                temperature=0.2,
                response_mime_type="application/json",
            )

            response = await self.client.aio.models.generate_content(
                model=ai_settings.GEMINI_DEFAULT_MODEL,
                contents=prompt,
                config=config,
            )
            raw = (getattr(response, "text", None) or "").strip()
            if not raw:
                err["error"] = "AI 응답이 비어있습니다."
                return err
            parsed = json.loads(raw)
            if not isinstance(parsed, dict):
                err["error"] = "AI 응답이 객체 형태가 아닙니다."
                return err
            return parsed
        except json.JSONDecodeError:
            err["error"] = "AI 응답을 JSON으로 파싱할 수 없습니다."
            return err
        except Exception as e:
            err["error"] = f"문서 분석 중 오류: {str(e)}"
            return err
