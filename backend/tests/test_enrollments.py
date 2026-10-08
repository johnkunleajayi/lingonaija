import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.main import app
from app.auth import digest
from app.config import get_settings
from app.database import Base, get_db
from app.models import User, AuthSession, Enrollment

@pytest.fixture
def enrollment_db():
    engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        app.dependency_overrides[get_db]=lambda:db
        yield db
    app.dependency_overrides.clear()
    engine.dispose()

def client_for(db,email):
    user=User(email=email,display_name='Learner')
    db.add(user);db.flush()
    db.add(AuthSession(token_hash=digest(email),user_id=user.id,expires_at=datetime.now(timezone.utc)+timedelta(days=1)))
    db.commit()
    client=TestClient(app)
    client.cookies.set('lingonaija_session',email)
    return client,user

def post(client,language,**extra):
    return client.post('/api/enrollments',json={'language':language,**extra},headers={'Origin':get_settings().frontend_url})

def test_create_reuse_and_restore(enrollment_db):
    db=enrollment_db
    client,user=client_for(db,'first@example.test')
    for language in ['yoruba','igbo','hausa','igbo','igbo']:
        assert post(client,language).json()=={'language':language}
    assert db.scalar(select(func.count()).select_from(Enrollment))==3
    assert client.get('/api/auth/me').json()['enrollments']==['hausa','igbo','yoruba']
    assert client.get('/api/auth/me').json()['preferred_language']=='igbo'
    db.expire_all()
    assert db.get(User,user.id).preferred_language=='igbo'
    assert client.get('/api/auth/me').headers['cache-control']=='no-store'

def test_users_are_isolated(enrollment_db):
    db=enrollment_db
    first,u1=client_for(db,'one@example.test');second,u2=client_for(db,'two@example.test')
    assert post(first,'igbo').status_code==200
    assert second.get('/api/auth/me').json()['enrollments']==[]
    assert post(second,'igbo').status_code==200
    assert db.get(Enrollment,(u1.id,'igbo')) is not None
    assert db.get(Enrollment,(u2.id,'igbo')) is not None
    assert db.scalar(select(func.count()).select_from(Enrollment))==2

@pytest.mark.parametrize('language',['english','Yorùbá','',None])
def test_invalid_languages_rejected(enrollment_db,language):
    client,_=client_for(enrollment_db,'test@example.test')
    assert post(client,language).status_code==422
    assert enrollment_db.scalar(select(func.count()).select_from(Enrollment))==0

def test_auth_csrf_and_no_user_id_override(enrollment_db):
    db=enrollment_db
    assert post(TestClient(app),'yoruba').status_code==401
    client,user=client_for(db,'test@example.test')
    assert client.post('/api/enrollments',json={'language':'yoruba'}).status_code==403
    assert client.post('/api/enrollments',json={'language':'yoruba'},headers={'Origin':'https://attacker.example'}).status_code==403
    assert post(client,'yoruba',user_id=str(user.id)).status_code==422
    user.is_active=False;db.commit()
    assert post(client,'yoruba').status_code==401
    assert db.scalar(select(func.count()).select_from(Enrollment))==0

def test_database_prevents_duplicate_and_invalid_enrollment(enrollment_db):
    db=enrollment_db
    client,user=client_for(db,'test@example.test');post(client,'yoruba')
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.add(Enrollment(user_id=user.id,language='yoruba'));db.flush()
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.add(Enrollment(user_id=user.id,language='english'));db.flush()
