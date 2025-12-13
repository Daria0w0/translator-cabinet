from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

import app.database as database
from app.api.auth import get_current_user
import app.models as models
from app.schemas import ProjectCreate, ProjectResponse

router = APIRouter()

@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Получить все проекты пользователя"""
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

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Получить проект по ID"""
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

@router.post("/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Создать новый проект"""
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

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Удалить проект"""
    import os
    
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