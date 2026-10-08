from pathlib import Path
import pytest
from sqlalchemy.engine import make_url
from app.config import Settings

@pytest.mark.parametrize('prefix', [
    'postgresql://', 'postgres://', 'postgresql+psycopg://',
    'postgresql+psycopg:///', 'postgresql+psycopg:////',
])
def test_postgres_uri_prefix_preserves_credentials_and_target(prefix):
    uri = prefix + 'sample:encoded%2Fpassword@sample-pooler.example.test/course?sslmode=require&channel_binding=require'
    settings = Settings(_env_file=None, database_url=uri)
    parsed = make_url(settings.database_url)
    assert parsed.drivername == 'postgresql+psycopg'
    assert parsed.host == 'sample-pooler.example.test'
    assert parsed.username == 'sample'
    assert parsed.password == 'encoded/password'
    assert parsed.database == 'course'
    assert parsed.query == {'sslmode': 'require', 'channel_binding': 'require'}

def test_env_file_is_anchored_to_backend_directory():
    assert Path(Settings.model_config['env_file']) == Path(__file__).resolve().parents[1] / '.env'
