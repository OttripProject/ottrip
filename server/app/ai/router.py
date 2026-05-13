from typing import Dict, Any
from fastapi import UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from app.auth.deps import RequireRegisteredUser
from app.core.router import create_router
from app.common.schemas import StatusResponse

from .config import ai_settings
from .service import AIService
from .schemas import ChecklistCreateRequest, ChecklistCreateResponse, ChecklistItemAddRequest, ChecklistItemCheckRequest, ChecklistRead, DocumentTextExtraction

router = create_router()

@router.post("/extract-flight-data", response_model=Dict[str, Any])
async def extract_flight_data_from_image(
    ai_service: AIService,
    file: UploadFile = File(...),
):
    """항공권 이미지/PDF에서 데이터 추출 (OCR + AI)"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="파일명이 없습니다.")
        
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400, 
                detail="파일 크기는 10MB를 초과할 수 없습니다."
            )
        
        allowed_types = [
            "image/jpeg", "image/png", "image/gif", "image/bmp", 
            "image/webp", "image/tiff", "application/pdf"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail="지원하지 않는 파일 형식입니다. 지원 형식: 이미지 (JPEG, PNG, GIF, BMP, WEBP, TIFF), PDF"
            )
        
        file_data = await file.read()
        
        result = await ai_service.process_flight_ticket(
            file_data=file_data,
            content_type=file.content_type,
            filename=file.filename
        )
        
        if not result["success"]:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": result.get("error", "항공권 데이터 추출에 실패했습니다."),
                    "data": None
                }
            )
        
        return {
            "success": True,
            "message": "항공권 데이터 추출이 완료되었습니다.",
            "data": {
                "flight_data": result["flight_data"],
                "ocr_confidence": result["ocr_result"].get("confidence", 0.0),
                "ai_confidence": result["ai_result"].get("confidence", 0.0),
                "file_info": result["file_info"],
                "extracted_text": result["ocr_result"].get("extracted_text", ""),
                "ai_reasoning": result["ai_result"].get("reasoning", "")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"항공권 데이터 추출 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/test/extract-text-only")
async def extract_text_only(
    ai_service: AIService,
    file: UploadFile = File(...),
) -> DocumentTextExtraction:
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 없습니다.")
    
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400, 
            detail="파일 크기는 10MB를 초과할 수 없습니다."
        )
    
    file_data = await file.read()
    
    if file.content_type in ai_settings.ALLOWED_IMAGE_TYPES:
        result = await ai_service.extract_text_from_image(file_data)
    elif file.content_type in ai_settings.ALLOWED_PDF_TYPES:
        result = await ai_service.extract_text_from_pdf(file_data)
    else:
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 파일 형식입니다. 지원 형식: 이미지 (JPEG, PNG, GIF, BMP, WEBP, TIFF), PDF"
        )

    if not result.success:
        raise HTTPException(status_code=400, detail="텍스트 추출에 실패했습니다.")
    
    return result



# 데브
@router.get("/supported-formats")
async def get_supported_formats(_user: RequireRegisteredUser):
    """지원하는 파일 형식 목록"""
    return {
        "success": True,
        "supported_formats": {
            "images": ["JPEG", "PNG", "GIF", "BMP", "WEBP", "TIFF"],
            "documents": ["PDF"]
        },
        "max_file_size": "10MB",
        "services": {
            "ocr": "Google Cloud Vision API",
            "ai_parsing": f"Google Gemini ({ai_settings.GEMINI_DEFAULT_MODEL})"
        }
    }

# Travel Checklist Endpoints
@router.post("/checklist/{public_id}/generate")
async def generate_travel_checklist(
    public_id: str,
    checklist_request: ChecklistCreateRequest,
    ai_service: AIService,
) -> ChecklistCreateResponse:
    """여행 체크리스트 생성"""
    return await ai_service.create_checklist(
        public_id=public_id,
        force_regenerate=checklist_request.force_regenerate,
        date=checklist_request.date
    ) 


@router.get("/checklist/{public_id}")
async def get_travel_checklist(
    public_id: str,
    ai_service: AIService,
) -> ChecklistRead:
    """여행 체크리스트 조회"""
    try:
        result = await ai_service.get_checklist(public_id=public_id)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"체크리스트 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.patch("/checklist/{public_id}/item/{item_id}")
async def update_checklist_item_status(
    public_id: str,
    item_id: int,
    request: ChecklistItemCheckRequest,
    ai_service: AIService,
) -> StatusResponse:
    result = await ai_service.set_checklist_item_status(
        public_id=public_id,
        item_id=item_id,
        is_checked=request.is_checked
    )
    return result


@router.post("/checklist/{public_id}/item")
async def add_checklist_item(
    public_id: str,
    request: ChecklistItemAddRequest,
    ai_service: AIService,
) -> StatusResponse:
    """체크리스트 항목 추가 (지정된 카테고리)"""
    result = await ai_service.add_checklist_item(
        public_id=public_id,
        name=request.name,
        reason=request.reason,
        category=request.category,
        date=request.date
    )
    return result


@router.delete("/checklist/{public_id}/item/{item_id}")
async def delete_checklist_item(
    public_id: str,
    item_id: int,
    ai_service: AIService,
) -> StatusResponse:
    """체크리스트 항목 삭제 (custom 카테고리만)"""
    result = await ai_service.delete_checklist_item(
        public_id=public_id,
        item_id=item_id
    )
    return result
        
@router.get("/test/gemini")
async def test_gemini(
    ai_service: AIService,
) -> str:
    return await ai_service.test_gemini()