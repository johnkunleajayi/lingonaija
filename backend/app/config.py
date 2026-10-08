from functools import lru_cache
from pathlib import Path
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://lingonaija:local-dev-only@localhost:5432/lingonaija"
    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Accept Neon's native PostgreSQL URI and select the installed psycopg driver.
        # Correct extra scheme slashes without touching the private .env or credentials.
        for scheme in ("postgresql+psycopg", "postgresql", "postgres"):
            prefix = scheme + "://"
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):].lstrip("/")
        return value

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    google_client_id: str = ""
    google_client_secret: str = ""
    session_secret: str = ""
    frontend_url: str = "http://127.0.0.1:5173"
    google_redirect_uri: str = "http://127.0.0.1:5173/api/auth/google/callback"
    cookie_secure: bool = False
    session_days: int = Field(default=7, ge=1, le=30)
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[1] / ".env", extra="ignore")
@lru_cache
def get_settings() -> Settings:
    return Settings()
