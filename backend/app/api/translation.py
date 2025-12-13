from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.translation import translator

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
        return {"translation": translation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))