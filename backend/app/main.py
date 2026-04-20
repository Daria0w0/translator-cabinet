import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.database as database
import app.models as models

from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.files import router as files_router
from app.api.translation import router as translation_router
from app.api.segments import router as segments_router
from app.api.admin import router as admin_router
from app.api.deepl import router as deepl_router
from app.api.terms import router as terms_router        
from app.api.seo import router as seo_router           

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="Translator Cabinet API",
    description="Backend for the Translator Cabinet web application",
    version="1.0.0",
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs("temp_uploads", exist_ok=True)
os.makedirs("temp_downloads", exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Auth & core ────────────────────────────────────────────────────────────
app.include_router(auth_router,        prefix="/api/auth",        tags=["Аутентификация"])
app.include_router(projects_router,    prefix="/api/projects",    tags=["Проекты"])
app.include_router(files_router,       prefix="/api/projects",    tags=["Файлы"])
app.include_router(translation_router, prefix="/api/translation", tags=["Перевод (NLLB)"])
app.include_router(segments_router,    prefix="/api/segments",    tags=["Сегменты"])
app.include_router(admin_router,       prefix="/api/admin",       tags=["Администрирование"])

# ── New integrations ───────────────────────────────────────────────────────
app.include_router(deepl_router,       prefix="/api/deepl",       tags=["Перевод (DeepL)"])
app.include_router(terms_router,       prefix="/api/projects",    tags=["Терминология"])

# ── SEO — serve at root so crawlers find them at canonical paths ───────────
app.include_router(seo_router, tags=["SEO"])


@app.get("/health")
def health_check():
    return {"status": "healthy"}