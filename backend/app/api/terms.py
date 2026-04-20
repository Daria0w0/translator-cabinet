from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

import app.database as database
from app.api.dependencies import ProjectAccessChecker, check_user_not_blocked
import app.models as models
from app.schemas import TermEntryResponse

router = APIRouter()


@router.get("/{project_id}/terms", response_model=List[TermEntryResponse])
def get_project_terms(
    project_id: int,
    search: Optional[str] = Query(None, description="Поиск по исходному тексту"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_user_not_blocked),
):
    """Получение терминологической базы проекта."""
    ProjectAccessChecker.check_ownership(project_id, current_user, db)

    query = db.query(models.TermEntry).filter(
        models.TermEntry.project_id == project_id
    )

    if search:
        query = query.filter(
            models.TermEntry.source_text.ilike(f"%{search}%")
        )

    return query.order_by(models.TermEntry.occurrences.desc()).all()