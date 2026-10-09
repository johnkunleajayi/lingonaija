from app.curriculum import lesson_ids
import pytest
from sqlalchemy import select, func
from app.models import LessonCompletion
from app.config import get_settings
from test_enrollments import enrollment_db, client_for, post

def finish(client, answers, **extra):
    return client.post('/api/learning/yoruba/a-warm-welcome/complete', json={'answers': answers, **extra}, headers={'Origin':get_settings().frontend_url})

def test_completion_replay_and_isolation(enrollment_db):
    db=enrollment_db
    client,user=client_for(db,'one@lesson.test'); post(client,'yoruba')
    first=finish(client,[0,0,2,1]); assert first.status_code==200
    data=first.json(); assert data['total_xp']==10
    row=data['completions'][0]; assert row['first_choice_score']==3
    assert row['status']=='completed' and row['completed_at']
    for _ in range(3): assert finish(client,[0,1,2,1]).json()==data
    assert db.scalar(select(func.count()).select_from(LessonCompletion))==1
    assert client.get('/api/auth/me').json()['progress']==data
    other,_=client_for(db,'two@lesson.test');post(other,'yoruba')
    assert other.get('/api/auth/me').json()['progress']['total_xp']==0
    assert finish(other,[1,0,0,0]).json()['completions'][0]['first_choice_score']==0
    assert client.get('/api/auth/me').json()['progress']==data

@pytest.mark.parametrize('answers',[[0],[0,1,2,1,0],[3,1,2,1],[-1,1,2,1],[True,1,2,1],['0',1,2,1]])
def test_invalid_answers(enrollment_db,answers):
    client,_=client_for(enrollment_db,'bad@lesson.test');post(client,'yoruba')
    assert finish(client,answers).status_code==422
    assert enrollment_db.scalar(select(func.count()).select_from(LessonCompletion))==0

def test_auth_origin_enrollment_and_untrusted_fields(enrollment_db):
    from fastapi.testclient import TestClient
    from app.main import app
    assert finish(TestClient(app),[0,1,2,1]).status_code==401
    client,_=client_for(enrollment_db,'auth@lesson.test')
    assert finish(client,[0,1,2,1]).status_code==409
    post(client,'yoruba')
    assert client.post('/api/learning/yoruba/a-warm-welcome/complete',json={'answers':[0,1,2,1]}).status_code==403
    assert finish(client,[0,1,2,1],xp=100).status_code==422
    assert finish(client,[0,1,2,1],user_id='other').status_code==422

def test_lesson_two_unlock_independent_score_and_replay(enrollment_db):
    db=enrollment_db
    client,user=client_for(db,'lesson2@example.test');post(client,'yoruba')
    endpoint='/api/learning/yoruba/everyday-greetings/complete'
    def second(answers):
        return client.post(endpoint,json={'answers':answers},headers={'Origin':get_settings().frontend_url})
    assert second([1,0,2,1]).status_code==409
    assert db.scalar(select(func.count()).select_from(LessonCompletion))==0
    assert finish(client,[0,0,2,1]).status_code==200
    result=second([1,0,0,1]);assert result.status_code==200
    data=result.json();assert data['total_xp']==20
    rows={row['lesson_id']:row for row in data['completions']}
    assert rows['a-warm-welcome']['first_choice_score']==3
    assert rows['everyday-greetings']['first_choice_score']==3
    assert rows['everyday-greetings']['completed_at']
    assert second([1,0,2,1]).json()==data
    assert finish(client,[0,1,2,1]).json()==data
    assert db.scalar(select(func.count()).select_from(LessonCompletion))==2
    assert client.get('/api/auth/me').json()['progress']==data
    other,_=client_for(db,'otherlesson2@example.test');post(other,'yoruba')
    assert other.post(endpoint,json={'answers':[1,0,2,1]},headers={'Origin':get_settings().frontend_url}).status_code==409
    assert client.post('/api/learning/yoruba/unknown/complete',json={'answers':[0,1,2,1]},headers={'Origin':get_settings().frontend_url}).status_code==404

