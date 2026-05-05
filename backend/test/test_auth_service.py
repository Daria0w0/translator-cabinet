import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException

from app.services.auth_service import AuthService
from app.schemas import UserCreate
import app.models as models



def fake_user(**kwargs):
    """Создаёт MagicMock, который ведёт себя как models.User."""
    defaults = dict(
        id=1, email="u@test.com", username="user",
        hashed_password="hashed", role="user",
        is_active=True, is_blocked=False,
        is_translator=True, is_editor=False, full_name=None,
    )
    defaults.update(kwargs)
    u = MagicMock(spec=models.User)
    for k, v in defaults.items():
        setattr(u, k, v)
    return u


def fake_token(is_revoked=False, days_left=7, user_id=1):
    """Создаёт MagicMock refresh-токена."""
    t = MagicMock()
    t.is_revoked = is_revoked
    t.user_id = user_id
    t.expires_at = datetime.now(timezone.utc) + timedelta(days=days_left)
    return t


def make_service():
    """Создаёт AuthService с замоканными репозиториями."""
    user_repo = MagicMock()
    token_repo = MagicMock()
    service = AuthService(user_repo, token_repo)
    return service, user_repo, token_repo



class TestRegister:
    def test_успешная_регистрация_возвращает_токены_и_пользователя(self):
        svc, ur, tr = make_service()
        ur.get_by_email_or_username.return_value = None 
        ur.count_all.return_value = 5                   
        created = fake_user()
        ur.create.return_value = created

        result = svc.register(UserCreate(
            email="new@test.com", username="newuser", password="pass123"
        ))

        assert "access_token" in result
        assert "refresh_token" in result
        assert result["user"].id == created.id
        tr.create_refresh_token.assert_called_once()  # токен сохранён в БД

    def test_дублирующий_email_вызывает_400(self):
        svc, ur, _ = make_service()
        ur.get_by_email_or_username.return_value = fake_user()  # уже существует

        with pytest.raises(HTTPException) as exc:
            svc.register(UserCreate(email="u@test.com", username="u", password="p"))
        assert exc.value.status_code == 400

    def test_первый_пользователь_получает_роль_admin(self):
        svc, ur, tr = make_service()
        ur.get_by_email_or_username.return_value = None
        ur.count_all.return_value = 0  # БД пустая

        saved_role = {}

        def capture(user_obj):
            saved_role["role"] = user_obj.role
            user_obj.id = 1
            return user_obj

        ur.create.side_effect = capture
        svc.register(UserCreate(email="first@test.com", username="first", password="pass123"))
        assert saved_role["role"] == "admin"

    def test_не_первый_пользователь_получает_роль_user(self):
        svc, ur, tr = make_service()
        ur.get_by_email_or_username.return_value = None
        ur.count_all.return_value = 10

        saved_role = {}

        def capture(user_obj):
            saved_role["role"] = user_obj.role
            user_obj.id = 2
            return user_obj

        ur.create.side_effect = capture
        svc.register(UserCreate(email="second@test.com", username="second", password="pass123"))
        assert saved_role["role"] == "user"



class TestLogin:
    def test_успешный_вход(self):
        svc, ur, tr = make_service()
        ur.get_by_email.return_value = fake_user()

        with patch("app.services.auth_service.verify_password", return_value=True):
            result = svc.login("u@test.com", "pass123")

        assert "access_token" in result

    def test_неверный_пароль_возвращает_401(self):
        svc, ur, _ = make_service()
        ur.get_by_email.return_value = fake_user()

        with patch("app.services.auth_service.verify_password", return_value=False):
            with pytest.raises(HTTPException) as exc:
                svc.login("u@test.com", "wrong")
        assert exc.value.status_code == 401

    def test_несуществующий_пользователь_возвращает_401(self):
        svc, ur, _ = make_service()
        ur.get_by_email.return_value = None

        with pytest.raises(HTTPException) as exc:
            svc.login("nobody@test.com", "pass")
        assert exc.value.status_code == 401

    def test_заблокированный_пользователь_возвращает_403(self):
        svc, ur, _ = make_service()
        ur.get_by_email.return_value = fake_user(is_blocked=True)

        with patch("app.services.auth_service.verify_password", return_value=True):
            with pytest.raises(HTTPException) as exc:
                svc.login("u@test.com", "pass")
        assert exc.value.status_code == 403

    def test_деактивированный_пользователь_возвращает_400(self):
        svc, ur, _ = make_service()
        ur.get_by_email.return_value = fake_user(is_active=False)

        with patch("app.services.auth_service.verify_password", return_value=True):
            with pytest.raises(HTTPException) as exc:
                svc.login("u@test.com", "pass")
        assert exc.value.status_code == 400



