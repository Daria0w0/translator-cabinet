from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func

import app.database as database
from app.api.dependencies import ProjectAccessChecker, check_user_not_blocked
import app.models as models
from app.schemas import SegmentBase, SegmentResponse, SegmentUpdateRequest

router = APIRouter()

@router.post("/", response_model=SegmentResponse)
def create_segment(
    segment: SegmentBase, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_user_not_blocked)
):
    file = ProjectAccessChecker.check_file_access(segment.project_file_id, current_user, db)
    
    db_segment = models.DocumentSegment(
        project_file_id=segment.project_file_id,
        segment_index=segment.segment_index,
        original_text=segment.original_text,
        translated_text=segment.translated_text,
        status=segment.status,
        translator_id=current_user.id if current_user.is_translator else None
    )
    db.add(db_segment)
    db.commit()
    db.refresh(db_segment)
    return db_segment

@router.get("/{segment_id}", response_model=SegmentResponse)
def read_segment(
    segment_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_user_not_blocked)
):
    segment = db.query(models.DocumentSegment).filter(
        models.DocumentSegment.id == segment_id
    ).first()
    
    if segment is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    ProjectAccessChecker.check_file_access(segment.project_file_id, current_user, db)
    
    return segment

@router.put("/{segment_id}", response_model=SegmentResponse)
def update_segment(
    segment_id: int, 
    update_request: SegmentUpdateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_user_not_blocked)
):
    db_segment = db.query(models.DocumentSegment).filter(
        models.DocumentSegment.id == segment_id
    ).first()
    
    if db_segment is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    file = ProjectAccessChecker.check_file_access(db_segment.project_file_id, current_user, db)
    
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
    
    return db_segment

@router.delete("/{segment_id}")
def delete_segment(
    segment_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_user_not_blocked)
):
    segment = db.query(models.DocumentSegment).filter(
        models.DocumentSegment.id == segment_id
    ).first()
    
    if segment is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    ProjectAccessChecker.check_file_access(segment.project_file_id, current_user, db)
    
    db.delete(segment)
    db.commit()
    
    return {"message": "Segment deleted successfully"}