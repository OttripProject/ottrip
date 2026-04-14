from fastapi import HTTPException

from app.attachments.models import AttachmentEntityType
from app.attachments.repository import AttachmentRepository
from app.attachments.service import cascade_delete_attachments
from app.auth.deps import CurrentUser
from app.expenses.models import Expense, ExpenseCategory, ExpenseCurrency
from app.expenses.repository import ExpenseRepository
from app.plans.repository import PlanRepository
from app.storage.deps import S3ClientDep
from app.utils.dependency import dependency

from .models import Flight, FlightSegment
from .repository import FlightRepository
from .schemas import (
    FlightCreate,
    FlightRead,
    FlightUpdate,
    FlightSegmentCreate,
    FlightSegmentRead,
    FlightSegmentUpdate,
)


@dependency
class FlightService:
    current_user: CurrentUser
    flight_repository: FlightRepository
    expense_repository: ExpenseRepository
    plan_repository: PlanRepository
    attachment_repository: AttachmentRepository
    s3_client: S3ClientDep

    async def create(self, *, flight_data: FlightCreate) -> int:
        plan_exists, has_permission = await self.plan_repository.has_edit_permission(
            plan_id=flight_data.plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(status_code=403, detail="해당 항공편에 대한 생성 권한이 없습니다.")
            
        create_flight_data = Flight(
            reservation_number=flight_data.reservation_number or "",
            passenger_name=flight_data.passenger_name or "",
            ticket_number=flight_data.ticket_number or "",
            booking_reference=flight_data.booking_reference or "",
            plan_id=flight_data.plan_id,
        )
        created_flight = await self.flight_repository.save(flight=create_flight_data)

        if not flight_data.segments or len(flight_data.segments) < 1:
            raise HTTPException(status_code=400, detail="세그먼트는 최소 1개 이상이어야 합니다.")

        # 시간 순서대로 정렬 (departure_time 기준)
        sorted_segments = sorted(flight_data.segments, key=lambda seg: seg.departure_time)

        for idx, seg in enumerate(sorted_segments, start=1):
            segment = FlightSegment(
                flight_id=created_flight.id,
                airline=seg.airline or "",
                flight_number=seg.flight_number or "",
                departure_airport=seg.departure_airport,
                arrival_airport=seg.arrival_airport,
                departure_time=seg.departure_time,
                arrival_time=seg.arrival_time,
                seat_class=seg.seat_class or "",
                seat_number=seg.seat_number or "",
                gate=seg.gate or "",
                terminal=seg.terminal or "",
                order=idx,
            )
            await self.flight_repository.save_segment(segment=segment)

       
        if flight_data.expense:
            expense = Expense(
                amount=float(flight_data.expense.amount),
                category=ExpenseCategory.FLIGHT,
                description=flight_data.expense.description,
                currency=flight_data.expense.currency,
                ex_date=flight_data.expense.ex_date,
                plan_id=created_flight.plan_id,
            )
            created_expense = await self.expense_repository.save(expense=expense)
            created_flight.expense = created_expense
            created_expense.flight_id = created_flight.id

        return int(created_flight.id)

    async def read_flight(self, *, flight_id: int) -> FlightRead:
        flight = await self.flight_repository.find_by_id(flight_id=flight_id)

        if not flight:
            raise HTTPException(
                status_code=400, detail="해당 항공편을 찾을 수 없습니다."
            )

        if flight.plan.owner_id != self.current_user.id:
            is_shared = await self.plan_repository.is_shared(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_shared:
                raise HTTPException(status_code=403, detail="항공편 조회 권한이 없습니다.")

        return FlightRead.model_validate(flight)

    async def read_flights_by_plan(self, *, plan_id: int) -> list[FlightRead]:
        plan_exists, has_permission = await self.plan_repository.has_read_permission(
            plan_id=plan_id, user_id=self.current_user.id
        )
        if not plan_exists:
            raise HTTPException(status_code=404, detail="해당 계획을 찾을 수 없습니다.")
        if not has_permission:
            raise HTTPException(status_code=403, detail="해당 항공편에 대한 조회 권한이 없습니다.")

        flights = await self.flight_repository.find_all_by_plan(plan_id=plan_id)
        flights_list = [FlightRead.model_validate(flight) for flight in flights]

        return flights_list

    async def update(self, *, flight_id: int, update_data: FlightUpdate) -> None:
        flight = await self.flight_repository.find_by_id(flight_id=flight_id)
        if not flight:
            
            raise HTTPException(
                status_code=404, detail="해당 항공편을 찾을 수 없습니다."
            )
        if flight.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=403, detail="해당 항공편에 대한 수정 권한이 없습니다."
                )

        if update_data.reservation_number is not None:
            flight.reservation_number = update_data.reservation_number
        if update_data.passenger_name is not None:
            flight.passenger_name = update_data.passenger_name
        if update_data.ticket_number is not None:
            flight.ticket_number = update_data.ticket_number
        if update_data.booking_reference is not None:
            flight.booking_reference = update_data.booking_reference

        # 프론트엔드에서 전송한 exDate 우선 사용, 없으면 UTC datetime에서 날짜 추출
        if update_data.segments is not None:
            if len(update_data.segments) < 1:
                raise HTTPException(status_code=400, detail="세그먼트는 최소 1개 이상이어야 합니다.")
            
            existing_segments = await self.flight_repository.find_segments_by_flight(flight_id=flight.id)
            existing_segment_ids = {seg.id for seg in existing_segments}
            
            new_segment_ids = {seg.id for seg in update_data.segments if seg.id is not None}
            
            segments_to_delete = existing_segment_ids - new_segment_ids
            for segment_id in segments_to_delete:
                await self.flight_repository.soft_delete_segment(segment_id=segment_id)
            
            # 시간 순서대로 정렬 (departure_time 기준)
            sorted_segments = sorted(update_data.segments, key=lambda seg: seg.departure_time)
            
            for idx, seg_data in enumerate(sorted_segments, start=1):
                if seg_data.id and seg_data.id in existing_segment_ids:
                    existing_seg = next((s for s in existing_segments if s.id == seg_data.id), None)
                    if existing_seg:
                        existing_seg.airline = seg_data.airline or ""
                        existing_seg.flight_number = seg_data.flight_number or ""
                        existing_seg.departure_airport = seg_data.departure_airport
                        existing_seg.arrival_airport = seg_data.arrival_airport
                        existing_seg.departure_time = seg_data.departure_time
                        existing_seg.arrival_time = seg_data.arrival_time
                        existing_seg.seat_class = seg_data.seat_class or ""
                        existing_seg.seat_number = seg_data.seat_number or ""
                        existing_seg.gate = seg_data.gate or ""
                        existing_seg.terminal = seg_data.terminal or ""
                        existing_seg.order = idx
                        await self.flight_repository.save_segment(segment=existing_seg)
                else:
                    new_seg = FlightSegment(
                        flight_id=flight.id,
                        airline=seg_data.airline or "",
                        flight_number=seg_data.flight_number or "",
                        departure_airport=seg_data.departure_airport,
                        arrival_airport=seg_data.arrival_airport,
                        departure_time=seg_data.departure_time,
                        arrival_time=seg_data.arrival_time,
                        seat_class=seg_data.seat_class or "",
                        seat_number=seg_data.seat_number or "",
                        gate=seg_data.gate or "",
                        terminal=seg_data.terminal or "",
                        order=idx,
                    )
                    await self.flight_repository.save_segment(segment=new_seg)
            

        await self.flight_repository.save(flight=flight)
            

        if update_data.expense:
            if flight.expense:
                if update_data.expense.amount is not None:
                    flight.expense.amount = float(update_data.expense.amount)
                if update_data.expense.description is not None:
                    flight.expense.description = update_data.expense.description
                if update_data.expense.currency is not None:
                    flight.expense.currency = update_data.expense.currency
                if update_data.expense.ex_date is not None:
                    flight.expense.ex_date = update_data.expense.ex_date

                updated_expense = await self.expense_repository.save(
                    expense=flight.expense
                )
                flight.expense = updated_expense
            else:
                existing_expense = await self.expense_repository.find_by_flight_id(flight_id=flight.id)
                
                if existing_expense:
                    existing_expense.is_deleted = False
                    if update_data.expense.amount is not None:
                        existing_expense.amount = float(update_data.expense.amount)
                    if update_data.expense.description is not None:
                        existing_expense.description = update_data.expense.description
                    if update_data.expense.currency is not None:
                        existing_expense.currency = update_data.expense.currency
                    if update_data.expense.ex_date is not None:
                        existing_expense.ex_date = update_data.expense.ex_date

                    updated_expense = await self.expense_repository.save(expense=existing_expense)
                    flight.expense = updated_expense
                else:
                    expense = Expense(
                        amount=float(update_data.expense.amount or 0),
                        category=ExpenseCategory.FLIGHT,
                        description=update_data.expense.description or flight.reservation_number,
                        currency=update_data.expense.currency or ExpenseCurrency.KRW,
                        ex_date=update_data.expense.ex_date or flight.flight_segments[0].departure_time.date(),
                        plan_id=flight.plan_id,
                    )
                    created_expense = await self.expense_repository.save(expense=expense)
                    flight.expense = created_expense
                    created_expense.flight_id = flight.id

        return None

    async def delete(self, *, flight_id: int) -> None:
        flight = await self.flight_repository.find_by_id(flight_id=flight_id)
        if not flight:
            raise HTTPException(status_code=400, detail="항공편을 찾을 수 없습니다.")
        if flight.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(
                    status_code=403, detail="해당 항공편에 대한 수정 권한이 없습니다."
                )

        await self.flight_repository.soft_delete_segments_by_flight(flight_id=flight_id)
        await self.expense_repository.soft_delete_by_flight_id(flight_id=flight_id)
        await cascade_delete_attachments(
            entity_type=AttachmentEntityType.FLIGHT,
            entity_id=flight_id,
            attachment_repository=self.attachment_repository,
            s3_client=self.s3_client,
        )
        await self.flight_repository.remove(flight_id=flight_id)

    async def add_segment(self, *, data: FlightSegmentCreate) -> FlightSegmentRead:
        flight = await self.flight_repository.find_by_id(flight_id=data.flight_id)
        if not flight:
            raise HTTPException(status_code=404, detail="항공권을 찾을 수 없습니다.")
        if flight.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(status_code=403, detail="세그먼트 추가 권한이 없습니다.")
        
        # 새 segment 생성 (임시 order로 저장)
        new_segment = FlightSegment(
            flight_id=data.flight_id,
            airline=data.airline or "",
            flight_number=data.flight_number or "",
            departure_airport=data.departure_airport,
            arrival_airport=data.arrival_airport,
            departure_time=data.departure_time,
            arrival_time=data.arrival_time,
            seat_class=data.seat_class or "",
            seat_number=data.seat_number or "",
            gate=data.gate or "",
            terminal=data.terminal or "",
            order=0,  # 임시값, 아래에서 재할당
        )
        created = await self.flight_repository.save_segment(segment=new_segment)
        
        # 모든 segments를 시간 순서대로 재정렬
        all_segments = await self.flight_repository.find_segments_by_flight(flight_id=flight.id)
        sorted_segments = sorted(all_segments, key=lambda seg: seg.departure_time)
        for idx, segment in enumerate(sorted_segments, start=1):
            if segment.order != idx:
                segment.order = idx
                await self.flight_repository.save_segment(segment=segment)
        
        # 업데이트된 segment 반환
        updated_segment = await self.flight_repository.find_segment_by_id(segment_id=created.id)
        return FlightSegmentRead.model_validate(updated_segment)

    async def update_segment(self, *, segment_id: int, data: FlightSegmentUpdate) -> FlightSegmentRead:
        seg = await self.flight_repository.find_segment_by_id(segment_id=segment_id)
        if not seg:
            raise HTTPException(status_code=404, detail="세그먼트를 찾을 수 없습니다.")
        flight = seg.flight
        if flight.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(status_code=403, detail="세그먼트 수정 권한이 없습니다.")
        if data.airline is not None:
            seg.airline = data.airline
        if data.flight_number is not None:
            seg.flight_number = data.flight_number
        if data.departure_airport is not None:
            seg.departure_airport = data.departure_airport
        if data.arrival_airport is not None:
            seg.arrival_airport = data.arrival_airport
        if data.departure_time is not None:
            seg.departure_time = data.departure_time
        if data.arrival_time is not None:
            seg.arrival_time = data.arrival_time
        if data.seat_class is not None:
            seg.seat_class = data.seat_class or ""
        if data.seat_number is not None:
            seg.seat_number = data.seat_number or ""
        if data.gate is not None:
            seg.gate = data.gate or ""
        if data.terminal is not None:
            seg.terminal = data.terminal or ""
        
        # 시간이 변경되었을 수 있으므로 모든 segments를 시간 순서대로 재정렬
        all_segments = await self.flight_repository.find_segments_by_flight(flight_id=flight.id)
        sorted_segments = sorted(all_segments, key=lambda s: s.departure_time)
        for idx, segment in enumerate(sorted_segments, start=1):
            if segment.order != idx:
                segment.order = idx
                await self.flight_repository.save_segment(segment=segment)
        
        saved = await self.flight_repository.find_segment_by_id(segment_id=segment_id)
        return FlightSegmentRead.model_validate(saved)

    async def delete_segment(self, *, segment_id: int) -> None:
        seg = await self.flight_repository.find_segment_by_id(segment_id=segment_id)
        if not seg:
            return
        flight = seg.flight
        if flight.plan.owner_id != self.current_user.id:
            is_editor = await self.plan_repository.is_editor(
                plan_id=flight.plan_id, user_id=self.current_user.id
            )
            if not is_editor:
                raise HTTPException(status_code=403, detail="세그먼트 삭제 권한이 없습니다.")
        await self.flight_repository.soft_delete_segment(segment_id=segment_id)
