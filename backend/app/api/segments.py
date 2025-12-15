from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func

import app.database as database
from app.api.auth import get_current_user
import app.models as models
from app.schemas import SegmentBase, SegmentResponse, SegmentizeRequest, SegmentUpdateRequest
from app.segmentation import SentenceSegmenter
from app.translation import translator

router = APIRouter()

@router.post("/", response_model=SegmentResponse)
def create_segment(
    segment: SegmentBase, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_segment = models.DocumentSegment(**segment.dict(), translator_id=current_user.id)
    db.add(db_segment)
    db.commit()
    db.refresh(db_segment)
    return SegmentResponse.from_orm(db_segment)

@router.get("/{segment_id}", response_model=SegmentResponse)
def read_segment(
    segment_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    segment = db.query(models.DocumentSegment).filter(
        models.DocumentSegment.id == segment_id
    ).first()
    
    if segment is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    file = db.query(models.ProjectFile).filter(
        models.ProjectFile.id == segment.project_file_id
    ).first()
    
    if file:
        project = db.query(models.Project).filter(
            models.Project.id == file.project_id,
            models.Project.owner_id == current_user.id
        ).first()
        if not project:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return SegmentResponse.from_orm(segment)

@router.put("/{segment_id}", response_model=SegmentResponse)
def update_segment(
    segment_id: int, 
    update_request: SegmentUpdateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_segment = db.query(models.DocumentSegment).filter(
        models.DocumentSegment.id == segment_id
    ).first()
    
    if db_segment is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    file = db.query(models.ProjectFile).filter(
        models.ProjectFile.id == db_segment.project_file_id
    ).first()
    
    if file:
        project = db.query(models.Project).filter(
            models.Project.id == file.project_id,
            models.Project.owner_id == current_user.id
        ).first()
        if not project:
            raise HTTPException(status_code=403, detail="Access denied")
    
    db_segment.translated_text = update_request.translated_text
    db_segment.status = update_request.status
    db_segment.updated_at = func.now()
    
    db.commit()
    db.refresh(db_segment)
    
    if update_request.add_to_termbase and update_request.translated_text.strip():
        try:
            existing = db.query(models.TermEntry).filter(
                models.TermEntry.source_text == db_segment.original_text,
                models.TermEntry.project_id == file.project_id
            ).first()
            
            if existing:
                existing.target_text = update_request.translated_text
                existing.occurrences = existing.occurrences + 1
                db.add(existing)
            else:
                term = models.TermEntry(
                    source_text=db_segment.original_text,
                    target_text=update_request.translated_text,
                    project_id=file.project_id
                )
                db.add(term)
            
            db.commit()
            
        except Exception:
            db.rollback()
    
    return SegmentResponse.from_orm(db_segment)

@router.delete("/{segment_id}")
def delete_segment(
    segment_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    segment = db.query(models.DocumentSegment).filter(
        models.DocumentSegment.id == segment_id
    ).first()
    
    if segment is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    file = db.query(models.ProjectFile).filter(
        models.ProjectFile.id == segment.project_file_id
    ).first()
    
    if file:
        project = db.query(models.Project).filter(
            models.Project.id == file.project_id,
            models.Project.owner_id == current_user.id
        ).first()
        if not project:
            raise HTTPException(status_code=403, detail="Access denied")
    
    db.delete(segment)
    db.commit()
    
    return {"message": "Segment deleted successfully"}