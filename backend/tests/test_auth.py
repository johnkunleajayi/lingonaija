import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database import Base, get_db
from app.models import User, AuthSession
from app.auth import upsert_google_user, digest, settings, oauth
from fastapi import HTTPException

@pytest.fixture
def db():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        app.dependency_overrides[get_db] = lambda: session
        yield session
    app.dependency_overrides.clear()
    engine.dispose()

def claims(subject='google-1', email='ADE@example.test'):
    return {'sub':subject, 'email':email, 'email_verified':True, 'name':'Adé'}

def test_first_and_returning_identity(db):
    first = upsert_google_user(db, claims()); db.commit()
    assert first.email == 'ade@example.test'
    assert upsert_google_user(db, claims()).id == first.id
    second = upsert_google_user(db, claims('google-2','ada@example.test')); db.commit()
    assert second.id != first.id

def test_reject_unverified_and_identity_collision(db):
    with pytest.raises(HTTPException):
        upsert_google_user(db, {**claims(), 'email_verified':False})
    db.add(User(email='ade@example.test', display_name='Other')); db.commit()
    with pytest.raises(HTTPException) as error:
        upsert_google_user(db, claims())
    assert error.value.status_code == 409

def test_session_expiry_logout_and_csrf(db):
    user = upsert_google_user(db, claims()); db.commit()
    db.add(AuthSession(token_hash=digest('opaque-token'),user_id=user.id,expires_at=datetime.now(timezone.utc)+timedelta(days=1))); db.commit()
    client=TestClient(app); client.cookies.set('lingonaija_session','opaque-token')
    response=client.get('/api/auth/me')
    assert response.json()['id'] == str(user.id)
    assert response.headers['cache-control']=='no-store'
    assert client.post('/api/auth/logout',headers={'origin':'https://attacker.example'}).status_code==403
    assert client.post('/api/auth/logout',headers={'origin':settings.frontend_url}).status_code==204
    assert db.get(AuthSession,digest('opaque-token')) is None
    assert client.get('/api/auth/me').status_code==401
    db.add(AuthSession(token_hash=digest('expired'),user_id=user.id,expires_at=datetime.now(timezone.utc)-timedelta(seconds=1)));db.commit()
    client.cookies.set('lingonaija_session','expired')
    assert client.get('/api/auth/me').status_code==401

def test_callback_rejects_missing_state(db):
    response=TestClient(app).get('/api/auth/google/callback?code=invalid&state=invalid',follow_redirects=False)
    assert response.status_code==303
    assert 'auth_error=signin' in response.headers['location']
    assert db.scalar(select(AuthSession)) is None

@pytest.mark.parametrize('active',[True,False])
def test_callback_creates_secure_session_only_for_active_user(db,monkeypatch,active):
    user=upsert_google_user(db,claims());user.is_active=active;db.commit()
    async def verified_identity(request):
        return {'userinfo':claims()}
    monkeypatch.setattr(oauth.google,'authorize_access_token',verified_identity)
    response=TestClient(app).get('/api/auth/google/callback',follow_redirects=False)
    if active:
        assert 'signed_in=1' in response.headers['location']
        cookie=response.headers['set-cookie']
        assert 'HttpOnly' in cookie and 'SameSite=lax' in cookie
        session=db.scalar(select(AuthSession));assert session is not None
        assert len(session.token_hash)==64
    else:
        assert 'auth_error=signin' in response.headers['location']
        assert db.scalar(select(AuthSession)) is None

def test_https_cookie_and_session_rotation(db, monkeypatch):
    user = upsert_google_user(db, claims()); db.commit()
    db.add(AuthSession(token_hash=digest('previous-session'), user_id=user.id,
        expires_at=datetime.now(timezone.utc)+timedelta(days=1))); db.commit()
    async def verified_identity(request):
        return {'userinfo':claims()}
    monkeypatch.setattr(oauth.google, 'authorize_access_token', verified_identity)
    monkeypatch.setattr(settings, 'cookie_secure', True)
    client = TestClient(app, base_url='https://testserver')
    client.cookies.set('lingonaija_session','previous-session')
    response = client.get('/api/auth/google/callback', follow_redirects=False)
    assert response.status_code == 303
    assert 'Secure' in response.headers['set-cookie']
    assert 'HttpOnly' in response.headers['set-cookie']
    assert db.get(AuthSession, digest('previous-session')) is None
    assert db.scalar(select(AuthSession)) is not None

