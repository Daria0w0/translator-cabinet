from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List

import app.database as database
from app.api.auth import get_current_user
import app.models as models
from app.schemas import ProjectCreate, ProjectResponse, SegmentResponse, SegmentizeRequest
from app.segmentation import SentenceSegmenter
from app.translation import translator

router = APIRouter()

@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    projects = db.query(models.Project).filter(models.Project.owner_id == current_user.id).all()
    return [ProjectResponse.from_orm(project) for project in projects]

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse.from_orm(project)

@router.post("/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    db_project = models.Project(**project.dict(), owner_id=current_user.id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return ProjectResponse.from_orm(db_project)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()

# ==================== СЕГМЕНТЫ ФАЙЛА ====================
@router.get("/{project_id}/files/{file_id}/segments", response_model=List[SegmentResponse])
def get_file_segments(
    project_id: int,
    file_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    file = db.query(models.ProjectFile).filter(
        models.ProjectFile.id == file_id,
        models.ProjectFile.project_id == project_id
    ).first()
    if file is None:
        raise HTTPException(status_code=404, detail="File not found")

    segments = db.query(models.DocumentSegment).filter(
        models.DocumentSegment.project_file_id == file_id
    ).order_by(models.DocumentSegment.segment_index).all()
    
    return [SegmentResponse.from_orm(s) for s in segments]

@router.post("/{project_id}/files/{file_id}/segmentize", response_model=List[SegmentResponse])
def segment_file(
    project_id: int,
    file_id: int,
    payload: SegmentizeRequest = Body(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    file = db.query(models.ProjectFile).filter(
        models.ProjectFile.id == file_id,
        models.ProjectFile.project_id == project_id
    ).first()
    if file is None:
        raise HTTPException(status_code=404, detail="File not found")

    text = payload.text
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")

    db.query(models.DocumentSegment).filter(
        models.DocumentSegment.project_file_id == file_id
    ).delete(synchronize_session=False)
    db.commit()
    
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
        except Exception:
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
    
    return [SegmentResponse.from_orm(s) for s in created_segments]