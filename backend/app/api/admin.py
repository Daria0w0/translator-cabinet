from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

import app.database as database
import app.models as models
from app.api.dependencies import require_admin
from app.schemas import AdminUserListResponse, AdminUserUpdateRequest, AdminProjectResponse

router = APIRouter()


@router.get("/users", response_model=List[AdminUserListResponse])
def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_blocked: Optional[bool] = None,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(require_admin),
):
    """Получение списка всех пользователей (только для админа)"""
    query = db.query(
        models.User,
        func.count(models.Project.id).label("project_count"),
    ).outerjoin(
        models.Project, models.Project.owner_id == models.User.id
    ).group_by(models.User.id)

    if search:
        query = query.filter(
            (models.User.username.ilike(f"%{search}%"))
            | (models.User.email.ilike(f"%{search}%"))
            | (models.User.full_name.ilike(f"%{search}%"))
        )

    if role:
        query = query.filter(models.User.role == role)

    if is_blocked is not None:
        query = query.filter(models.User.is_blocked == is_blocked)

    users_with_counts = query.offset(skip).limit(limit).all()

    result = []
    for user, project_count in users_with_counts:
        result.append({
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "is_translator": user.is_translator,
            "is_editor": user.is_editor,
            "role": user.role,
            "is_active": user.is_active,
            "is_blocked": user.is_blocked,
            "project_count": project_count,
            "created_at": user.created_at if hasattr(user, "created_at") else None,
        })

    return result


@router.put("/users/{user_id}", response_model=AdminUserListResponse)
def update_user(
    user_id: int,
    update_data: AdminUserUpdateRequest,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(require_admin),
):
    """Обновление данных пользователя (админ может всё)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.id == current_admin.id and update_data.is_blocked:
        raise HTTPException(status_code=400, detail="Нельзя заблокировать самого себя")

    if update_data.role is not None:
        user.role = update_data.role

    if update_data.is_blocked is not None:
        user.is_blocked = update_data.is_blocked
        if update_data.is_blocked:
            user.blocked_at = func.now()
            user.blocked_by = current_admin.id
        else:
            user.blocked_at = None
            user.blocked_by = None

    if update_data.is_active is not None:
        user.is_active = update_data.is_active

    db.commit()
    db.refresh(user)

    project_count = db.query(func.count(models.Project.id)).filter(
        models.Project.owner_id == user.id
    ).scalar()

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "is_translator": user.is_translator,
        "is_editor": user.is_editor,
        "role": user.role,
        "is_active": user.is_active,
        "is_blocked": user.is_blocked,
        "project_count": project_count,
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(require_admin),
):
    """Удаление пользователя (админ может удалить любого, кроме себя)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")

    db.delete(user)
    db.commit()


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_admin(
    project_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(require_admin),
):
    """Удаление любого проекта (админ без ограничений)"""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    db.delete(project)
    db.commit()


@router.get("/projects", response_model=List[AdminProjectResponse])
def get_all_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(require_admin),
):
    """Получение всех проектов (админ видит все)"""
    query = db.query(models.Project).join(
        models.User, models.User.id == models.Project.owner_id
    )

    if user_id:
        query = query.filter(models.Project.owner_id == user_id)

    if status:
        query = query.filter(models.Project.status == status)

    projects = query.offset(skip).limit(limit).all()

    result = []
    for project in projects:
        result.append({
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "source_lang": project.source_lang,
            "target_lang": project.target_lang,
            "status": project.status,
            "owner_id": project.owner_id,
            "owner_name": project.owner.username if project.owner else "Unknown",
            "fileCount": len(project.files),
            "created_at": project.created_at,
        })

    return result