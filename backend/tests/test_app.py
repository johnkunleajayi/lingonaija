from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import pytest
from app.main import app
from app.database import Base
from app.models import User

def test_health():
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "lingonaija-api"}

def test_independent_users_and_unique_identity():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        first = User(email="ade@example.test", display_name="Ade", preferred_language="yoruba")
        second = User(email="ada@example.test", display_name="Ada", preferred_language="igbo")
        session.add_all([first, second])
        session.commit()
        assert first.id != second.id
        assert first.preferred_language != second.preferred_language
        assert first.google_subject is None
        session.add(User(email="ade@example.test", display_name="Duplicate"))
        with pytest.raises(IntegrityError):
            session.commit()

def test_language_constraint():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(User(email="test@example.test", display_name="Test", preferred_language="invalid"))
        with pytest.raises(IntegrityError):
            session.commit()
