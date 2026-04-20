from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from fastapi import HTTPException, status

import app.models as models
from app.core_auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    hash_token,
    decode_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from app.repositories.user_repository import UserRepository
from app.repositories.token_repository import TokenRepository
from app.schemas import UserCreate, UserResponse


class AuthService:
    def __init__(self, user_repo: UserRepository, token_repo: TokenRepository):
        self.user_repo = user_repo
        self.token_repo = token_repo

    def register(self, user_data: UserCreate) -> dict:
        existing = self.user_repo.get_by_email_or_username(
            user_data.email, user_data.username
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email или username уже заняты",
            )

        hashed_password = get_password_hash(user_data.password)

        user_count = self.user_repo.count_all()
        role = "admin" if user_count == 0 else "user"

        db_user = models.User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            is_translator=user_data.is_translator,
            is_editor=user_data.is_editor,
            role=role,
            is_active=True,
            is_blocked=False,
        )
        db_user = self.user_repo.create(db_user)

        return self._issue_tokens(db_user)

    def login(self, email: str, password: str) -> dict:
        user = self.user_repo.get_by_email(email)

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный email или пароль",
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

        return self._issue_tokens(user)

    def refresh(self, raw_refresh_token: str) -> dict:
        token_hash = hash_token(raw_refresh_token)
        token_record = self.token_repo.get_by_hash(token_hash)

        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token не найден",
            )

        if token_record.is_revoked:
            self.token_repo.revoke_all_for_user(token_record.user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token отозван. Все сессии завершены из соображений безопасности.",
            )

        if token_record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            self.token_repo.revoke(token_record)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token истёк",
            )

        user = self.user_repo.get_by_id(token_record.user_id)
        if not user or user.is_blocked or not user.is_active:
            self.token_repo.revoke(token_record)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Пользователь заблокирован или деактивирован",
            )

        new_raw_refresh = create_refresh_token()
        new_hash = hash_token(new_raw_refresh)

        self.token_repo.revoke(token_record, replaced_by=new_hash)

        expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        self.token_repo.create_refresh_token(user.id, new_raw_refresh, expires_at)

        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        return {
            "access_token": access_token,
            "refresh_token": new_raw_refresh,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
        }

    def logout(self, raw_refresh_token: str):
        token_hash = hash_token(raw_refresh_token)
        token_record = self.token_repo.get_by_hash(token_hash)
        if token_record and not token_record.is_revoked:
            self.token_repo.revoke(token_record)

    def logout_all(self, user_id: int):
        self.token_repo.revoke_all_for_user(user_id)

    def get_user_by_id(self, user_id: int) -> Optional[models.User]:
        return self.user_repo.get_by_id(user_id)

    def _issue_tokens(self, user: models.User) -> dict:
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        raw_refresh = create_refresh_token()
        expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        self.token_repo.create_refresh_token(user.id, raw_refresh, expires_at)

        return {
            "access_token": access_token,
            "refresh_token": raw_refresh,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
        }