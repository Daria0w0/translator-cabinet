import pytest
import io
import app.models as models



def create_project(db, owner_id, name="Test Project",
                   status="Новый", source_lang="eng_Latn", target_lang="rus_Cyrl"):
    p = models.Project(
        name=name, description="Test desc",
        source_lang=source_lang, target_lang=target_lang,
        status=status, owner_id=owner_id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def create_file(db, project_id, filename="test.txt"):
    f = models.ProjectFile(
        filename=filename, original_name=filename,
        file_path=f"translations/project_{project_id}/{filename}",
        file_size=100, mime_type="text/plain", project_id=project_id,
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


def create_segment(db, file_id, original="Hello", index=0):
    s = models.DocumentSegment(
        project_file_id=file_id, segment_index=index,
        original_text=original, status="new",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s



class TestCreateProject:
    def test_успешное_создание(self, auth_client):
        resp = auth_client.post("/api/projects/", json={
            "name": "My Project",
            "description": "описание",
            "source_lang": "eng_Latn",
            "target_lang": "rus_Cyrl",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "My Project"
        assert data["fileCount"] == 0

    def test_пустое_название_возвращает_422(self, auth_client):
        resp = auth_client.post("/api/projects/", json={
            "name": "",
            "source_lang": "eng_Latn",
            "target_lang": "rus_Cyrl",
        })
        assert resp.status_code == 422

    def test_без_авторизации_возвращает_401(self, client):
        client.cookies.clear()
        resp = client.post("/api/projects/", json={
            "name": "Proj", "source_lang": "eng_Latn", "target_lang": "rus_Cyrl"
        })
        assert resp.status_code == 401


class TestGetProjects:
    def test_список_проектов_текущего_пользователя(self, auth_client, db, regular_user):
        create_project(db, regular_user.id, "Alpha")
        create_project(db, regular_user.id, "Beta")
        resp = auth_client.get("/api/projects/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 2
        assert isinstance(data["items"], list)

    def test_пагинация_skip_и_limit(self, auth_client, db, regular_user):
        for i in range(5):
            create_project(db, regular_user.id, f"Project {i}")
        resp = auth_client.get("/api/projects/?skip=0&limit=2")
        assert resp.status_code == 200
        assert len(resp.json()["items"]) <= 2

    def test_фильтр_по_статусу(self, auth_client, db, regular_user):
        create_project(db, regular_user.id, "New", status="Новый")
        create_project(db, regular_user.id, "Done", status="Завершён")
        resp = auth_client.get("/api/projects/?status=Новый")
        assert resp.status_code == 200
        assert all(p["status"] == "Новый" for p in resp.json()["items"])

    def test_поиск_по_названию(self, auth_client, db, regular_user):
        create_project(db, regular_user.id, "UniqueAlphaProject")
        create_project(db, regular_user.id, "BetaOtherProject")
        resp = auth_client.get("/api/projects/?search=UniqueAlpha")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert any("UniqueAlpha" in p["name"] for p in items)

    def test_сортировка_по_имени_по_возрастанию(self, auth_client, db, regular_user):
        create_project(db, regular_user.id, "Z Project")
        create_project(db, regular_user.id, "A Project")
        resp = auth_client.get("/api/projects/?sort_by=name&sort_order=asc")
        assert resp.status_code == 200
        names = [p["name"] for p in resp.json()["items"]]
        assert names == sorted(names)

    def test_невалидный_sort_order_возвращает_422(self, auth_client):
        resp = auth_client.get("/api/projects/?sort_order=WRONG")
        assert resp.status_code == 422

    def test_admin_видит_все_проекты(self, admin_client, db, regular_user, admin_user):
        create_project(db, regular_user.id, "User's project")
        create_project(db, admin_user.id, "Admin's project")
        resp = admin_client.get("/api/projects/")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 2


class TestGetProjectById:
    def test_получение_своего_проекта(self, auth_client, db, regular_user):
        p = create_project(db, regular_user.id, "My Project")
        resp = auth_client.get(f"/api/projects/{p.id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "My Project"

    def test_несуществующий_проект_возвращает_404(self, auth_client):
        resp = auth_client.get("/api/projects/99999")
        assert resp.status_code == 404


class TestDeleteProject:
    def test_удаление_своего_проекта(self, auth_client, db, regular_user):
        p = create_project(db, regular_user.id)
        resp = auth_client.delete(f"/api/projects/{p.id}")
        assert resp.status_code == 204

    def test_удаление_чужого_проекта_возвращает_403(self, auth_client, db, admin_user):
        p = create_project(db, admin_user.id, "Admin's project")
        resp = auth_client.delete(f"/api/projects/{p.id}")
        assert resp.status_code == 403



class TestFiles:
    def test_загрузка_файла_в_свой_проект(self, auth_client, db, regular_user):
        p = create_project(db, regular_user.id)
        content = b"Hello from test file"
        resp = auth_client.post(
            f"/api/projects/{p.id}/upload-file",
            files={"file": ("test.txt", io.BytesIO(content), "text/plain")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["original_name"] == "test.txt"
        assert data["file_size"] == len(content)

    def test_загрузка_в_чужой_проект_возвращает_403(self, auth_client, db, admin_user):
        p = create_project(db, admin_user.id)
        resp = auth_client.post(
            f"/api/projects/{p.id}/upload-file",
            files={"file": ("x.txt", io.BytesIO(b"data"), "text/plain")},
        )
        assert resp.status_code == 403

    def test_список_файлов_проекта(self, auth_client, db, regular_user):
        p = create_project(db, regular_user.id)
        create_file(db, p.id, "doc.txt")
        resp = auth_client.get(f"/api/projects/{p.id}/files")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_удаление_файла(self, auth_client, db, regular_user):
        p = create_project(db, regular_user.id)
        f = create_file(db, p.id)
        resp = auth_client.delete(f"/api/projects/{p.id}/files/{f.id}")
        assert resp.status_code == 204



class TestSegments:
    def test_создание_сегмента(self, auth_client, db, regular_user):
        p = create_project(db, regular_user.id)
        f = create_file(db, p.id)

        resp = auth_client.post("/api/segments/", json={
            "project_file_id": f.id,
            "segment_index": 0,
            "original_text": "Hello world",
            "translated_text": "Привет мир",
            "status": "translated",
        })
        assert resp.status_code == 200
        assert resp.json()["original_text"] == "Hello world"

    def test_получение_сегмента_по_id(self, auth_client, db, regular_user):
        p = create_project(db, regular_user.id)
        f = create_file(db, p.id)
        s = create_segment(db, f.id, "Test sentence")

        resp = auth_client.get(f"/api/segments/{s.id}")
        assert resp.status_code == 200
        assert resp.json()["original_text"] == "Test sentence"

    def test_несуществующий_сегмент_возвращает_404(self, auth_client):
        resp = auth_client.get("/api/segments/99999")
        assert resp.status_code == 404

    def test_обновление_перевода_сегмента(self, auth_client, db, regular_user):
        p = create_project(db, regular_user.id)
        f = create_file(db, p.id)
        s = create_segment(db, f.id, "Original text")

        resp = auth_client.put(f"/api/segments/{s.id}", json={
            "translated_text": "Перевод текста",
            "status": "translated",
            "add_to_termbase": False,
        })
        assert resp.status_code == 200
        assert resp.json()["translated_text"] == "Перевод текста"
        assert resp.json()["status"] == "translated"

    def test_обновление_с_добавлением_в_терминобазу(self, auth_client, db, regular_user):
        p = create_project(db, regular_user.id)
        f = create_file(db, p.id)
        s = create_segment(db, f.id, "Cat")

        resp = auth_client.put(f"/api/segments/{s.id}", json={
            "translated_text": "Кот",
            "status": "translated",
            "add_to_termbase": True,
        })
        assert resp.status_code == 200

        term = db.query(models.TermEntry).filter(
            models.TermEntry.source_text == "Cat",
            models.TermEntry.project_id == p.id,
        ).first()
        assert term is not None
        assert term.target_text == "Кот"

    def test_удаление_сегмента(self, auth_client, db, regular_user):
        p = create_project(db, regular_user.id)
        f = create_file(db, p.id)
        s = create_segment(db, f.id, "Delete me")

        resp = auth_client.delete(f"/api/segments/{s.id}")
        assert resp.status_code == 200
