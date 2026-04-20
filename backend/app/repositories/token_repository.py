from datetime import datetime, timezone
from sqlalchemy.orm import Session
from typing import Optional
import app.models as models
from app.core_auth import hash_token


class TokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_refresh_token(
        self, user_id: int, raw_token: str, expires_at: datetime
    ) -> models.RefreshToken:
        token_record = models.RefreshToken(
            token_hash=hash_token(raw_token),
            user_id=user_id,
            expires_at=expires_at,
            is_revoked=False,
        )
        self.db.add(token_record)
        self.db.commit()
        self.db.refresh(token_record)
        return token_record

    def get_by_hash(self, token_hash: str) -> Optional[models.RefreshToken]:
        return (
            self.db.query(models.RefreshToken)
            .filter(models.RefreshToken.token_hash == token_hash)
            .first()
        )

    def revoke(self, token_record: models.RefreshToken, replaced_by: str = None):
        token_record.is_revoked = True
        if replaced_by:
            token_record.replaced_by = replaced_by
        self.db.commit()

    def revoke_all_for_user(self, user_id: int):
        self.db.query(models.RefreshToken).filter(
            models.RefreshToken.user_id == user_id,
            models.RefreshToken.is_revoked == False,
        ).update({"is_revoked": True})
        self.db.commit()

    def cleanup_expired(self):
        self.db.query(models.RefreshToken).filter(
            models.RefreshToken.expires_at < datetime.now(timezone.utc)
        ).delete()
        self.db.commit()