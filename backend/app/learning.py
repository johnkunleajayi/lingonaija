from app.curriculum import lesson_ids
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
# First-choice option indexes for each exercise, in published order.
LESSON_IDS = lesson_ids('yoruba')
ANSWER_KEYS = {
    ('yoruba', 'build-the-sentence'): (('morning-1', 'morning-2'), ('name-1', 'name-2', 'name-3', 'name-4'), ('price-1', 'price-2', 'price-3', 'price-4'), ('travel-1', 'travel-2', 'travel-3', 'travel-4', 'travel-5', 'travel-6', 'travel-7'), ('go-1', 'go-2', 'go-3'), ('sleep-1', 'sleep-2', 'sleep-3'), ('repeat-1', 'repeat-2', 'repeat-3', 'repeat-4', 'repeat-5'), ('request-1', 'request-2', 'request-3', 'request-4', 'request-5')),
    ('yoruba', 'visual-review'): (1, 3, 0, 2, 1, 3, 0, 2),
    ('yoruba', 'time-and-daily-routine'): (1, 0, 2, 1),
    ('yoruba', 'shopping-and-the-market'): (0, 2, 1, 0),
    ('yoruba', 'making-requests'): (1, 2, 0, 1),

    ('yoruba', 'numbers-and-money'): (0, 1, 2, 0),
    ('yoruba', 'places-around-me'): (1, 0, 2, 0),
    ('yoruba', 'asking-for-directions'): (1, 2, 0, 1),
    ('yoruba', 'transport-and-travel'): (1, 0, 2, 1),
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

# Existing text exercises have three options; authored overrides support new formats.
OPTION_COUNTS = {('yoruba', 'visual-review'): (4,) * 8}

SENTENCE_TILES = {('yoruba', 'build-the-sentence'): ({'morning-2': 'káàárọ̀', 'morning-1': 'Ẹ'}, {'name-4': 'Adé', 'name-3': 'ni', 'name-1': 'Orúkọ', 'name-2': 'mi'}, {'price-3': 'ata', 'price-4': 'yìí?', 'price-2': 'ni', 'price-1': 'Eélòó'}, {'travel-7': 'ọjà?', 'travel-5': 'máa', 'travel-3': 'o', 'travel-1': 'Báwo', 'travel-6': 'dé', 'travel-4': 'ṣe', 'travel-2': 'ni'}, {'go-3': 'lọ', 'go-1': 'Mo', 'go-2': 'máa'}, {'sleep-2': 'fẹ́', 'sleep-3': 'sùn', 'sleep-1': 'Mo'}, {'repeat-4': 'un', 'repeat-5': 'sọ', 'repeat-2': 'jọ̀wọ́,', 'repeat-1': 'Ẹ', 'repeat-3': 'tún'}, {'request-5': 'àbùlà', 'request-3': 'mi', 'request-4': 'ní', 'request-1': 'Ẹ', 'request-2': 'fún'})}

class CompletionRequest(BaseModel):
    answers: list[Annotated[int, Field(strict=True, ge=0)] | list[Annotated[str, Field(strict=True)]]]
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
    keys = ANSWER_KEYS[(language, lesson_id)]
    tiles = SENTENCE_TILES.get((language, lesson_id))
    if len(payload.answers) != len(keys):
        raise HTTPException(422, 'Answers must match this lesson’s exercise count')
    if tiles:
        if any(not isinstance(answer, list) or len(answer)!=len(mapping) or len(set(answer))!=len(mapping) or set(answer)!=set(mapping) for answer,mapping in zip(payload.answers,tiles)):
            raise HTTPException(422, 'Each sentence must use all its authored tile IDs once')
        score=sum([mapping[id] for id in answer]==[mapping[id] for id in expected] for answer,expected,mapping in zip(payload.answers,keys,tiles))
    else:
        option_counts = OPTION_COUNTS.get((language, lesson_id), (3,) * len(keys))
        if any(not isinstance(answer,int) or answer >= count for answer,count in zip(payload.answers,option_counts)):
            raise HTTPException(422, 'Answers must match this lesson’s option counts')
        score=sum(a==b for a,b in zip(payload.answers,keys))
    if db.get(Enrollment, (user.id, language)) is None:
        raise HTTPException(409, 'Enroll in this language before completing this lesson')
    ordered_lessons = lesson_ids(language)
    lesson_index = ordered_lessons.index(lesson_id)
    if lesson_index > 0 and db.get(LessonCompletion, (user.id, language, ordered_lessons[lesson_index - 1])) is None:
        raise HTTPException(409, 'Complete the previous lesson first')
    key = (user.id, language, lesson_id)
    if db.get(LessonCompletion, key) is None:
        try:
            with db.begin_nested():
                db.add(LessonCompletion(user_id=user.id, language=language, lesson_id=lesson_id,
                    first_choice_score=score, xp=10))
                db.flush()
        except IntegrityError:
            if db.get(LessonCompletion, key) is None:
                raise
    record_activity(db, user.id, learning_day())
    db.commit()
    response.headers['Cache-Control'] = 'no-store'
    return progress(db, user.id)
