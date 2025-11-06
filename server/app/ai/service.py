from typing import Dict, Any

from fastapi import HTTPException
from sqlalchemy.orm import attributes

from app.auth.deps import CurrentUser
from app.common.schemas import StatusResponse
from app.utils.dependency import dependency
from app.plans.repository import PlanRepository
from app.itinerary.models import Itinerary
from app.itinerary.repository import ItineraryRepository
from app.flights.models import Flight
from app.flights.repository import FlightRepository
from app.accomodation.models import Accommodation
from app.accomodation.repository import AccommodationRepository

from .clients import VisionClient, OpenAIClient
from .config import ai_settings
from .schemas import AIFlightRead, ChecklistRead, ChecklistItemsByCategory, ChecklistCreateResponse


@dependency
class AIService:
    current_user: CurrentUser
    vision_client: VisionClient
    openai_client: OpenAIClient
    plan_repository: PlanRepository
    itinerary_repository: ItineraryRepository
    flight_repository: FlightRepository
    accommodation_repository: AccommodationRepository
      
    async def extract_text_from_image(self, image_data: bytes) -> AIFlightRead:
        return await self.vision_client.extract_text_from_image(image_data)
    
    async def extract_text_from_pdf(self, pdf_data: bytes) -> AIFlightRead:
        return await self.vision_client.extract_text_from_pdf(pdf_data)
    
    async def parse_flight_data_with_ai(self, ocr_text: str):
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
                return {
                    "success": False,
                    "error": ocr_result.text or "텍스트 추출에 실패했습니다."
                }

            # AI로 항공권 데이터 파싱
            ai_result = await self.parse_flight_data_with_ai(ocr_result.text)
            
            # 결과 통합
            return {
                "success": True,
                "ocr_result": ocr_result,
                "ai_result": ai_result,
                "flight_data": ai_result.data if ai_result.success else {},
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
    
    # AI Checklist
    async def create_checklist(self, public_id: str, force_regenerate: bool = False) -> ChecklistCreateResponse:
        plan = await self.plan_repository.find_by_public_id(public_id=public_id)
        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if plan.owner_id != self.current_user.id and not await self.plan_repository.is_editor(plan_id=plan.id, user_id=self.current_user.id):
            raise HTTPException(status_code=403, detail="해당 계획 체크리스트 생성 권한이 없습니다.")

        if plan.travel_checklist and not force_regenerate:
            return ChecklistCreateResponse(
                success=True,
                message="기존 체크리스트가 존재합니다.",
                checklist=ChecklistRead(
                    categories=ChecklistItemsByCategory(**plan.travel_checklist["categories"])
                )
            )
        
        itineraries = plan.itineraries
        flights = plan.flights
        accommodations = plan.accommodations
        
        if len(itineraries) < 2:
            return ChecklistCreateResponse(
                success=False,
                message="체크리스트 생성을 위해서는 최소 2개 이상의 세부 일정이 필요합니다.",
                checklist=None
            )
        
        destinations = self._format_destinations(itineraries)
        flights_text = self._format_flights(flights)
        accommodations_text = self._format_accommodations(accommodations)
        itineraries_text = self._format_itineraries(itineraries)
        
        ai_result = await self.openai_client.generate_checklist(
            start_date=str(plan.start_date),
            end_date=str(plan.end_date),
            destinations=destinations,
            flights=flights_text,
            accommodations=accommodations_text,
            itineraries=itineraries_text
        )
        
        if not ai_result.success:
            return ChecklistCreateResponse(
                success=False,
                message=ai_result.error or "체크리스트 생성 실패",
                checklist=None
            )
        
        checklist = ChecklistRead(
            categories=ChecklistItemsByCategory(**(ai_result.data or {}))
        )
        
        plan.travel_checklist = checklist.model_dump()
        await self.plan_repository.save(plan=plan)
        
        return ChecklistCreateResponse(
            success=True,
            message="체크리스트가 성공적으로 생성되었습니다.",
            checklist=checklist
        )
    
    async def get_checklist(self, public_id: str) -> ChecklistRead:
        """체크리스트 조회"""
        plan = await self.plan_repository.find_by_public_id(public_id=public_id)
        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        
        if not plan.travel_checklist:
            return ChecklistRead(
                categories=ChecklistItemsByCategory(
                    basic_required=[],
                    schedule_required=[],
                    recommended=[],
                    optional=[]
                )
            )
        
        return ChecklistRead(
            categories=ChecklistItemsByCategory(**plan.travel_checklist["categories"])
        )
    
    async def set_checklist_item_status(self, public_id: str, item_id: int, is_checked: bool) -> StatusResponse:
        plan = await self.plan_repository.find_by_public_id(public_id=public_id)
        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        
        if not plan.travel_checklist:
            raise HTTPException(status_code=400, detail="체크리스트가 존재하지 않습니다.")
        
        categories = plan.travel_checklist["categories"]
        
        for category in categories.values():
            for item in category:
                if item["id"] == item_id:
                    item["is_checked"] = is_checked
                    attributes.flag_modified(plan, "travel_checklist")
                    await self.plan_repository.save(plan=plan)
                    return StatusResponse(
                        ok=True,
                        message="체크리스트 항목이 업데이트되었습니다."
                    )
        
        raise HTTPException(status_code=404, detail="해당 항목을 찾을 수 없습니다.")

    # 내부 함수
    def _format_destinations(self, itineraries: list[Itinerary]) -> str:
        destinations: set[str] = set()
        for itinerary in itineraries:
            if itinerary.country:
                destinations.add(f"{itinerary.country} {itinerary.city}".strip())
        return ", ".join(destinations) if destinations else "정보 없음"
    
    def _format_flights(self, flights: list[Flight]) -> str:
        if not flights:
            return "항공 일정 없음"
        
        formatted: list[str] = []
        for idx, flight in enumerate(flights, 1):
            if flight.flight_segments:
                first_seg = flight.flight_segments[0]
                last_seg = flight.flight_segments[-1]
                formatted.append(
                    f"[항공 {idx}] {first_seg.departure_airport} → {last_seg.arrival_airport} "
                    f"(출발: {first_seg.departure_time.strftime('%Y-%m-%d %H:%M')})"
                )
        return "\n".join(formatted)
    
    def _format_accommodations(self, accommodations: list[Accommodation]) -> str:
        if not accommodations:
            return "숙박 일정 없음"
        
        formatted: list[str] = []
        for idx, acc in enumerate(accommodations, 1):
            formatted.append(
                f"[숙박 {idx}] {acc.name} - {acc.city}, {acc.country} "
                f"(체크인: {acc.checkin_date} {acc.checkin_time}, "
                f"체크아웃: {acc.checkout_date} {acc.checkout_time})"
            )
        return "\n".join(formatted)
    
    def _format_itineraries(self, itineraries: list[Itinerary]) -> str:
        if not itineraries:
            return "활동 일정 없음"
        
        formatted: list[str] = []
        for idx, iti in enumerate(itineraries, 1):
            location = getattr(iti, "location", "")
            description = getattr(iti, "description", "")
            formatted.append(
                f"[일정 {idx}] {iti.title} - {location}, {iti.city}, {iti.country} "
                f"(날짜: {iti.itinerary_date}, 시간: {iti.start_time}~{iti.end_time})\n"
                f"  설명: {description}"
            )
        return "\n".join(formatted)
    
