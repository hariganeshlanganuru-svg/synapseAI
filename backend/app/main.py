import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings

from app.api.v1.auth import router as auth_router
from app.api.v1.documents import router as documents_router
from app.api.v1.chat import router as chat_router
from app.api.v1.workflows import router as workflows_router
from app.api.v1.email import router as email_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.admin import router as admin_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url="/api/v1/openapi.json"
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers under /api/v1 prefix
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(workflows_router, prefix=settings.API_V1_STR)
app.include_router(email_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

# Serve the web application directly at http://127.0.0.1:8000/
app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "app"))
if os.path.exists(app_dir):
    app.mount("/static", StaticFiles(directory=app_dir), name="static")

@app.get("/", response_class=FileResponse)
async def serve_website():
    index_path = os.path.join(app_dir, "index.html")
    if os.path.exists(index_path):
        headers = {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
        return FileResponse(index_path, headers=headers)
    return {"message": "Welcome to SynapseAI Enterprise API", "docs_url": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy", "mode": "standalone_fallback" if settings.ENABLE_LOCAL_FALLBACK else "production"}
