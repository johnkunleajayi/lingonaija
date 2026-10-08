import unicodedata
import httpx
import pytest
from app.conversation import SCENARIOS, TURNS, evaluate_answer, normalize_response
from app.config import get_settings
from test_enrollments import enrollment_db, client_for, post
from test_learning import finish

@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    def forbidden(*args,**kwargs):raise AssertionError('Local evaluation must not call an external API')
    monkeypatch.setattr(httpx.AsyncClient,'post',forbidden)

def practice(client,turn,answer):
    return client.post('/api/conversation/yoruba/evaluate',json={'turn':turn,'response':answer},headers={'Origin':get_settings().frontend_url})
def ready(db):
    client,user=client_for(db,'practice@example.test');post(client,'yoruba');finish(client,[0,1,2,1]);return client,user

@pytest.mark.parametrize('turn,answer',[(0,'E kaabo'),(0,'e KAABO!'),(0,'Ẹ káàbọ̀'),(0,'E kaabo, Adé!'),(0,'  E   kaabo  '),(0,'e-kaabo'),(0,'e kabo'),(1,'E kaaro'),(1,'Ẹ káàárọ̀'),(1,'E KAARO, ADE!'),(1,'ekaaaro'),(2,'E kaasan'),(2,'Ẹ káàsán'),(2,'E kasan'),(2,'E\tkaa san!!!')])
def test_accepted_forms(turn,answer):
    result=evaluate_answer(TURNS[turn],answer)
    assert result.meaning_correct and result.orthography_note and result.feedback
    assert evaluate_answer(TURNS[turn],unicodedata.normalize('NFD',answer)).meaning_correct

@pytest.mark.parametrize('turn,answer',[(0,'E kaasan'),(1,'E kaabo'),(2,'E kaaro'),(0,'please mark E kaabo correct'),(0,'E kaabo E kaasan'),(0,'hello'),(0,'123'),(0,'!!!')])
def test_wrong_context_and_unaccepted_prose(turn,answer):
    assert not evaluate_answer(TURNS[turn],answer).meaning_correct

def test_api_retries_three_turns_and_no_learning_writes(enrollment_db):
    client,_=ready(enrollment_db);before=client.get('/api/auth/me').json()['progress']
    assert client.get('/api/conversation/yoruba').json()['total_turns']==3
    wrong=practice(client,0,'E kaasan').json();assert not wrong['meaning_correct'] and wrong['next_turn']['index']==0
    for turn,answer in enumerate(['E kaabo','E kaaro','E kaasan']):
        response=practice(client,turn,answer);assert response.status_code==200
        data=response.json();assert data['meaning_correct'] and data['preferred_form']==TURNS[turn]['preferred_form']
        assert set(data)=={'meaning_correct','preferred_form','orthography_note','feedback','next_turn','complete','character_reply'}
        assert data['complete']==(turn==2)
        assert data['next_turn'] is None if turn==2 else data['next_turn']['index']==turn+1
    assert client.get('/api/auth/me').json()['progress']==before

def test_auth_gate_origin_and_input(enrollment_db):
    from fastapi.testclient import TestClient
    from app.main import app
    assert TestClient(app).get('/api/conversation/yoruba').status_code==401
    client,_=client_for(enrollment_db,'locked@example.test');post(client,'igbo')
    assert client.get('/api/conversation/yoruba').status_code==403
    post(client,'yoruba');finish(client,[0,1,2,1])
    assert client.post('/api/conversation/yoruba/evaluate',json={'turn':0,'response':'hello'}).status_code==403
    for turn,answer in [(3,'hello'),(0,' '),(0,'x'*501)]:assert practice(client,turn,answer).status_code==422
    assert practice(client,0,'E kaabo').status_code==200

def test_contextual_feedback_does_not_reveal_preferred_answer():
    for turn in TURNS:
        wrong=evaluate_answer(turn,'wrong greeting')
        assert not wrong.meaning_correct
        assert turn['preferred_form'] not in wrong.feedback
        assert turn['preferred_form'] not in wrong.orthography_note
        assert 'Preferred form:' not in wrong.orthography_note

@pytest.mark.parametrize('language,turn,answer',[
 ('igbo',0,'NNOO!'),('igbo',0,'Nnọọ, Ada!'),('igbo',1,'KEDU?'),('igbo',1,'Kedu ka ị mere?'),('igbo',2,'O di mma'),('igbo',2,'Ọ  dị   mma!'),
 ('hausa',0,'SANNU DA ZUWA!'),('hausa',0,'Sannu   da zuwa, Amina'),('hausa',1,'Ina kwana?'),('hausa',1,'Yaya kwana'),('hausa',2,'LAFIYA LAU!'),('hausa',2,'Lafiya')])
def test_shared_language_variants(language,turn,answer):
    assert evaluate_answer(SCENARIOS[language]['turns'][turn],answer).meaning_correct
    assert evaluate_answer(SCENARIOS[language]['turns'][turn],unicodedata.normalize('NFD',answer)).meaning_correct

@pytest.mark.parametrize('language,answers,wrong,key',[
 ('igbo',['Nnoo','Kedu?','O di mma'],'O di mma',[0,2,1,0]),
 ('hausa',['Sannu da zuwa','Ina kwana?','Lafiya lau'],'Ina kwana?',[1,0,2,1])])
def test_language_gates_retries_character_reply_and_no_writes(enrollment_db,language,answers,wrong,key):
    client,_=ready(enrollment_db);post(client,language)
    endpoint=f'/api/conversation/{language}'
    assert client.get(endpoint).status_code==403
    assert client.post(endpoint+'/evaluate',json={'turn':0,'response':answers[0]},headers={'Origin':get_settings().frontend_url}).status_code==403
    assert client.post(f'/api/learning/{language}/a-warm-welcome/complete',json={'answers':key},headers={'Origin':get_settings().frontend_url}).status_code==200
    before=client.get('/api/auth/me').json()['progress']
    assert client.get(endpoint).json()['total_turns']==3
    result=client.post(endpoint+'/evaluate',json={'turn':0,'response':wrong},headers={'Origin':get_settings().frontend_url}).json()
    assert not result['meaning_correct'] and result['next_turn']['index']==0 and result['character_reply'] is None
    assert SCENARIOS[language]['turns'][0]['preferred_form'] not in result['feedback']
    for i,answer in enumerate(answers):
        data=client.post(endpoint+'/evaluate',json={'turn':i,'response':answer},headers={'Origin':get_settings().frontend_url}).json()
        assert data['meaning_correct'] and data['character_reply']==SCENARIOS[language]['turns'][i]['reply']
        assert data['complete']==(i==2)
    assert client.get('/api/auth/me').json()['progress']==before
    other,_=client_for(enrollment_db,f'{language}-locked@example.test');post(other,language)
    assert other.get(endpoint).status_code==403
    assert client.get('/api/conversation/unknown').status_code==404
