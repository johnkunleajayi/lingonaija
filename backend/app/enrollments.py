"""Authenticated, idempotent enrollment; no learning progress or rewards."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.auth import current_user
from app.config import get_settings
from app.database import get_db
from app.models import Enrollment, User

router = APIRouter(prefix="/api/enrollments", tags=["enrollments"])

class EnrollmentRequest(BaseModel):
    language: Literal["yoruba", "igbo", "hausa"]
    model_config = ConfigDict(extra="forbid")

@router.post("")
def enroll(payload: EnrollmentRequest, request: Request, response: Response,
           user: User = Depends(current_user), db: Session = Depends(get_db)):
    if request.headers.get("origin") != get_settings().frontend_url:
        raise HTTPException(403, "Invalid request origin")
    key = (user.id, payload.language)
    if db.get(Enrollment, key) is None:
        try:
            # The composite primary key handles concurrent requests too.
            with db.begin_nested():
                db.add(Enrollment(user_id=user.id, language=payload.language))
                db.flush()
        except IntegrityError:
            if db.get(Enrollment, key) is None:
                raise
    user.preferred_language = payload.language
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return {"language": payload.language}
