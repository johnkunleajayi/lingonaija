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
    assert client.post('/api/learning/igbo/everyday-greetings/complete',json={'answers':[0,2,1,0]},headers={'Origin':get_settings().frontend_url}).status_code==404

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
    assert client.post('/api/learning/hausa/everyday-greetings/complete',json={'answers':[1,0,2,1]},headers={'Origin':get_settings().frontend_url}).status_code==404
