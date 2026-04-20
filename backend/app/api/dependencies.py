from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

import app.database as database
import app.models as models
from app.core_auth import decode_access_token, get_access_token_from_cookies
from app.repositories.user_repository import UserRepository
from app.repositories.token_repository import TokenRepository
from app.services.auth_service import AuthService

security = HTTPBearer()

def get_user_repository(db: Session = Depends(database.get_db)) -> UserRepository:
    return UserRepository(db)


def get_token_repository(db: Session = Depends(database.get_db)) -> TokenRepository:
    return TokenRepository(db)


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    token_repo: TokenRepository = Depends(get_token_repository),
) -> AuthService:
    return AuthService(user_repo, token_repo)


async def get_current_user_from_cookies(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> models.User:
    access_token = get_access_token_from_cookies(request)
    
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не найден токен доступа в cookies",
        )
    
    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен доступа",
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный формат токена",
        )
    
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный формат ID пользователя",
        )
    
    user = auth_service.get_user_by_id(user_id_int)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь деактивирован",
        )
    
    if user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ваш аккаунт заблокирован. Обратитесь к администратору.",
        )
    
    return user



def check_user_not_blocked(
    current_user: models.User = Depends(get_current_user_from_cookies),
) -> models.User:
    return current_user


class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(
        self, current_user: models.User = Depends(get_current_user_from_cookies)
    ) -> models.User:
        if current_user.role == models.UserRole.ADMIN:
            return current_user

        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для выполнения операции",
            )
        return current_user


def require_admin(current_user: models.User = Depends(get_current_user_from_cookies)) -> models.User:
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора",
        )
    return current_user


class ProjectAccessChecker:
    @staticmethod
    def check_ownership(
        project_id: int,
        current_user: models.User,
        db: Session,
    ) -> models.Project:
        project = db.query(models.Project).filter(
            models.Project.id == project_id
        ).first()

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден",
            )

        if current_user.role == models.UserRole.ADMIN:
            return project

        if project.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этому проекту",
            )

        return project

    @staticmethod
    def check_file_access(
        file_id: int,
        current_user: models.User,
        db: Session,
    ) -> models.ProjectFile:
        file = db.query(models.ProjectFile).filter(
            models.ProjectFile.id == file_id
        ).first()

        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Файл не найден",
            )

        if current_user.role == models.UserRole.ADMIN:
            return file

        project = db.query(models.Project).filter(
            models.Project.id == file.project_id
        ).first()

        if not project or project.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этому файлу",
            )

        return file