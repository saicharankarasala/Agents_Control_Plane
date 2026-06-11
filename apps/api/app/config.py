"""Application configuration loaded from environment."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    # When true, the API serves a single shared "demo org" with no login —
    # ideal for a public portfolio demo. Flip to false once real Clerk auth
    # and per-org API keys are wired in.
    demo_mode: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    # Defaults to a local SQLite file so the API runs with zero infra.
    database_url: str = "sqlite+aiosqlite:///./acp.db"
    redis_url: str = "redis://localhost:6379/0"
    qdrant_url: str = "http://localhost:6333"

    anthropic_api_key: str | None = None
    judge_model: str = "claude-haiku-4-5-20251001"
    embed_model: str = "BAAI/bge-small-en-v1.5"

    clerk_secret_key: str | None = None
    clerk_jwt_issuer: str | None = None
    clerk_webhook_secret: str | None = None

    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
