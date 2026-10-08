"""Ephemeral, fixed three-turn beginner practice. No learning writes or rewards."""
import unicodedata
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from app.auth import current_user
from app.config import get_settings
from app.database import get_db
from app.models import LessonCompletion, User

router = APIRouter(prefix='/api/conversation/{language}', tags=['conversation'])
TURNS = [
    {'index': 0, 'ade': 'I have arrived at your home for a weekend visit. How would you welcome me?', 'preferred_form': 'Ẹ káàbọ̀', 'intent': 'welcome a visitor on arrival'},
    {'index': 1, 'ade': 'It is the next morning. We meet at breakfast. How would you greet me?', 'preferred_form': 'Ẹ káàárọ̀', 'intent': 'give a morning greeting'},
    {'index': 2, 'ade': 'Later that afternoon, we meet again in the kitchen. What greeting fits now?', 'preferred_form': 'Ẹ káàsán', 'intent': 'give an afternoon greeting'},
]
class Answer(BaseModel):
    turn: int = Field(strict=True, ge=0, le=2)
    response: str = Field(min_length=1, max_length=500)
    model_config = ConfigDict(extra='forbid')
class Evaluation(BaseModel):
    meaning_correct: bool
    orthography_note: str = Field(max_length=250)
    feedback: str = Field(max_length=350)
    model_config = ConfigDict(extra='forbid')

# Explicit beginner spellings; no fuzzy/sub-string matching across contexts.
ACCEPTED_RESPONSES = (
    ('e kaabo', 'e kabo', 'kaabo', 'kabo'),
    ('e kaaaro', 'e kaaro', 'e karo', 'kaaaro', 'kaaro', 'karo'),
    ('e kaasan', 'e kasan', 'kaasan', 'kasan'),
)

def normalize_response(answer: str) -> str:
    decomposed = unicodedata.normalize('NFKD', answer.casefold())
    # Marks are optional for typing. Ignore whitespace and Unicode punctuation.
    return ''.join(char for char in decomposed
        if not unicodedata.combining(char) and not char.isspace()
        and not unicodedata.category(char).startswith('P'))

YORUBA_HINTS = (
    'Think about receiving a visitor who has just arrived, rather than the time of day.',
    'We are meeting at breakfast after waking up. Choose a greeting for this time of day.',
    'Breakfast is over and it is afternoon now. Think about the greeting that fits this part of the day.',
)
YORUBA_REPLIES = (
    'Thank you for welcoming me! It is lovely to spend the weekend with you.',
    'Good morning to you too! I am glad we can share breakfast.',
    'Good afternoon to you too! It has been lovely chatting with you.',
)
for turn in TURNS:
    i = turn['index']
    turn.update(accepted=ACCEPTED_RESPONSES[i], hint=YORUBA_HINTS[i], reply=YORUBA_REPLIES[i], person='Adé')

SCENARIOS = {
    'yoruba': {'name': 'Yorùbá', 'title': 'A weekend visit', 'turns': TURNS},
    'igbo': {'name': 'Igbo', 'title': 'A visit with Ada', 'turns': [
        {'index': 0, 'ade': 'I have arrived at your home for a visit. How would you welcome me?', 'preferred_form': 'Nnọọ', 'accepted': ('nnoo', 'nno'), 'hint': 'Think about receiving someone who has just arrived, rather than asking how they are.', 'reply': 'Thank you for the warm welcome! It is lovely to visit you.', 'person': 'Ada'},
        {'index': 1, 'ade': 'We sit down together. How would you ask how I am doing?', 'preferred_form': 'Kedu?', 'accepted': ('kedu', 'kedu ka i mere'), 'hint': 'You want to check how your visitor is doing. Try the question from your greeting lesson.', 'reply': 'Ọ dị mma — I am doing well! How are you?', 'person': 'Ada'},
        {'index': 2, 'ade': 'Now I have asked “Kedu?” You are doing fine. How would you reply?', 'preferred_form': 'Ọ dị mma', 'accepted': ('o di mma',), 'hint': 'This time, reply positively about how you are, rather than repeat the question.', 'reply': 'I am glad you are doing well too! It is good to catch up.', 'person': 'Ada'},
    ]},
    'hausa': {'name': 'Hausa', 'title': 'A morning visit with Amina', 'turns': [
        {'index': 0, 'ade': 'I have arrived at your home for a morning visit. How would you welcome me?', 'preferred_form': 'Sannu da zuwa', 'accepted': ('sannu da zuwa',), 'hint': 'Think about welcoming someone on arrival, rather than answering a question about your health.', 'reply': 'Thank you for welcoming me! It is lovely to visit.', 'person': 'Amina'},
        {'index': 1, 'ade': 'Before we sit down, how would you greet me by asking how I slept?', 'preferred_form': 'Ina kwana?', 'accepted': ('ina kwana', 'yaya kwana'), 'hint': 'It is morning. Use the greeting that asks about the night, rather than a simple hello.', 'reply': 'Lafiya lau — very well! Ina kwana?', 'person': 'Amina'},
        {'index': 2, 'ade': 'I have asked “Ina kwana?” You are doing well. What positive reply fits?', 'preferred_form': 'Lafiya lau', 'accepted': ('lafiya lau', 'lafiya'), 'hint': 'Answer positively about how you are doing; do not ask the morning question again.', 'reply': 'I am glad you are well too! Let us sit and chat.', 'person': 'Amina'},
    ]},
}

def unlocked(language: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if language not in SCENARIOS:
        raise HTTPException(404, 'Unknown practice language')
    if db.get(LessonCompletion, (user.id, language, 'a-warm-welcome')) is None:
        raise HTTPException(403, f"Complete {SCENARIOS[language]['name']} A Warm Welcome first")
    return user

def evaluate_answer(turn: dict, answer: str) -> Evaluation:
    key = normalize_response(answer)
    # A direct address to our companion is optional; no arbitrary trailing prose.
    candidates = {key, key[:-len(normalize_response(turn['person']))] if key.endswith(normalize_response(turn['person'])) else key}
    correct = bool(candidates & {normalize_response(value) for value in turn['accepted']})
    return Evaluation(
        meaning_correct=correct,
        orthography_note=("Notice the marks in the preferred form; you can type without them here."
            if turn['person'] != 'Amina' else "Notice the spelling and word spacing in the preferred form; capitalization and punctuation are optional here."),
        feedback='That greeting fits this situation. Well done!' if correct
            else turn['hint'],
    )

@router.get('')
def start(language: str, response: Response, user: User = Depends(unlocked)):
    response.headers['Cache-Control'] = 'no-store'
    return {'turn': SCENARIOS[language]['turns'][0], 'total_turns': 3, 'scenario_title': SCENARIOS[language]['title']}

@router.post('/evaluate')
def evaluate(language: str, payload: Answer, request: Request, response: Response, user: User = Depends(unlocked)):
    if request.headers.get('origin') != get_settings().frontend_url:
        raise HTTPException(403, 'Invalid request origin')
    if not payload.response.strip():
        raise HTTPException(422, 'Type a greeting first')
    turns = SCENARIOS[language]['turns']
    result = evaluate_answer(turns[payload.turn], payload.response)
    done = result.meaning_correct and payload.turn == 2
    next_turn = None if done else turns[payload.turn + 1 if result.meaning_correct else payload.turn]
    response.headers['Cache-Control'] = 'no-store'
    return {**result.model_dump(), 'preferred_form': turns[payload.turn]['preferred_form'],
            'next_turn': next_turn, 'complete': done,
            'character_reply': turns[payload.turn]['reply'] if result.meaning_correct else None}
