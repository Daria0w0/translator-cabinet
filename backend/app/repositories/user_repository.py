from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import app.models as models


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> Optional[models.User]:
        return self.db.query(models.User).filter(models.User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[models.User]:
        return self.db.query(models.User).filter(models.User.email == email).first()

    def get_by_email_or_username(self, email: str, username: str) -> Optional[models.User]:
        return self.db.query(models.User).filter(
            (models.User.email == email) | (models.User.username == username)
        ).first()

    def count_all(self) -> int:
        return self.db.query(func.count(models.User.id)).scalar()

    def create(self, user: models.User) -> models.User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user