def test_igbo_completion_language_user_isolation_and_replay(enrollment_db):
    db=enrollment_db;client,user=client_for(db,'igbo@example.test');post(client,'yoruba')
    endpoint='/api/learning/igbo/a-warm-welcome/complete'
    def igbo(answers):
        return client.post(endpoint,json={'answers':answers},headers={'Origin':get_settings().frontend_url})
    assert igbo([0,2,1,0]).status_code==409
    post(client,'igbo')
    # Igbo needs no Yoruba completion and uses a different answer key.
    result=igbo([0,2,1,1]);assert result.status_code==200
    saved=result.json()['completions'][0];assert saved['language']=='igbo' and saved['first_choice_score']==3
    assert saved['completed_at'] and saved['xp']==10
    assert finish(client,[0,1,2,1]).status_code==200
    restored=client.get('/api/auth/me').json()['progress'];assert restored['total_xp']==20
    assert {r['language'] for r in restored['completions']}=={'igbo','yoruba'}
    assert igbo([0,2,1,0]).json()==restored
    assert [r for r in restored['completions'] if r['language']=='igbo']==[saved]
    assert db.get(LessonCompletion,(user.id,'yoruba','a-warm-welcome')).first_choice_score==4
    assert db.scalar(select(func.count()).select_from(LessonCompletion))==2
    other,_=client_for(db,'otherigbo@example.test');post(other,'igbo')
    assert other.get('/api/auth/me').json()['progress']['total_xp']==0
    assert other.post(endpoint,json={'answers':[0,2,1,0]},headers={'Origin':get_settings().frontend_url}).status_code==200
    assert client.get('/api/auth/me').json()['progress']==restored
    assert client.post('/api/learning/igbo/unknown/complete',json={'answers':[0,2,1,0]},headers={'Origin':get_settings().frontend_url}).status_code==404

def test_hausa_completion_replay_and_all_language_isolation(enrollment_db):
    db=enrollment_db;client,user=client_for(db,'hausa@example.test');post(client,'yoruba')
    endpoint='/api/learning/hausa/a-warm-welcome/complete'
    def hausa(answers):
        return client.post(endpoint,json={'answers':answers},headers={'Origin':get_settings().frontend_url})
    assert hausa([1,0,2,1]).status_code==409
    post(client,'hausa')
    result=hausa([1,0,0,1]);assert result.status_code==200
    saved=result.json()['completions'][0];assert saved['language']=='hausa' and saved['first_choice_score']==3
    assert saved['completed_at'] and saved['xp']==10
    finish(client,[0,1,2,1]);post(client,'igbo')
    assert client.post('/api/learning/igbo/a-warm-welcome/complete',json={'answers':[0,2,1,0]},headers={'Origin':get_settings().frontend_url}).status_code==200
    data=client.get('/api/auth/me').json()['progress'];assert data['total_xp']==30
    assert {r['language'] for r in data['completions']}=={'hausa','igbo','yoruba'}
    assert hausa([1,0,2,1]).json()==data
    assert [r for r in data['completions'] if r['language']=='hausa']==[saved]
    assert db.scalar(select(func.count()).select_from(LessonCompletion))==3
    other,_=client_for(db,'otherhausa@example.test');post(other,'hausa')
    assert other.get('/api/auth/me').json()['progress']['total_xp']==0
    assert other.post(endpoint,json={'answers':[1,0,2,1]},headers={'Origin':get_settings().frontend_url}).status_code==200
    assert client.get('/api/auth/me').json()['progress']==data
    assert client.post('/api/learning/hausa/unknown/complete',json={'answers':[1,0,2,1]},headers={'Origin':get_settings().frontend_url}).status_code==404

