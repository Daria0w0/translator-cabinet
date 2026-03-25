from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List

import app.database as database
from app.api.dependencies import ProjectAccessChecker, check_user_not_blocked, RoleChecker
import app.models as models
from app.schemas import ProjectCreate, ProjectResponse, SegmentResponse, SegmentizeRequest
from app.segmentation import SentenceSegmenter
from app.translation import translator

router = APIRouter()

@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(check_user_not_blocked)
):
    if current_user.role == "admin":
        projects = db.query(models.Project).all()
    else:
        projects = db.query(models.Project).filter(
            models.Project.owner_id == current_user.id
        ).all()
    
    result = []
    for project in projects:
        project_dict = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "source_lang": project.source_lang,
            "target_lang": project.target_lang,
            "status": project.status,
            "owner_id": project.owner_id,
            "fileCount": len(project.files)
        }
        result.append(project_dict)
    
    return result

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_user_not_blocked)
):
    project = ProjectAccessChecker.check_ownership(project_id, current_user, db)
    
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "source_lang": project.source_lang,
        "target_lang": project.target_lang,
        "status": project.status,
        "owner_id": project.owner_id,
        "fileCount": len(project.files)
    }

@router.post("/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(check_user_not_blocked)
):
    db_project = models.Project(
        name=project.name,
        description=project.description,
        source_lang=project.source_lang,
        target_lang=project.target_lang,
        status=project.status,
        owner_id=current_user.id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return {
        "id": db_project.id,
        "name": db_project.name,
        "description": db_project.description,
        "source_lang": db_project.source_lang,
        "target_lang": db_project.target_lang,
        "status": db_project.status,
        "owner_id": db_project.owner_id,
        "fileCount": 0
    }

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_user_not_blocked)
):
    project = ProjectAccessChecker.check_ownership(project_id, current_user, db)
    
    db.delete(project)
    db.commit()

# ==================== СЕГМЕНТЫ ФАЙЛА ====================
@router.get("/{project_id}/files/{file_id}/segments", response_model=List[SegmentResponse])
def get_file_segments(
    project_id: int,
    file_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_user_not_blocked)
):
    ProjectAccessChecker.check_ownership(project_id, current_user, db)
    
    file = ProjectAccessChecker.check_file_access(file_id, current_user, db)

    segments = db.query(models.DocumentSegment).filter(
        models.DocumentSegment.project_file_id == file_id
    ).order_by(models.DocumentSegment.segment_index).all()
    
    return segments

@router.post("/{project_id}/files/{file_id}/segmentize", response_model=List[SegmentResponse])
def segment_file(
    project_id: int,
    file_id: int,
    payload: SegmentizeRequest = Body(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_user_not_blocked)
):
    project = ProjectAccessChecker.check_ownership(project_id, current_user, db)

    file = ProjectAccessChecker.check_file_access(file_id, current_user, db)

    existing_segments = db.query(models.DocumentSegment).filter(
        models.DocumentSegment.project_file_id == file_id
    ).first()
    
    if existing_segments:
        all_segments = db.query(models.DocumentSegment).filter(
            models.DocumentSegment.project_file_id == file_id
        ).order_by(models.DocumentSegment.segment_index).all()
        return all_segments

    text = payload.text
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")
    
    segmenter = SentenceSegmenter()
    raw_segments = segmenter.segment(text, language=project.source_lang)
    original_texts = [seg_data["text"] for seg_data in raw_segments]
    translations = []
    
    if original_texts:
        try:
            translations = translator.translate_batch(
                original_texts, 
                src_lang=project.source_lang,
                tgt_lang=project.target_lang
            )
        except Exception as e:
            print(f"Ошибка при автоматическом переводе сегментов: {e}")
            translations = [""] * len(original_texts)
    
    created_segments = []
    for idx, seg_data in enumerate(raw_segments):
        translated_text = translations[idx] if idx < len(translations) else None
        status_value = "auto_translated" if translated_text and translated_text.strip() else "new"
        
        db_segment = models.DocumentSegment(
            project_file_id=file_id,
            segment_index=idx,
            original_text=seg_data["text"],
            translated_text=translated_text,
            status=status_value,
            translator_id=current_user.id if current_user.is_translator else None
        )
        db.add(db_segment)
        created_segments.append(db_segment)
    
    db.commit()
    
    for seg in created_segments:
        db.refresh(seg)
    
    return created_segments