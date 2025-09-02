from fastapi import status
from typing import Any, List, cast

from app.core.router import create_router
from app.ai.service import OpenAIService, ChatMessage, ChatRequest
from app.ai.config import ai_settings

from .schemas import ItineraryAssistResponse, ItineraryCreate, ItineraryRead, ItineraryUpdate
from .service import ItineraryService

router = create_router()


@router.get("/{itinerary_id}", status_code=status.HTTP_200_OK)
async def read_itinerary(
    itinerary_service: ItineraryService,
    itinerary_id: int,
) -> ItineraryRead:
    return await itinerary_service.read_itinerary(itinerary_id=itinerary_id)


@router.get("/{plan_id}/plan", status_code=status.HTTP_200_OK)
async def read_itineraries_by_plan(
    itinerary_service: ItineraryService,
    plan_id: int,
) -> list[ItineraryRead]:
    return await itinerary_service.read_itineraries_by_plan(plan_id=plan_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_itinerary(
    itinerary_service: ItineraryService,
    itinerary_data: ItineraryCreate,
) -> ItineraryRead:
    return await itinerary_service.create(itinerary_data=itinerary_data)


@router.patch("/{itinerary_id}", status_code=status.HTTP_200_OK)
async def update_itinerary(
    itinerary_service: ItineraryService,
    itinerary_id: int,
    update_data: ItineraryUpdate,
) -> ItineraryRead:
    return await itinerary_service.update(
        itinerary_id=itinerary_id, update_data=update_data
    )


@router.delete("/{itinerary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_itinerary(
    itinerary_service: ItineraryService,
    itinerary_id: int,
) -> None:
    await itinerary_service.delete(itinerary_id=itinerary_id)


@router.post("/{itinerary_id}/assist", status_code=status.HTTP_200_OK)
async def assist_itinerary(
    itinerary_service: ItineraryService,
    itinerary_id: int,
) -> ItineraryAssistResponse:
    it = await itinerary_service.read_itinerary(itinerary_id=itinerary_id)

    context_parts: list[str] = []
    if it.country:
        context_parts.append(f"국가: {it.country}")
    if it.city:
        context_parts.append(f"도시: {it.city}")
    if it.location:
        context_parts.append(f"장소: {it.location}")
    context = "\n".join(context_parts)

    system_prompt = ai_settings.ASSIST_SYSTEM_PROMPT
    user_prompt = ai_settings.ASSIST_USER_PROMPT_TEMPLATE.format(context=context)

    ai = OpenAIService()
    data = await ai.chat(
        ChatRequest(
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt),
            ],
            response_format={"type": "json_object"},
            temperature=0.6,
            max_tokens=600,
        )
    )

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
    try:
        import json

        obj_dict = json.loads(content)
        packing_list = [
            str(x) for x in cast(List[Any], obj_dict.get("packing") or [])
        ]
        attractions_list = [
            str(x) for x in cast(List[Any], obj_dict.get("attractions") or [])
        ]
        local_tips_list = [
            str(x) for x in cast(List[Any], obj_dict.get("local_tips") or [])
        ]
        resp = ItineraryAssistResponse(
            packing=packing_list,
            attractions=attractions_list,
            local_tips=local_tips_list,
        )
    except Exception:
        resp = ItineraryAssistResponse(
            packing=[], attractions=[], local_tips=[]
        )

    return resp
