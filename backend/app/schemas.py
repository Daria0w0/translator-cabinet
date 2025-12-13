from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

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

    class Config:
        from_attributes = True

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
    sourceLang: str = Field(..., min_length=1, max_length=50)
    targetLang: str = Field(..., min_length=1, max_length=50)
    status: str = Field(default="Новый", max_length=50)

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    sourceLang: str
    targetLang: str
    status: str
    owner_id: int
    fileCount: int = 0

    class Config:
        from_attributes = True

# ==================== Файлы ====================
class ProjectFileResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class FileContent(BaseModel):
    content: str
    type: str

# ==================== Сегменты ====================
class SegmentBase(BaseModel):
    segment_index: int
    original_text: str
    translated_text: Optional[str] = None
    status: str = "new"

class SegmentResponse(SegmentBase):
    id: int
    project_file_id: int
    translator_id: Optional[int] = None
    editor_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str