from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.config import get_settings
from app.auth import router
from app.enrollments import router as enrollments_router
from app.learning import router as learning_router
from app.conversation import router as conversation_router
import secrets
settings = get_settings()
if settings.cookie_secure and len(settings.session_secret) < 32:
    raise RuntimeError("Set a SESSION_SECRET of at least 32 characters")
app = FastAPI(title="LingoNaija API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
app.add_middleware(SessionMiddleware, secret_key=settings.session_secret or secrets.token_urlsafe(48), session_cookie="lingonaija_oauth", max_age=600, same_site="lax", https_only=settings.cookie_secure)
app.include_router(router)
app.include_router(enrollments_router)
app.include_router(learning_router)
app.include_router(conversation_router)
@app.get("/api/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "lingonaija-api"}
