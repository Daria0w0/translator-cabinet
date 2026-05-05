import sys
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.modules.setdefault("transformers", MagicMock())
sys.modules.setdefault("torch", MagicMock())
sys.modules.setdefault("minio", MagicMock())
sys.modules.setdefault("minio.error", MagicMock())

from app.database import Base
from app.main import app
import app.database as database
import app.models as models
from app.core_auth import get_password_hash
from fastapi import Response as FastAPIResponse

def _test_set_auth_cookies(response: FastAPIResponse, access_token: str, refresh_token: str):
    """Версия set_auth_cookies для тестов — без secure=True."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=30 * 24 * 60 * 60,
        path="/",
    )

patch("app.core_auth.set_auth_cookies", _test_set_auth_cookies).start()
patch("app.api.auth.set_auth_cookies", _test_set_auth_cookies).start()

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def clean_db():
    db = TestingSessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
    yield


@pytest.fixture(scope="session")
def minio_mock():
    mock = MagicMock()
    mock.upload_file.return_value = "translations/test_object"
    mock.download_file.return_value = True
    mock.get_file_url.return_value = "http://localhost:9000/translations/test_object"
    mock.bucket_name = "translations"
    return mock


@pytest.fixture(scope="session")
def client(minio_mock):
    app.dependency_overrides[database.get_db] = override_get_db
    with patch("app.minio_client.minio_client", minio_mock), \
         patch("app.api.files.minio_client", minio_mock):
        c = TestClient(app, raise_server_exceptions=True)
        yield c
    app.dependency_overrides.clear()



def make_user(db, email, username, password="password123",
              role="user", is_translator=True, is_editor=False,
              is_active=True, is_blocked=False):
    user = models.User(
        email=email, username=username,
        hashed_password=get_password_hash(password),
        role=role, is_translator=is_translator,
        is_editor=is_editor, is_active=is_active, is_blocked=is_blocked,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def do_login(client, email, password="password123"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def regular_user(db):
    return make_user(db, "user@test.com", "testuser")


@pytest.fixture
def admin_user(db):
    return make_user(db, "admin@test.com", "adminuser", role="admin")


@pytest.fixture
def blocked_user(db):
    return make_user(db, "blocked@test.com", "blockeduser", is_blocked=True)


@pytest.fixture
def auth_client(client, regular_user):
    client.cookies.clear()
    do_login(client, regular_user.email)
    yield client
    client.cookies.clear()


@pytest.fixture
def admin_client(client, admin_user):
    client.cookies.clear()
    do_login(client, admin_user.email)
    yield client
    client.cookies.clear()