@pytest.mark.parametrize('language',['yoruba','igbo','hausa'])
def test_five_lesson_sequence_and_immutable_first_completion(enrollment_db,language):
    from app.learning import LESSON_IDS, ANSWER_KEYS
    client,user=client_for(enrollment_db,language+'sequence@example.test');post(client,language)
    headers={'Origin':get_settings().frontend_url}
    def complete(lesson,answers):
        return client.post(f'/api/learning/{language}/{lesson}/complete',json={'answers':list(answers)},headers=headers)
    for index,lesson in enumerate(lesson_ids(language)):
        for later in lesson_ids(language)[index+1:]:
            assert complete(later,ANSWER_KEYS[(language,later)]).status_code==409
        key=ANSWER_KEYS[(language,lesson)]
        imperfect=(tuple(reversed(key[0])),*key[1:]) if isinstance(key[0],tuple) else ((key[0]+1)%3,*key[1:])
        result=complete(lesson,imperfect);assert result.status_code==200
        data=result.json();assert data['total_xp']==(index+1)*10
        row=next(row for row in data['completions'] if row['lesson_id']==lesson)
        assert row['first_choice_score']==len(key)-1 and row['xp']==10 and row['completed_at']
        assert complete(lesson,key).json()==data
    assert enrollment_db.scalar(select(func.count()).select_from(LessonCompletion))==len(lesson_ids(language))
    assert client.get('/api/auth/me').json()['progress']['total_xp']==len(lesson_ids(language))*10


def test_expanded_curriculum_keeps_languages_and_users_independent(enrollment_db):
    from app.learning import LESSON_IDS, ANSWER_KEYS
    client,_=client_for(enrollment_db,'allcourses@example.test')
    headers={'Origin':get_settings().frontend_url}
    for language in ('yoruba','igbo','hausa'):
        post(client,language)
        # Previous-language completions never unlock this language's last lesson.
        assert client.post(f'/api/learning/{language}/food-and-drink/complete',json={'answers':list(ANSWER_KEYS[(language,'food-and-drink')])},headers=headers).status_code==409
        for lesson in lesson_ids(language):
            assert client.post(f'/api/learning/{language}/{lesson}/complete',json={'answers':list(ANSWER_KEYS[(language,lesson)])},headers=headers).status_code==200
    data=client.get('/api/auth/me').json()['progress']
    assert data['total_xp']==240 and len(data['completions'])==24
    for language in ('yoruba','igbo','hausa'):
        assert sum(row['xp'] for row in data['completions'] if row['language']==language)==len(lesson_ids(language))*10
    other,_=client_for(enrollment_db,'newlearner@example.test');post(other,'igbo')
    assert other.get('/api/auth/me').json()['progress']['total_xp']==0
    assert other.post('/api/learning/igbo/everyday-greetings/complete',json={'answers':[1,0,2,1]},headers=headers).status_code==409
    assert client.get('/api/auth/me').json()['progress']==data


def test_new_published_content_matches_server_scoring_keys():
    import json
    from pathlib import Path
    from app.learning import LESSON_IDS, ANSWER_KEYS, OPTION_COUNTS
    assert len(ANSWER_KEYS)==24
    content_dir=Path(__file__).resolve().parents[2]/'frontend'/'src'/'content'
    for language in ('yoruba','igbo','hausa'):
        for lesson in json.loads((content_dir/(language+'.json')).read_text(encoding='utf-8')):
            assert len(lesson['exercises'])==len(ANSWER_KEYS[(language,lesson['id'])]) and lesson['sourceIds']
            if lesson['exercises'][0].get('type')=='sentence_order':
                assert tuple(tuple(e['correctOrder']) for e in lesson['exercises'])==ANSWER_KEYS[(language,lesson['id'])]
                for exercise in lesson['exercises']:
                    assert len(set(t['id'] for t in exercise['tiles']))==len(exercise['tiles'])
                    assert set(exercise['correctOrder'])=={t['id'] for t in exercise['tiles']}
                    assert [t['id'] for t in exercise['tiles']]!=exercise['correctOrder']
            else:
                assert tuple(exercise['options'].index(exercise['answer']) for exercise in lesson['exercises'])==ANSWER_KEYS[(language,lesson['id'])]
                assert tuple(len(exercise['options']) for exercise in lesson['exercises'])==OPTION_COUNTS.get((language,lesson['id']), (3,)*len(lesson['exercises']))


