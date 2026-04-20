from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.translation import translator
from app.schemas import BatchTranslationRequest, BatchTranslationResponse

router = APIRouter()

class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class TranslationResponse(BaseModel):
    translation: str

@router.post("/translate", response_model=TranslationResponse)
def translate_text(req: TranslationRequest):
    try:
        translation = translator.translate(req.text, req.source_lang, req.target_lang)
        return TranslationResponse(translation=translation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch", response_model=BatchTranslationResponse)
def batch_translate(req: BatchTranslationRequest):
    try:
        texts = req.texts
        if not texts:
            return BatchTranslationResponse(translations=[])
        
        translations = translator.translate_batch(
            texts, 
            src_lang=req.source_lang, 
            tgt_lang=req.target_lang
        )
        return BatchTranslationResponse(translations=translations)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))