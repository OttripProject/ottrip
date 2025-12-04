from typing import Dict, Any, cast

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
            # 기존 체크리스트에서 custom 카테고리 제거
            categories = plan.travel_checklist["categories"].copy()
            if "custom" in categories:
                del categories["custom"]
            
            return ChecklistCreateResponse(
                success=True,
                message="기존 체크리스트가 존재합니다.",
                checklist=ChecklistRead(
                    categories=ChecklistItemsByCategory(**categories)
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
        
        # AI 생성 항목에 is_custom: False 설정
        ai_data = ai_result.data or {}
        for items in ai_data.values():
            if isinstance(items, list):
                items_list = cast(list[Any], items)
                for item in items_list:
                    if isinstance(item, dict):
                        item_dict = cast(Dict[str, Any], item)
                        item_dict["is_custom"] = False
        
        # 기존 체크리스트에서 사용자가 추가한 항목(is_custom: True) 보존
        if plan.travel_checklist and "categories" in plan.travel_checklist:
            existing_categories = plan.travel_checklist["categories"]
            
            # 각 카테고리에서 사용자가 추가한 항목 찾기
            for category_key, existing_items in existing_categories.items():
                if not isinstance(category_key, str) or not isinstance(existing_items, list):
                    continue
                
                existing_list = cast(list[Any], existing_items)
                user_added_items: list[Dict[str, Any]] = []
                
                for item in existing_list:
                    if isinstance(item, dict):
                        item_dict = cast(Dict[str, Any], item)
                        # 사용자가 추가한 항목(is_custom: True)만 보존
                        if item_dict.get("is_custom", False):
                            user_added_items.append(item_dict)
                
                # 사용자가 추가한 항목이 있으면 AI 생성 데이터에 추가
                if user_added_items:
                    # 카테고리 키 변환 (snake_case로 통일)
                    category_map: Dict[str, str] = {
                        "basicRequired": "basic_required",
                        "scheduleRequired": "schedule_required",
                        "recommended": "recommended",
                        "optional": "optional",
                        "custom": "custom"
                    }
                    ai_category_key = category_map.get(category_key, category_key)
                    
                    # AI 생성 데이터에 해당 카테고리가 없으면 생성
                    if ai_category_key not in ai_data:
                        ai_data[ai_category_key] = []
                    
                    # AI 생성 데이터의 카테고리가 리스트인지 확인
                    ai_category_items = ai_data[ai_category_key]
                    if isinstance(ai_category_items, list):
                        ai_category_list = cast(list[Any], ai_category_items)
                        # 사용자가 추가한 항목들을 AI 생성 항목 뒤에 추가
                        ai_category_list.extend(user_added_items)
        
        checklist = ChecklistRead(
            categories=ChecklistItemsByCategory(**ai_data)
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
        
        # 기존 체크리스트에서 is_custom 필드가 없는 경우 기본값 설정 (하위 호환성)
        categories = plan.travel_checklist["categories"]
             
        for items in categories.values():
            if isinstance(items, list):
                items_list = cast(list[Any], items)
                for item in items_list:
                    if isinstance(item, dict):
                        item_dict = cast(Dict[str, Any], item)
                        if "is_custom" not in item_dict:
                            item_dict["is_custom"] = False  # 기본값은 AI 생성
        
        return ChecklistRead(
            categories=ChecklistItemsByCategory(**categories)
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
    
    async def add_checklist_item(self, public_id: str, name: str, reason: str = "", category: str = "basic_required") -> StatusResponse:
        """체크리스트 항목 추가 (지정된 카테고리)"""
        plan = await self.plan_repository.find_by_public_id(public_id=public_id)
        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        
        if plan.owner_id != self.current_user.id and not await self.plan_repository.is_editor(plan_id=plan.id, user_id=self.current_user.id):
            raise HTTPException(status_code=403, detail="해당 계획 체크리스트 수정 권한이 없습니다.")
        
        if not plan.travel_checklist:
            # 체크리스트가 없으면 기본 구조 생성
            plan.travel_checklist = {
                "categories": {
                    "basic_required": [],
                    "schedule_required": [],
                    "recommended": [],
                    "optional": []
                }
            }
        
        categories = plan.travel_checklist["categories"]
        
        # camelCase를 snake_case로 변환
        category_map = {
            "basicRequired": "basic_required",
            "scheduleRequired": "schedule_required",
            "recommended": "recommended",
            "optional": "optional"
        }
        category_snake = category_map.get(category, category)
        
        # 유효한 카테고리인지 확인
        valid_categories = ["basic_required", "schedule_required", "recommended", "optional"]
        if category_snake not in valid_categories:
            raise HTTPException(status_code=400, detail="유효하지 않은 카테고리입니다.")
        
        # 카테고리가 없으면 생성
        if category_snake not in categories:
            categories[category_snake] = []
        
        # 모든 카테고리에서 최대 ID 찾기 (효율적으로 한 번의 순회로 처리)
        max_id = 0
        for cat_items in categories.values():
            if isinstance(cat_items, list):
                cat_list = cast(list[Any], cat_items)
                for item in cat_list:
                    if isinstance(item, dict) and "id" in item:
                        item_dict = cast(Dict[str, Any], item)
                        item_id = item_dict.get("id")
                        if isinstance(item_id, int) and item_id > max_id:
                            max_id = item_id
        
        # 새 항목 생성 (사용자 추가 항목)
        new_item = {
            "id": max_id + 1,
            "name": name,
            "reason": reason,
            "is_checked": False,
            "is_custom": True
        }
        
        categories[category_snake].append(new_item)
        attributes.flag_modified(plan, "travel_checklist")
        await self.plan_repository.save(plan=plan)
        
        return StatusResponse(
            ok=True,
            message="체크리스트 항목이 추가되었습니다."
        )
    
    async def delete_checklist_item(self, public_id: str, item_id: int) -> StatusResponse:
        """체크리스트 항목 삭제"""
        plan = await self.plan_repository.find_by_public_id(public_id=public_id)
        if not plan:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        
        if plan.owner_id != self.current_user.id and not await self.plan_repository.is_editor(plan_id=plan.id, user_id=self.current_user.id):
            raise HTTPException(status_code=403, detail="해당 계획 체크리스트 수정 권한이 없습니다.")
        
        if not plan.travel_checklist:
            raise HTTPException(status_code=400, detail="체크리스트가 존재하지 않습니다.")
        
        categories = plan.travel_checklist["categories"]
        
        # 모든 카테고리에서 해당 항목 찾아서 삭제 (모든 카테고리에서 삭제 가능)
        for category_items in categories.values():
            if not isinstance(category_items, list):
                continue
            category_list = cast(list[Any], category_items)
            for idx, item in enumerate(category_list):
                if isinstance(item, dict):
                    item_dict = cast(Dict[str, Any], item)
                    if item_dict.get("id") == item_id:
                        category_list.pop(idx)
                        attributes.flag_modified(plan, "travel_checklist")
                        await self.plan_repository.save(plan=plan)
                        return StatusResponse(
                            ok=True,
                            message="체크리스트 항목이 삭제되었습니다."
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
    
