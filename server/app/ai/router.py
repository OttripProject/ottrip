from fastapi import File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.auth.deps import RequireRegisteredUser
from app.common.schemas import StatusResponse
from app.core.router import create_router

from .config import ai_settings
from .schemas import (
    AiTextParseRequest,
    ChecklistCreateRequest,
    ChecklistCreateResponse,
    ChecklistItemAddRequest,
    ChecklistItemCheckRequest,
    ChecklistRead,
    DocumentTextExtraction,
    DocumentUploadAnalyzeResponse,
    PlanUploadAnalyzeResponse,
)
from .service import AIService

router = create_router()


@router.post("/analyze-upload")
async def analyze_upload(
    ai_service: AIService,
    file: UploadFile = File(...),
) -> DocumentUploadAnalyzeResponse:
    """업로드 파일 OCR + 1-call로 유형·초안 분석 (일정/항공/숙박/비용)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 없습니다.")

    if file.size and file.size > ai_settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"파일 크기는 {ai_settings.MAX_FILE_SIZE // (1024 * 1024)}MB를 초과할 수 없습니다.",
        )

    allowed = set(ai_settings.ALLOWED_IMAGE_TYPES) | set(ai_settings.ALLOWED_PDF_TYPES)
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 파일 형식입니다. 지원 형식: 이미지 (JPEG, PNG, GIF, BMP, WEBP, TIFF), PDF",
        )

    file_data = await file.read()
    result = await ai_service.analyze_uploaded_document(
        file_data=file_data,
        content_type=file.content_type or "",
        filename=file.filename,
    )

    return result


@router.post("/analyze-plan-upload")
async def analyze_plan_upload(
    ai_service: AIService,
    file: UploadFile = File(...),
) -> PlanUploadAnalyzeResponse:
    """업로드 파일에서 여행 전체 일정(복수 항목) 추출."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 없습니다.")

    if file.size and file.size > ai_settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"파일 크기는 {ai_settings.MAX_FILE_SIZE // (1024 * 1024)}MB를 초과할 수 없습니다.",
        )

    allowed = (
        set(ai_settings.ALLOWED_IMAGE_TYPES)
        | set(ai_settings.ALLOWED_PDF_TYPES)
        | set(ai_settings.ALLOWED_EXCEL_TYPES)
    )
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 파일 형식입니다. 지원 형식: 이미지, PDF, Excel (xlsx·xls·csv)",
        )

    file_data = await file.read()
    return await ai_service.analyze_uploaded_plan(
        file_data=file_data,
        content_type=file.content_type or "",
        filename=file.filename,
    )


@router.post("/test/extract-text-only")
async def extract_text_only(
    ai_service: AIService,
    file: UploadFile = File(...),
) -> DocumentTextExtraction:
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 없습니다.")

    if file.size and file.size > ai_settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"파일 크기는 {ai_settings.MAX_FILE_SIZE // (1024 * 1024)}MB를 초과할 수 없습니다.",
        )

    file_data = await file.read()

    if file.content_type in ai_settings.ALLOWED_IMAGE_TYPES:
        result = await ai_service.extract_text_from_image(file_data)
    elif file.content_type in ai_settings.ALLOWED_PDF_TYPES:
        result = await ai_service.extract_text_from_pdf(file_data)
    else:
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 파일 형식입니다. 지원 형식: 이미지 (JPEG, PNG, GIF, BMP, WEBP, TIFF), PDF",
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
            "documents": ["PDF"],
        },
        "max_file_size": "10MB",
        "services": {
            "ocr": "Google Cloud Vision API",
            "document_analyze": f"Google Gemini ({ai_settings.GEMINI_DEFAULT_MODEL})",
        },
    }


@router.post("/parse-text")
async def parse_text_to_item(
    request: AiTextParseRequest,
    ai_service: AIService,
) -> DocumentUploadAnalyzeResponse:
    """자연어 텍스트 → 아이템 유형·초안 분석 (일정/항공/숙박/비용)."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="텍스트를 입력해주세요.")
    return await ai_service.parse_text_to_item(
        text=request.text.strip(),
        plan_public_id=request.plan_public_id,
    )


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
        date=checklist_request.date,
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
            detail=f"체크리스트 조회 중 오류가 발생했습니다: {str(e)}",
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
        is_checked=request.is_checked,
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
        date=request.date,
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
        item_id=item_id,
    )
    return result


@router.get("/test/gemini")
async def test_gemini(
    ai_service: AIService,
) -> str:
    return await ai_service.test_gemini()
