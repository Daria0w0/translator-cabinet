import pytest


class TestRegister:
    def test_успешная_регистрация_возвращает_201(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "secure123",
            "is_translator": True,
            "is_editor": False,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "newuser@example.com"
        assert data["username"] == "newuser"
        assert "hashed_password" not in data  # пароль не должен утекать

    def test_регистрация_устанавливает_cookies(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "cookie@example.com",
            "username": "cookieuser",
            "password": "pass1234",
            "is_translator": True,
            "is_editor": False,
        })
        assert resp.status_code == 201
        headers_str = str(resp.headers)
        assert "access_token" in headers_str or "access_token" in str(resp.cookies)

    def test_дублирующий_email_возвращает_400(self, client, regular_user):
        resp = client.post("/api/auth/register", json={
            "email": regular_user.email,  # уже занят
            "username": "differentname",
            "password": "pass1234",
            "is_translator": True,
            "is_editor": False,
        })
        assert resp.status_code == 400

    def test_невалидный_email_возвращает_422(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "not-an-email",  # невалидный формат
            "username": "someuser",
            "password": "pass1234",
            "is_translator": True,
            "is_editor": False,
        })
        assert resp.status_code == 422

    def test_отсутствие_обязательных_полей_возвращает_422(self, client):
        resp = client.post("/api/auth/register", json={"email": "x@x.com"})
        assert resp.status_code == 422


class TestLogin:
    def test_успешный_вход_возвращает_данные_пользователя(self, client, regular_user):
        resp = client.post("/api/auth/login", json={
            "email": regular_user.email,
            "password": "password123",
        })
        assert resp.status_code == 200
        assert resp.json()["email"] == regular_user.email

    def test_неверный_пароль_возвращает_401(self, client, regular_user):
        resp = client.post("/api/auth/login", json={
            "email": regular_user.email,
            "password": "WRONG_PASSWORD",
        })
        assert resp.status_code == 401

    def test_несуществующий_пользователь_возвращает_401(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "ghost@example.com",
            "password": "anypass",
        })
        assert resp.status_code == 401

    def test_заблокированный_пользователь_возвращает_403(self, client, blocked_user):
        resp = client.post("/api/auth/login", json={
            "email": blocked_user.email,
            "password": "password123",
        })
        assert resp.status_code == 403
        assert "заблокирован" in resp.json()["detail"]


class TestMe:
    def test_me_возвращает_профиль_авторизованного(self, auth_client, regular_user):
        resp = auth_client.get("/api/auth/me")
        assert resp.status_code == 200
        assert resp.json()["email"] == regular_user.email

    def test_me_без_авторизации_возвращает_401(self, client):
        client.cookies.clear()
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401


class TestCheck:
    def test_check_для_авторизованного_возвращает_true(self, auth_client):
        resp = auth_client.get("/api/auth/check")
        assert resp.status_code == 200
        assert resp.json()["authenticated"] is True
        assert resp.json()["user"] is not None

    def test_check_без_авторизации_возвращает_false(self, client):
        client.cookies.clear()
        resp = client.get("/api/auth/check")
        assert resp.status_code == 200
        assert resp.json()["authenticated"] is False


class TestRefreshEndpoint:
    def test_refresh_после_входа_возвращает_200(self, client, regular_user):
        client.post("/api/auth/login", json={
            "email": regular_user.email,
            "password": "password123",
        })
        resp = client.post("/api/auth/refresh")
        assert resp.status_code == 200

    def test_refresh_без_cookie_возвращает_401(self, client):
        client.cookies.clear()
        resp = client.post("/api/auth/refresh")
        assert resp.status_code == 401


class TestLogoutEndpoint:
    def test_logout_завершает_сессию(self, client, regular_user):
        client.post("/api/auth/login", json={
            "email": regular_user.email,
            "password": "password123",
        })
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200
        assert "завершена" in resp.json()["message"]

    def test_logout_без_сессии_возвращает_200(self, client):
        client.cookies.clear()
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200
