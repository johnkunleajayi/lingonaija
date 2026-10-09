"""Revocable, opaque application sessions; Google tokens never reach the SPA."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from authlib.integrations.starlette_client import OAuth
from authlib.integrations.base_client.errors import OAuthError
from joserfc.errors import JoseError
from httpx import HTTPError
from app.config import get_settings
from app.database import get_db
from app.models import User, AuthSession, Enrollment

router = APIRouter(prefix="/api/auth", tags=["authentication"])
settings = get_settings()
oauth = OAuth()
oauth.register(name="google", client_id=settings.google_client_id, client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile", "code_challenge_method": "S256"})
COOKIE = "lingonaija_session"
def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
def upsert_google_user(db: Session, claims: dict) -> User:
    if not claims.get("sub") or not claims.get("email") or claims.get("email_verified") is not True:
        raise HTTPException(401, "A verified Google email is required")
    subject = claims["sub"]
    email = claims["email"].strip().lower()
    user = db.scalar(select(User).where(User.google_subject == subject))
    if user is None:
        # Do not silently attach a Google identity to an unrelated existing account.
        if db.scalar(select(User).where(User.email == email)):
            raise HTTPException(409, "This email already belongs to another identity")
        user = User(email=email, display_name=(claims.get("name") or email.split('@')[0])[:100], google_subject=subject)
        db.add(user)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            user = db.scalar(select(User).where(User.google_subject == subject))
            if user is None:
                raise HTTPException(409, "Account identity conflict")
    if not user.is_active:
        raise HTTPException(403, "Account unavailable")
    picture = claims.get("picture")
    if isinstance(picture, str) and picture.strip():
        user.avatar_url = picture.strip()
    return user

def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE)
    session = db.get(AuthSession, digest(token)) if token else None
    if not session or session.expires_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        raise HTTPException(401, "Sign in required")
    user = db.get(User, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "Sign in required")
    return user

@router.get("/google")
async def google_login(request: Request):
    if not settings.google_client_id or not settings.google_client_secret or len(settings.session_secret) < 32:
        return RedirectResponse(settings.frontend_url + "/?auth_error=configuration", status_code=303)
    request.session.clear()
    return await oauth.google.authorize_redirect(request, settings.google_redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    try:
        # Authlib verifies state, signature, issuer, audience, expiration and nonce.
        token = await oauth.google.authorize_access_token(request)
        claims = token.get("userinfo")
        if not claims:
            raise HTTPException(401, "Google identity missing")
        user = upsert_google_user(db, claims)
        old_token = request.cookies.get(COOKIE)
        if old_token:
            db.execute(delete(AuthSession).where(AuthSession.token_hash == digest(old_token)))
        raw = secrets.token_urlsafe(32)
        db.add(AuthSession(token_hash=digest(raw), user_id=user.id, expires_at=datetime.now(timezone.utc)+timedelta(days=settings.session_days)))
        db.commit()
    except (OAuthError, JoseError, HTTPError, HTTPException, ValueError):
        db.rollback()
        request.session.clear()
        return RedirectResponse(settings.frontend_url + "/?auth_error=signin", status_code=303)
    request.session.clear()
    response = RedirectResponse(settings.frontend_url + "/?signed_in=1", status_code=303)
    response.set_cookie(COOKIE, raw, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=settings.session_days*86400, path="/")
    response.headers["Cache-Control"] = "no-store"
    return response

@router.get("/me")
def me(response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    from app.learning import progress
    response.headers["Cache-Control"] = "no-store"
    return {"id": str(user.id), "display_name": user.display_name, "avatar_url": user.avatar_url, "preferred_language": user.preferred_language,
            "progress": progress(db, user.id), "enrollments": list(db.scalars(select(Enrollment.language).where(Enrollment.user_id == user.id).order_by(Enrollment.language)))}

@router.post("/logout", status_code=204)
def logout(request: Request, db: Session = Depends(get_db)):
    if request.headers.get("origin") != settings.frontend_url:
        raise HTTPException(403, "Invalid request origin")
    token = request.cookies.get(COOKIE)
    if token:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == digest(token)))
        db.commit()
    response = Response(status_code=204)
    response.delete_cookie(COOKIE, path="/", secure=settings.cookie_secure, httponly=True, samesite="lax")
    response.headers["Cache-Control"] = "no-store"
    return response