def test_daily_connections_unlocks_cross_unit_and_awards_xp_once(enrollment_db):
    from app.learning import ANSWER_KEYS
    client,_=client_for(enrollment_db,'unitfour@example.test');post(client,'yoruba')
    headers={'Origin':get_settings().frontend_url}
    def complete(lesson):
        return client.post(f'/api/learning/yoruba/{lesson}/complete',json={'answers':list(ANSWER_KEYS[('yoruba',lesson)])},headers=headers)
    ordered=lesson_ids('yoruba')
    for lesson in ordered[:8]: assert complete(lesson).status_code==200
    assert complete('time-and-daily-routine').status_code==409
    assert complete('transport-and-travel').json()['total_xp']==90
    for index,lesson in enumerate(ordered[9:12],10):
        for later in ordered[index:]: assert complete(later).status_code==409
        result=complete(lesson);assert result.status_code==200
        data=result.json();assert data['total_xp']==index*10
        assert complete(lesson).json()==data
        row=next(row for row in data['completions'] if row['lesson_id']==lesson)
        assert row['first_choice_score']==4 and row['xp']==10
    assert len(data['completions'])==12

def test_visual_review_unlock_score_replay_and_validation(enrollment_db):
    from app.learning import ANSWER_KEYS
    client,_=client_for(enrollment_db,'review@example.test');post(client,'yoruba')
    headers={'Origin':get_settings().frontend_url}
    def complete(lesson,answers):
        return client.post(f'/api/learning/yoruba/{lesson}/complete',json={'answers':list(answers)},headers=headers)
    review=ANSWER_KEYS[('yoruba','visual-review')]
    assert review==(1,3,0,2,1,3,0,2)
    assert complete('visual-review',review).status_code==409
    for lesson in lesson_ids('yoruba')[:12]:assert complete(lesson,ANSWER_KEYS[('yoruba',lesson)]).status_code==200
    for invalid in ([1,3,0,2],[1,3,0,2,1,3,0,4],review+(0,),[True]*8):
        assert complete('visual-review',invalid).status_code==422
    first=complete('visual-review',review);assert first.status_code==200
    data=first.json();assert data['total_xp']==130
    row=next(row for row in data['completions'] if row['lesson_id']=='visual-review')
    assert row['first_choice_score']==8 and row['xp']==10 and row['completed_at']
    assert complete('visual-review',[0]*8).json()==data
    assert enrollment_db.scalar(select(func.count()).select_from(LessonCompletion))==13
    assert not any(row['language']!='yoruba' for row in data['completions'])

def test_sentence_order_unlock_save_immutable_score_and_xp(enrollment_db):
    from app.learning import ANSWER_KEYS
    client,_=client_for(enrollment_db,'sentences@example.test');post(client,'yoruba')
    headers={'Origin':get_settings().frontend_url}
    def complete(lesson,answers):return client.post(f'/api/learning/yoruba/{lesson}/complete',json={'answers':answers},headers=headers)
    key=ANSWER_KEYS[('yoruba','build-the-sentence')]
    assert complete('build-the-sentence',key).status_code==409
    for lesson in lesson_ids('yoruba')[:-1]:assert complete(lesson,ANSWER_KEYS[('yoruba',lesson)]).status_code==200
    for invalid in ([0]*8,[list(k) for k in key[:-1]],[[k[0]]*len(k) for k in key], [['invented']*len(k) for k in key]):
        assert complete('build-the-sentence',invalid).status_code==422
    first=[list(reversed(key[0])),*[list(k) for k in key[1:]]]
    result=complete('build-the-sentence',first);assert result.status_code==200
    data=result.json();assert data['total_xp']==140
    row=next(r for r in data['completions'] if r['lesson_id']=='build-the-sentence')
    assert row['first_choice_score']==7 and row['xp']==10 and row['completed_at']
    assert complete('build-the-sentence',key).json()==data
    assert len(data['completions'])==14


def test_sentence_tiles_accept_identical_words_with_distinct_ids(enrollment_db,monkeypatch):
    from app.learning import ANSWER_KEYS,SENTENCE_TILES
    lesson='a-warm-welcome';lookup=('yoruba',lesson)
    monkeypatch.setitem(ANSWER_KEYS,lookup,(('a','b'),))
    monkeypatch.setitem(SENTENCE_TILES,lookup,({'a':'same','b':'same'},))
    client,_=client_for(enrollment_db,'duplicate@example.test');post(client,'yoruba')
    response=client.post(f'/api/learning/yoruba/{lesson}/complete',json={'answers':[['b','a']]},headers={'Origin':get_settings().frontend_url})
    assert response.status_code==200 and response.json()['completions'][0]['first_choice_score']==1
