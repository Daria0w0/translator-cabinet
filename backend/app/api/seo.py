"""
SEO endpoints: sitemap.xml, robots.txt, JSON-LD structured data.
"""

from fastapi import APIRouter
from fastapi.responses import Response, JSONResponse
import os

router = APIRouter()

SITE_URL = os.getenv("SITE_URL", "http://localhost:5173")


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap():
    """
    Generate sitemap.xml for public indexable pages.
    Private/authenticated-only pages are excluded.
    """
    public_routes = [
        {"loc": "/", "priority": "1.0", "changefreq": "weekly"},
        {"loc": "/login", "priority": "0.8", "changefreq": "monthly"},
    ]

    urls_xml = ""
    for route in public_routes:
        urls_xml += f"""
  <url>
    <loc>{SITE_URL}{route['loc']}</loc>
    <changefreq>{route['changefreq']}</changefreq>
    <priority>{route['priority']}</priority>
  </url>"""

    content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{urls_xml}
</urlset>"""

    return Response(content=content, media_type="application/xml")


@router.get("/robots.txt", include_in_schema=False)
def robots():
    """
    robots.txt — allows indexing of public pages, disallows private areas.
    """
    content = f"""User-agent: *
Allow: /
Allow: /login

# Private authenticated areas — do not index
Disallow: /user/
Disallow: /user/projects
Disallow: /admin/
Disallow: /projects/
Disallow: /api/

Sitemap: {SITE_URL}/sitemap.xml
"""
    return Response(content=content, media_type="text/plain")


@router.get("/api/seo/structured-data", include_in_schema=False)
def structured_data():
    """
    JSON-LD structured data for the SoftwareApplication type.
    Used by the frontend to inject <script type="application/ld+json"> on Home page.
    """
    data = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Translator Cabinet",
        "description": (
            "Веб-платформа для профессиональной работы с переводами. "
            "Управление проектами, сегментация текста, память переводов."
        ),
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "RUB",
        },
        "url": SITE_URL,
        "inLanguage": ["ru", "en"],
        "featureList": [
            "Управление проектами перевода",
            "Автоматическая сегментация текста",
            "Интеграция с нейронным переводчиком (NLLB)",
            "Интеграция с DeepL API",
            "Память переводов",
        ],
    }
    return JSONResponse(content=data)