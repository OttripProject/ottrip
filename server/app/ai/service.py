import json
from typing import Any, Dict, Iterable, Tuple, cast

from fastapi import HTTPException
from sqlalchemy.orm import attributes

from app.auth.deps import RequireRegisteredUser
from app.common.schemas import StatusResponse
from app.flights.models import Flight
from app.flights.repository import FlightRepository
from app.itinerary.models import Itinerary
from app.itinerary.repository import ItineraryRepository
from app.plans.repository import PlanRepository
from app.utils.dependency import dependency

from .clients import GeminiClient, VisionClient
from .config import ai_settings
from .schemas import (
    AIFlightRead,
    ChecklistCreateResponse,
    ChecklistItemsByCategory,
    ChecklistRead,
)


@dependency
class AIService:
    current_user: RequireRegisteredUser
    vision_client: VisionClient
    gemini_client: GeminiClient
    plan_repository: PlanRepository
    itinerary_repository: ItineraryRepository
    flight_repository: FlightRepository
      
    async def extract_text_from_image(self, image_data: bytes) -> AIFlightRead:
        return await self.vision_client.extract_text_from_image(image_data)
    
    async def extract_text_from_pdf(self, pdf_data: bytes) -> AIFlightRead:
        return await self.vision_client.extract_text_from_pdf(pdf_data)
    
    async def parse_flight_data_with_ai(self, ocr_text: str):
        return await self.gemini_client.parse_flight_data(ocr_text)
    
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
    async def create_checklist(self, public_id: str, force_regenerate: bool = False, date: str | None = None) -> ChecklistCreateResponse:
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
        
        if len(itineraries) < 2:
            return ChecklistCreateResponse(
                success=False,
                message="체크리스트 생성을 위해서는 최소 2개 이상의 세부 일정이 필요합니다.",
                checklist=None
            )
        
        destinations = self._format_destinations(itineraries)
        flights_text = self._format_flights(flights)
        itineraries_text = self._format_itineraries(itineraries)
        
        checklist_kwargs = dict(
            start_date=str(plan.start_date),
            end_date=str(plan.end_date),
            destinations=destinations,
            flights=flights_text,
            itineraries=itineraries_text,
            existing_checklist=json.dumps(plan.travel_checklist, ensure_ascii=False, indent=2),
        )
        ai_result = await self.gemini_client.generate_checklist(**checklist_kwargs)
        
        if not ai_result.success:
            return ChecklistCreateResponse(
                success=False,
                message=ai_result.error or "체크리스트 생성 실패",
                checklist=None
            )
        
        raw_ai_data = ai_result.data or {}
        ai_data: Dict[str, list[Dict[str, Any]]] = {}

        for raw_category_key, raw_items in raw_ai_data.items():
            if not isinstance(raw_items, list):
                continue
            category_key = self._normalize_checklist_category_key(str(raw_category_key))
            if category_key not in ai_data:
                ai_data[category_key] = []
            for item in cast(list[Any], raw_items):
                if not isinstance(item, dict):
                    continue
                item_dict = cast(Dict[str, Any], item)
                # AI 생성 항목: 기본값
                item_dict["is_custom"] = False
                if "is_checked" not in item_dict:
                    item_dict["is_checked"] = False
                # date가 제공된 경우 모든 AI 생성 항목에 date 추가
                if date is not None:
                    item_dict["date"] = date
                ai_data[category_key].append(item_dict)

        # force_regenerate=True 인 경우: 기존 체크리스트를 삭제하지 않고 "추가만" 수행
        # - 기존 항목은 모두 유지 (AI/Custom 포함)
        # - 새로 생성된 AI 항목 중 기존과 겹치지 않는 항목만 추가
        # - 새로 추가되는 항목은 기존 max_id 이후로 id 재부여(충돌 방지)
        if force_regenerate and plan.travel_checklist and "categories" in plan.travel_checklist:
            existing_categories_any = plan.travel_checklist.get("categories", {})
            existing_categories: Dict[str, list[Dict[str, Any]]] = {}

            for raw_category_key, raw_items in existing_categories_any.items():
                if not isinstance(raw_items, list):
                    continue
                category_key = self._normalize_checklist_category_key(str(raw_category_key))
                existing_categories.setdefault(category_key, [])
                for item in cast(list[Any], raw_items):
                    if isinstance(item, dict):
                        existing_categories[category_key].append(cast(Dict[str, Any], item))

            merged_categories = self._merge_checklist_add_only(
                existing=existing_categories,
                incoming_ai=ai_data,
                date=date,
            )
            ai_data = merged_categories
        else:
            # 기존 체크리스트가 있을 때는 사용자 추가 항목(is_custom: True)만 보존하는 기존 동작 유지
            if plan.travel_checklist and "categories" in plan.travel_checklist:
                existing_categories = plan.travel_checklist["categories"]
                for category_key, existing_items in existing_categories.items():
                    existing_list = cast(list[Any], existing_items)
                    user_added_items: list[Dict[str, Any]] = []

                    for item in existing_list:
                        if isinstance(item, dict):
                            item_dict = cast(Dict[str, Any], item)
                            if item_dict.get("is_custom", False):
                                user_added_items.append(item_dict)

                    if user_added_items:
                        ai_category_key = self._normalize_checklist_category_key(str(category_key))
                        if ai_category_key not in ai_data:
                            ai_data[ai_category_key] = []
                        ai_data[ai_category_key].extend(user_added_items)
        
        checklist = ChecklistRead(
            categories=ChecklistItemsByCategory.model_validate(ai_data)
        )
        
        plan.travel_checklist = checklist.model_dump()
        await self.plan_repository.save(plan=plan)
        
        return ChecklistCreateResponse(
            success=True,
            message="체크리스트가 성공적으로 생성되었습니다.",
            checklist=checklist
        )

    def _normalize_checklist_category_key(self, key: str) -> str:
        category_map: Dict[str, str] = {
            "basicRequired": "basic_required",
            "scheduleRequired": "schedule_required",
            "recommended": "recommended",
            "optional": "optional",
            "custom": "custom",
            # 이미 snake_case 인 경우 그대로
            "basic_required": "basic_required",
            "schedule_required": "schedule_required",
        }
        return category_map.get(key, key)

    def _normalize_checklist_item_key(self, item: Dict[str, Any]) -> Tuple[str, str]:
        # name/reason 기반 중복 제거 키 (공백/대소문자 차이 흡수)
        name = str(item.get("name") or "").strip().lower()
        reason = str(item.get("reason") or "").strip().lower()
        return (name, reason)

    def _iter_all_items(self, categories: Dict[str, list[Dict[str, Any]]]) -> Iterable[Dict[str, Any]]:
        for items in categories.values():
            for item in items:
                yield item

    def _max_item_id(self, categories: Dict[str, list[Dict[str, Any]]]) -> int:
        max_id = 0
        for item in self._iter_all_items(categories):
            item_id = item.get("id")
            if isinstance(item_id, int) and item_id > max_id:
                max_id = item_id
        return max_id

    def _merge_checklist_add_only(
        self,
        existing: Dict[str, list[Dict[str, Any]]],
        incoming_ai: Dict[str, list[Dict[str, Any]]],
        date: str | None = None,
    ) -> Dict[str, list[Dict[str, Any]]]:
        merged: Dict[str, list[Dict[str, Any]]] = {k: list(v) for k, v in existing.items()}

        # 기존 항목 set (카테고리 무관하게 name/reason 기준으로 중복 제거)
        existing_keys: set[Tuple[str, str]] = set()
        for item in self._iter_all_items(existing):
            existing_keys.add(self._normalize_checklist_item_key(item))

        next_id = self._max_item_id(existing) + 1

        for category_key, ai_items in incoming_ai.items():
            category_key_norm = self._normalize_checklist_category_key(category_key)
            merged.setdefault(category_key_norm, [])

            for item in ai_items:
                key = self._normalize_checklist_item_key(item)
                if key in existing_keys:
                    continue

                # id 충돌 방지: 항상 새 id 부여
                new_item = dict(item)
                new_item["id"] = next_id
                next_id += 1
                new_item["is_custom"] = False
                if "is_checked" not in new_item:
                    new_item["is_checked"] = False
                # date가 제공된 경우 새로 추가되는 항목에 date 추가
                if date is not None:
                    new_item["date"] = date

                merged[category_key_norm].append(new_item)
                existing_keys.add(key)

        return merged
    
    async def get_checklist(self, public_id: str) -> ChecklistRead:
        """체크리스트 조회 (최적화: travel_checklist만 조회)"""
        # Checklist 전용 쿼리: Plan 전체 대신 travel_checklist만 조회하여 바로 ChecklistItemsByCategory 반환
        categories = await self.plan_repository.find_travel_checklist_by_public_id(
            public_id=public_id
        )
        if categories is None:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        
        # is_custom 필드가 없는 경우 기본값 설정 (하위 호환성)
        # Pydantic 모델이므로 dict로 변환 후 처리
        categories_dict = categories.model_dump()
        for category_key in ["basic_required", "schedule_required", "recommended", "optional"]:
            items = categories_dict.get(category_key, [])
            for item in items:
                if isinstance(item, dict) and "is_custom" not in item:
                    item["is_custom"] = False  # 기본값은 AI 생성
        
        # 다시 ChecklistItemsByCategory로 변환
        categories_updated = ChecklistItemsByCategory(**categories_dict)
        return ChecklistRead(categories=categories_updated)
    
    async def set_checklist_item_status(self, public_id: str, item_id: int, is_checked: bool) -> StatusResponse:
        plan = await self.plan_repository.find_by_public_id_only_plan(public_id=public_id)
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
    
    async def add_checklist_item(self, public_id: str, name: str, reason: str = "", category: str = "basic_required", date: str | None = None) -> StatusResponse:
        """체크리스트 항목 추가 (지정된 카테고리)"""
        plan = await self.plan_repository.find_by_public_id_only_plan(public_id=public_id)
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
        
        # date가 제공된 경우에만 추가
        if date is not None:
            new_item["date"] = date
        
        categories[category_snake].append(new_item)
        attributes.flag_modified(plan, "travel_checklist")
        await self.plan_repository.save(plan=plan)
        
        return StatusResponse(
            ok=True,
            message="체크리스트 항목이 추가되었습니다."
        )
    
    async def delete_checklist_item(self, public_id: str, item_id: int) -> StatusResponse:
        """체크리스트 항목 삭제"""
        plan = await self.plan_repository.find_by_public_id_only_plan(public_id=public_id)
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
    
    async def test_gemini(self):
        return await self.gemini_client.generate_content(
            contents="GEMINI 연결 잘 되었나 확인해보는거야. 잘 연결되었니?"
        )