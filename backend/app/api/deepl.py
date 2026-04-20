"""
Yandex Translate API endpoints.
(kept as /api/deepl/ to avoid changing frontend routes)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List

from app.services import deepl_service

router = APIRouter()


class DeepLTranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str


class DeepLTranslateResponse(BaseModel):
    translation: str
    provider: str = "yandex"


class DeepLBatchRequest(BaseModel):
    texts: List[str]
    source_lang: str
    target_lang: str


class DeepLBatchResponse(BaseModel):
    translations: List[str]
    provider: str = "yandex"


class DeepLStatusResponse(BaseModel):
    available: bool
    message: str


@router.get("/status", response_model=DeepLStatusResponse)
def deepl_status():
    available = deepl_service.is_available()
    return DeepLStatusResponse(
        available=available,
        message="Yandex Translate is configured" if available else "YANDEX_API_KEY or YANDEX_FOLDER_ID is not set",
    )


@router.post("/translate", response_model=DeepLTranslateResponse)
def deepl_translate(req: DeepLTranslateRequest):
    if not deepl_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Yandex Translate is not configured on this server",
        )
    try:
        result = deepl_service.translate(req.text, req.source_lang, req.target_lang)
        return DeepLTranslateResponse(translation=result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Yandex Translate is temporarily unavailable: {str(e)}",
        )


@router.post("/batch", response_model=DeepLBatchResponse)
def deepl_batch(req: DeepLBatchRequest):
    if not deepl_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Yandex Translate is not configured on this server",
        )
    if not req.texts:
        return DeepLBatchResponse(translations=[])
    try:
        results = deepl_service.translate_batch(req.texts, req.source_lang, req.target_lang)
        return DeepLBatchResponse(translations=results)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Yandex Translate is temporarily unavailable: {str(e)}",
        )