from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import database
from pydantic import BaseModel

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProjectCreate(BaseModel):
    name: str
    description: str
    sourceLang: str
    targetLang: str
    fileName: Optional[str] = None
    status: str = "Новый"

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    sourceLang: str
    targetLang: str
    fileName: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

@app.get("/")
def read_root():
    return {"message": "API работает с PostgreSQL!"}

@app.get("/projects/", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(database.get_db)):
    try:
        projects = db.query(models.Project).all()
        # Вручную преобразуем поля
        response_projects = []
        for project in projects:
            response_projects.append(ProjectResponse(
                id=project.id,
                name=project.name,
                description=project.description,
                sourceLang=project.source_lang,
                targetLang=project.target_lang, 
                fileName=project.file_name,     
                status=project.status
            ))
        return response_projects
    except Exception as e:
        print(f"Ошибка при получении проектов: {e}")
        raise HTTPException(status_code=500, detail="Ошибка базы данных")

@app.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(database.get_db)):
    try:
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            sourceLang=project.source_lang,
            targetLang=project.target_lang,
            fileName=project.file_name,
            status=project.status
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ошибка при получении проекта {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка базы данных")

@app.post("/projects/", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(database.get_db)):
    try:
        db_project = models.Project(
            name=project.name,
            description=project.description,
            source_lang=project.sourceLang,
            target_lang=project.targetLang,
            file_name=project.fileName,
            status=project.status
        )
        
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        
        return ProjectResponse(
            id=db_project.id,
            name=db_project.name,
            description=db_project.description,
            sourceLang=db_project.source_lang,
            targetLang=db_project.target_lang,
            fileName=db_project.file_name,
            status=db_project.status
        )
        
    except Exception as e:
        db.rollback()
        print(f"Ошибка при создании проекта: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при создании проекта: {str(e)}")
    
from fastapi import status

@app.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(database.get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        db.delete(project)
        db.commit()
        return
    except Exception as e:
        db.rollback()
        print(f"Ошибка при удалении проекта: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при удалении проекта")