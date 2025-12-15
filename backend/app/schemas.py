from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from pydantic import ConfigDict

# ==================== Пользователи ====================
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    is_translator: bool = False
    is_editor: bool = False

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# ==================== Проекты ====================
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = ""
    source_lang: str = Field(..., min_length=1, max_length=50)
    target_lang: str = Field(..., min_length=1, max_length=50)
    status: str = Field(default="Новый", max_length=50)

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    source_lang: str
    target_lang: str
    status: str
    owner_id: int
    fileCount: int = 0
    model_config = ConfigDict(from_attributes=True)

# ==================== Файлы ====================
class ProjectFileResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)

class FileContent(BaseModel):
    content: str
    type: str

# ==================== Сегменты ====================
class SegmentBase(BaseModel):
    project_file_id: int
    segment_index: int
    original_text: str
    translated_text: Optional[str] = None
    status: str = "new"

class SegmentResponse(SegmentBase):
    id: int
    translator_id: Optional[int] = None
    editor_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SegmentUpdateRequest(BaseModel):
    translated_text: str
    status: Optional[str] = "translated"
    add_to_termbase: Optional[bool] = False

# ==================== Термины ====================
class TermEntryCreate(BaseModel):
    source_text: str
    target_text: str
    project_id: Optional[int] = None

class TermEntryResponse(TermEntryCreate):
    id: int
    occurrences: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ==================== Перевод ====================
class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class BatchTranslationRequest(BaseModel):
    texts: List[str]
    source_lang: str
    target_lang: str

class BatchTranslationResponse(BaseModel):
    translations: List[str]

class SegmentizeRequest(BaseModel):
    text: str
    method: Optional[str] = "hybrid"