class TestRefresh:
    def test_успешное_обновление_токена(self):
        svc, ur, tr = make_service()
        token = fake_token()
        tr.get_by_hash.return_value = token
        ur.get_by_id.return_value = fake_user()

        result = svc.refresh("some_raw_token")

        tr.revoke.assert_called_once() 
        tr.create_refresh_token.assert_called_once()
        assert "access_token" in result
        assert "refresh_token" in result

    def test_отозванный_токен_отзывает_все_сессии(self):
        svc, ur, tr = make_service()
        token = fake_token(is_revoked=True)
        tr.get_by_hash.return_value = token

        with pytest.raises(HTTPException) as exc:
            svc.refresh("stolen_token")

        tr.revoke_all_for_user.assert_called_once_with(token.user_id)
        assert exc.value.status_code == 401

    def test_истёкший_токен_возвращает_401(self):
        svc, ur, tr = make_service()
        token = fake_token(days_left=-1)
        tr.get_by_hash.return_value = token

        with pytest.raises(HTTPException) as exc:
            svc.refresh("expired_token")

        assert exc.value.status_code == 401
        tr.revoke.assert_called_once()

    def test_несуществующий_токен_возвращает_401(self):
        svc, ur, tr = make_service()
        tr.get_by_hash.return_value = None

        with pytest.raises(HTTPException) as exc:
            svc.refresh("unknown")
        assert exc.value.status_code == 401



class TestLogout:
    def test_logout_отзывает_токен(self):
        svc, ur, tr = make_service()
        token = fake_token()
        tr.get_by_hash.return_value = token

        svc.logout("raw_token")
        tr.revoke.assert_called_once_with(token)

    def test_logout_несуществующего_токена_не_падает(self):
        svc, ur, tr = make_service()
        tr.get_by_hash.return_value = None

        svc.logout("unknown")
        tr.revoke.assert_not_called()

    def test_logout_all_отзывает_все_токены_пользователя(self):
        svc, ur, tr = make_service()
        svc.logout_all(user_id=42)
        tr.revoke_all_for_user.assert_called_once_with(42)



class TestUserRepository:
    """
    Это уже интеграционный тест на уровне репозитория.
    Работает с реальной SQLite через фикстуру db из conftest.py
    """

    def test_create_и_get_by_email(self, db):
        from app.repositories.user_repository import UserRepository
        from app.core_auth import get_password_hash

        repo = UserRepository(db)
        user = models.User(
            email="repo@test.com", username="repouser",
            hashed_password=get_password_hash("pass"),
            role="user", is_active=True, is_blocked=False,
        )
        created = repo.create(user)
        found = repo.get_by_email("repo@test.com")

        assert found is not None
        assert found.id == created.id

    def test_count_all_считает_пользователей(self, db):
        from app.repositories.user_repository import UserRepository
        from app.core_auth import get_password_hash

        repo = UserRepository(db)
        before = repo.count_all()

        user = models.User(
            email="count@test.com", username="countuser",
            hashed_password=get_password_hash("x"),
            role="user", is_active=True, is_blocked=False,
        )
        repo.create(user)
        assert repo.count_all() == before + 1

    def test_get_by_email_or_username_находит_по_email(self, db):
        from app.repositories.user_repository import UserRepository
        from app.core_auth import get_password_hash

        repo = UserRepository(db)
        user = models.User(
            email="find@test.com", username="finduser",
            hashed_password=get_password_hash("x"),
            role="user", is_active=True, is_blocked=False,
        )
        repo.create(user)

        result = repo.get_by_email_or_username("find@test.com", "doesnotexist")
        assert result is not None
        assert result.email == "find@test.com"
