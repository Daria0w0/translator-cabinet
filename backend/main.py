import os
from fastapi import File, UploadFile, status
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import models
import database
from pydantic import BaseModel, Field
from auth import get_password_hash, verify_password, create_access_token, get_current_user, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from schemas import UserCreate, UserResponse, Token, LoginRequest
from datetime import datetime, timedelta, timezone
from minio_client import minio_client
import uuid
import shutil

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/")
def read_root():
    return {"message": "API работает с PostgreSQL!"}

@app.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(database.get_db)):
    existing_user = db.query(models.User).filter(
        (models.User.email == user_data.email) | (models.User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email или username уже заняты"
        )
    
    hashed_password = get_password_hash(user_data.password)
    db_user = models.User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        is_translator=user_data.is_translator,
        is_editor=user_data.is_editor
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(db_user.id)}, expires_delta=access_token_expires
    )

    user_response = UserResponse.model_validate(db_user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@app.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь деактивирован"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    user_response = UserResponse.model_validate(user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@app.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/projects/", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    try:
        projects = db.query(models.Project).filter(models.Project.owner_id == current_user.id).all()
       
        response_projects = []
        for project in projects:
            file_count = db.query(func.count(models.ProjectFile.id)).filter(
                models.ProjectFile.project_id == project.id
            ).scalar()
            
            response_projects.append(ProjectResponse(
                id=project.id,
                name=project.name,
                description=project.description,
                sourceLang=project.source_lang,
                targetLang=project.target_lang, 
                status=project.status,
                owner_id=project.owner_id,
                fileCount=file_count
            ))
        return response_projects
    
    except Exception as e:
        print(f"Ошибка при получении проектов: {e}")
        raise HTTPException(status_code=500, detail="Ошибка базы данных")

@app.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    try:
        project = db.query(models.Project).filter(
            models.Project.id == project_id,
            models.Project.owner_id == current_user.id
        ).first()
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        
        file_count = db.query(func.count(models.ProjectFile.id)).filter(
            models.ProjectFile.project_id == project.id
        ).scalar()
        
        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            sourceLang=project.source_lang,
            targetLang=project.target_lang,
            status=project.status,
            owner_id=project.owner_id,
            fileCount=file_count
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ошибка при получении проекта {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка базы данных")

@app.post("/projects/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    try:
        db_project = models.Project(
            name=project.name,
            description=project.description,
            source_lang=project.sourceLang,
            target_lang=project.targetLang,
            status=project.status,
            owner_id=int(current_user.id)
        )
        
        db.add(db_project)
        db.commit()
        db.refresh(db_project)

        print("Project created id=", db_project.id)
        
        return ProjectResponse(
            id=db_project.id,
            name=db_project.name,
            description=db_project.description,
            sourceLang=db_project.source_lang,
            targetLang=db_project.target_lang,
            status=db_project.status,
            owner_id=db_project.owner_id,
            fileCount=0
        )
        
    except Exception as e:
        db.rollback()
        print(f"Ошибка при создании проекта: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при создании проекта: {str(e)}")

@app.post("/projects/{project_id}/upload-file", response_model=ProjectFileResponse)
async def upload_project_file(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Создаем временный файл
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{project_id}_{uuid.uuid4()}{file_extension}"
        temp_file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Сохраняем файл временно
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            file_size = len(content)
        
        # Загружаем в MinIO
        object_name = f"project_{project_id}/{unique_filename}"
        minio_path = minio_client.upload_file(temp_file_path, object_name)
        
        if not minio_path:
            raise HTTPException(status_code=500, detail="Ошибка загрузки файла в MinIO")
        
        # Удаляем временный файл
        os.remove(temp_file_path)
        
        db_file = models.ProjectFile(
            filename=unique_filename,
            original_name=file.filename,
            file_path=minio_path,  # Сохраняем путь в MinIO
            file_size=file_size,
            mime_type=file.content_type or "application/octet-stream",
            project_id=project_id
        )
        
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        
        return ProjectFileResponse.model_validate(db_file)
        
    except Exception as e:
        db.rollback()
        print(f"Ошибка при загрузке файла: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при загрузке файла")

@app.get("/projects/{project_id}/files", response_model=List[ProjectFileResponse])
def get_project_files(
    project_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return [ProjectFileResponse.model_validate(f) for f in project.files]

@app.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        for project_file in project.files:
            if os.path.exists(project_file.file_path):
                os.remove(project_file.file_path)

        db.delete(project)
        db.commit()
        return
    
    except Exception as e:
        db.rollback()
        print(f"Ошибка при удалении проекта: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при удалении проекта")
    
@app.delete("/projects/{project_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_file(
    project_id: int,
    file_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_file = db.query(models.ProjectFile).filter(
        models.ProjectFile.id == file_id,
        models.ProjectFile.project_id == project_id
    ).first()
    
    if not project_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        if os.path.exists(project_file.file_path):
            os.remove(project_file.file_path)
        
        db.delete(project_file)
        db.commit()
        return
        
    except Exception as e:
        db.rollback()
        print(f"Ошибка при удалении файла: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при удалении файла")