@pytest.mark.parametrize('picture',[None,'', '   '])
def test_users_without_google_picture_remain_compatible(db,picture):
    user=upsert_google_user(db,{**claims(),'picture':picture});db.commit()
    assert user.avatar_url is None
    db.add(AuthSession(token_hash=digest('avatar-test'),user_id=user.id,expires_at=datetime.now(timezone.utc)+timedelta(days=1)));db.commit()
    client=TestClient(app);client.cookies.set('lingonaija_session','avatar-test')
    response=client.get('/api/auth/me')
    assert response.status_code==200
    assert response.json()['avatar_url'] is None


def test_google_picture_creation_update_and_missing_picture_preservation(db):
    user=upsert_google_user(db,{**claims(),'picture':'https://example.test/first.png'});db.commit()
    original_id=user.id
    assert user.avatar_url=='https://example.test/first.png'
    returning=upsert_google_user(db,{**claims(),'picture':'https://example.test/new.png'});db.commit()
    assert returning.id==original_id
    assert returning.avatar_url=='https://example.test/new.png'
    assert upsert_google_user(db,claims()).avatar_url=='https://example.test/new.png'
    assert len(list(db.scalars(select(User))))==1


def test_existing_user_receives_avatar_through_successful_callback(db,monkeypatch):
    user=upsert_google_user(db,claims());db.commit()
    original_id=user.id
    async def verified_identity(request):
        return {'userinfo':{**claims(),'picture':'https://example.test/google.png'}}
    monkeypatch.setattr(oauth.google,'authorize_access_token',verified_identity)
    client=TestClient(app)
    response=client.get('/api/auth/google/callback',follow_redirects=False)
    assert 'signed_in=1' in response.headers['location']
    db.refresh(user)
    assert user.id==original_id
    assert user.avatar_url=='https://example.test/google.png'
    me=client.get('/api/auth/me')
    assert me.status_code==200
    assert me.json()['avatar_url']==user.avatar_url
    assert me.json()['id']==str(original_id)

@pytest.mark.parametrize('secure',[False,True])
def test_session_cookie_samesite_creation_and_deletion(db,monkeypatch,secure):
    monkeypatch.setattr(settings,'cookie_secure',secure)
    async def verified_identity(request):
        return {'userinfo':claims()}
    monkeypatch.setattr(oauth.google,'authorize_access_token',verified_identity)
    client=TestClient(app,base_url='https://testserver' if secure else 'http://testserver')
    response=client.get('/api/auth/google/callback',follow_redirects=False)
    cookie=response.headers['set-cookie']
    expected='SameSite=none' if secure else 'SameSite=lax'
    assert expected in cookie and 'HttpOnly' in cookie
    assert ('Secure' in cookie)==secure
    assert 'Domain=' not in cookie
    assert client.get('/api/auth/me').status_code==200
    assert client.post('/api/auth/logout',headers={'origin':'https://attacker.example'}).status_code==403
    assert client.post('/api/auth/logout').status_code==403
    logout=client.post('/api/auth/logout',headers={'origin':settings.frontend_url})
    assert logout.status_code==204
    assert expected in logout.headers['set-cookie']
    assert 'HttpOnly' in logout.headers['set-cookie']
    assert ('Secure' in logout.headers['set-cookie'])==secure
    assert client.get('/api/auth/me').status_code==401


def test_production_credentialed_cors_and_origin_protection(db,monkeypatch):
    from fastapi.middleware.cors import CORSMiddleware
    origin='https://lingonaija-frontend.vercel.app'
    monkeypatch.setattr(settings,'frontend_url',origin)
    monkeypatch.setattr(settings,'cookie_secure',True)
    # Same middleware/configuration used by main.py, with production's environment value.
    production=CORSMiddleware(app,allow_origins=[origin],allow_credentials=True,allow_methods=['GET','POST'],allow_headers=['Content-Type'])
    client=TestClient(production,base_url='https://testserver')
    async def verified_identity(request):
        return {'userinfo':claims()}
    monkeypatch.setattr(oauth.google,'authorize_access_token',verified_identity)
    client.get('/api/auth/google/callback',follow_redirects=False)
    response=client.get('/api/auth/me',headers={'origin':origin})
    assert response.status_code==200
    assert response.headers['access-control-allow-origin']==origin
    assert response.headers['access-control-allow-credentials']=='true'
    preflight=client.options('/api/enrollments',headers={'origin':origin,'access-control-request-method':'POST','access-control-request-headers':'content-type'})
    assert preflight.status_code==200
    assert preflight.headers['access-control-allow-origin']==origin
    rejected=client.options('/api/enrollments',headers={'origin':'https://attacker.example','access-control-request-method':'POST'})
    assert rejected.status_code==400
    assert 'access-control-allow-origin' not in rejected.headers
    assert client.post('/api/enrollments',json={'language':'yoruba'},headers={'origin':'https://attacker.example'}).status_code==403
    assert client.post('/api/enrollments',json={'language':'yoruba'},headers={'origin':origin}).status_code==200
