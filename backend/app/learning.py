"""Lesson completion; a row represents completed status and its one-time award."""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.auth import current_user
from app.config import get_settings
from app.database import get_db
from app.streaks import learning_day, record_activity, streak_summary
from app.models import Enrollment, LessonCompletion, User

router = APIRouter(prefix='/api/learning', tags=['learning'])
# First-choice option indexes for the four exercises, in published order.
LESSON_IDS = ('a-warm-welcome', 'everyday-greetings', 'introduce-yourself', 'family-and-people', 'food-and-drink')
ANSWER_KEYS = {
    ('yoruba', 'a-warm-welcome'): (0, 1, 2, 1),
    ('yoruba', 'everyday-greetings'): (1, 0, 2, 1),
    ('igbo', 'a-warm-welcome'): (0, 2, 1, 0),
    ('hausa', 'a-warm-welcome'): (1, 0, 2, 1),
    ('yoruba', 'introduce-yourself'): (0, 2, 1, 0),
    ('yoruba', 'family-and-people'): (1, 0, 2, 0),
    ('yoruba', 'food-and-drink'): (2, 1, 0, 1),
    ('igbo', 'everyday-greetings'): (1, 0, 2, 1),
    ('igbo', 'introduce-yourself'): (0, 2, 1, 0),
    ('igbo', 'family-and-people'): (1, 0, 2, 1),
    ('igbo', 'food-and-drink'): (0, 1, 2, 1),
    ('hausa', 'everyday-greetings'): (1, 0, 2, 1),
    ('hausa', 'introduce-yourself'): (0, 2, 1, 0),
    ('hausa', 'family-and-people'): (1, 0, 2, 1),
    ('hausa', 'food-and-drink'): (0, 2, 1, 0),
}

class CompletionRequest(BaseModel):
    answers: Annotated[list[Annotated[int, Field(strict=True, ge=0, le=2)]], Field(min_length=4, max_length=4)]
    model_config = ConfigDict(extra='forbid')

def progress(db: Session, user_id):
    rows = list(db.scalars(select(LessonCompletion).where(LessonCompletion.user_id == user_id)))
    return {**streak_summary(db, user_id), 'total_xp': sum(row.xp for row in rows), 'completions': [
        {'language': row.language, 'lesson_id': row.lesson_id, 'status': 'completed',
         'first_choice_score': row.first_choice_score, 'completed_at': row.completed_at.isoformat(), 'xp': row.xp}
        for row in rows]}

@router.post('/{language}/{lesson_id}/complete')
def complete(language: str, lesson_id: str, payload: CompletionRequest, request: Request, response: Response,
             user: User = Depends(current_user), db: Session = Depends(get_db)):
    if request.headers.get('origin') != get_settings().frontend_url:
        raise HTTPException(403, 'Invalid request origin')
    if (language, lesson_id) not in ANSWER_KEYS:
        raise HTTPException(404, 'Unknown lesson')
    if db.get(Enrollment, (user.id, language)) is None:
        raise HTTPException(409, 'Enroll in this language before completing this lesson')
    lesson_index = LESSON_IDS.index(lesson_id)
    if lesson_index > 0 and db.get(LessonCompletion, (user.id, language, LESSON_IDS[lesson_index - 1])) is None:
        raise HTTPException(409, 'Complete the previous lesson first')
    key = (user.id, language, lesson_id)
    if db.get(LessonCompletion, key) is None:
        try:
            with db.begin_nested():
                db.add(LessonCompletion(user_id=user.id, language=language, lesson_id=lesson_id,
                    first_choice_score=sum(a == b for a, b in zip(payload.answers, ANSWER_KEYS[(language, lesson_id)])), xp=10))
                db.flush()
        except IntegrityError:
            if db.get(LessonCompletion, key) is None:
                raise
    record_activity(db, user.id, learning_day())
    db.commit()
    response.headers['Cache-Control'] = 'no-store'
    return progress(db, user.id)
