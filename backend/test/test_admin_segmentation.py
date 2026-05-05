import pytest
import app.models as models
from app.core_auth import get_password_hash



def make_user(db, email, username, role="user", is_blocked=False):
    u = models.User(
        email=email, username=username,
        hashed_password=get_password_hash("password123"),
        role=role, is_active=True, is_blocked=is_blocked,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def make_project(db, owner_id, name="Project"):
    p = models.Project(
        name=name, description="", source_lang="eng_Latn",
        target_lang="rus_Cyrl", status="Новый", owner_id=owner_id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p



class TestAdminUsers:
    def test_список_пользователей_доступен_админу(self, admin_client):
        resp = admin_client.get("/api/admin/users")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    def test_список_пользователей_недоступен_обычному(self, auth_client):
        resp = auth_client.get("/api/admin/users")
        assert resp.status_code == 403

    def test_список_пользователей_недоступен_без_авторизации(self, client):
        client.cookies.clear()
        resp = client.get("/api/admin/users")
        assert resp.status_code == 401

    def test_пагинация_limit(self, admin_client, db):
        for i in range(5):
            make_user(db, f"bulk{i}@test.com", f"bulkuser{i}")
        resp = admin_client.get("/api/admin/users?skip=0&limit=2")
        assert resp.status_code == 200
        assert len(resp.json()["items"]) <= 2

    def test_поиск_по_username(self, admin_client, db):
        make_user(db, "unique_xyz@test.com", "unique_xyz_user")
        resp = admin_client.get("/api/admin/users?search=unique_xyz")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert any("unique_xyz" in u["username"] for u in items)

    def test_фильтр_по_is_blocked(self, admin_client, db):
        make_user(db, "bl@test.com", "blockedone", is_blocked=True)
        resp = admin_client.get("/api/admin/users?is_blocked=true")
        assert resp.status_code == 200
        # Все в ответе должны быть заблокированы
        assert all(u["is_blocked"] for u in resp.json()["items"])

    def test_блокировка_пользователя(self, admin_client, db, admin_user):
        target = make_user(db, "target@test.com", "targetuser")
        resp = admin_client.put(f"/api/admin/users/{target.id}", json={"is_blocked": True})
        assert resp.status_code == 200
        assert resp.json()["is_blocked"] is True

    def test_нельзя_заблокировать_самого_себя(self, admin_client, admin_user):
        resp = admin_client.put(f"/api/admin/users/{admin_user.id}", json={"is_blocked": True})
        assert resp.status_code == 400

    def test_удаление_пользователя(self, admin_client, db):
        target = make_user(db, "del@test.com", "deluser")
        resp = admin_client.delete(f"/api/admin/users/{target.id}")
        assert resp.status_code == 204

    def test_нельзя_удалить_самого_себя(self, admin_client, admin_user):
        resp = admin_client.delete(f"/api/admin/users/{admin_user.id}")
        assert resp.status_code == 400

    def test_удаление_несуществующего_пользователя_возвращает_404(self, admin_client):
        resp = admin_client.delete("/api/admin/users/99999")
        assert resp.status_code == 404

    def test_обновление_несуществующего_пользователя_возвращает_404(self, admin_client):
        resp = admin_client.put("/api/admin/users/99999", json={"is_blocked": False})
        assert resp.status_code == 404



class TestAdminProjects:
    def test_admin_видит_проекты_всех_пользователей(self, admin_client, db, regular_user, admin_user):
        make_project(db, regular_user.id, "User Project")
        make_project(db, admin_user.id, "Admin Project")
        resp = admin_client.get("/api/admin/projects")
        assert resp.status_code == 200
        assert len(resp.json()) >= 2

    def test_фильтр_по_user_id(self, admin_client, db, regular_user):
        make_project(db, regular_user.id, "Only This")
        resp = admin_client.get(f"/api/admin/projects?user_id={regular_user.id}")
        assert resp.status_code == 200
        assert all(p["owner_id"] == regular_user.id for p in resp.json())

    def test_удаление_любого_проекта(self, admin_client, db, regular_user):
        p = make_project(db, regular_user.id, "ToDelete")
        resp = admin_client.delete(f"/api/admin/projects/{p.id}")
        assert resp.status_code == 204

    def test_удаление_несуществующего_проекта_возвращает_404(self, admin_client):
        resp = admin_client.delete("/api/admin/projects/99999")
        assert resp.status_code == 404



class TestSegmenter:
    def setup_method(self):
        from app.segmentation import SimpleSentenceSegmenter
        self.seg = SimpleSentenceSegmenter()

    def test_пустая_строка_возвращает_пустой_список(self):
        assert self.seg.segment("") == []

    def test_строка_из_пробелов_возвращает_пустой_список(self):
        assert self.seg.segment("   ") == []

    def test_одно_предложение(self):
        result = self.seg.segment("Hello world.")
        assert len(result) >= 1
        assert result[0]["type"] == "sentence"

    def test_несколько_предложений(self):
        result = self.seg.segment("First. Second. Third.")
        assert len(result) >= 2

    def test_структура_элемента(self):
        result = self.seg.segment("Test.")
        assert "text" in result[0]
        assert "index" in result[0]
        assert "type" in result[0]

    def test_индексы_последовательны(self):
        result = self.seg.segment("One. Two. Three.")
        indexes = [s["index"] for s in result]
        assert indexes == sorted(indexes)

    def test_вопросительный_знак_разделяет(self):
        result = self.seg.segment("Is this right? Yes it is.")
        assert len(result) >= 2

    def test_восклицательный_знак_разделяет(self):
        result = self.seg.segment("Attention! This matters.")
        assert len(result) >= 2

    def test_текст_без_знаков_препинания(self):
        # Текст без точек — возвращается как один сегмент
        result = self.seg.segment("No punctuation here")
        assert len(result) >= 1
        assert result[0]["text"] == "No punctuation here"


# ─────────────────────────────────────────────────────────────
# Terms
# ─────────────────────────────────────────────────────────────

class TestTerms:
    def test_пустая_терминобаза(self, auth_client, db, regular_user):
        p = make_project(db, regular_user.id, "Terms Test")
        resp = auth_client.get(f"/api/projects/{p.id}/terms")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_термины_возвращаются_с_данными(self, auth_client, db, regular_user):
        p = make_project(db, regular_user.id, "Terms Test2")
        term = models.TermEntry(
            source_text="cat", target_text="кот",
            project_id=p.id, occurrences=1,
        )
        db.add(term)
        db.commit()

        resp = auth_client.get(f"/api/projects/{p.id}/terms")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["source_text"] == "cat"

    def test_поиск_в_терминах(self, auth_client, db, regular_user):
        p = make_project(db, regular_user.id, "Terms Test3")
        for word in ["apple", "application", "banana"]:
            db.add(models.TermEntry(
                source_text=word, target_text=f"{word}_ru", project_id=p.id,
            ))
        db.commit()

        resp = auth_client.get(f"/api/projects/{p.id}/terms?search=app")
        assert resp.status_code == 200
        items = resp.json()
        assert all("app" in item["source_text"] for item in items)


# ─────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────

def test_health_check_возвращает_healthy(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"
