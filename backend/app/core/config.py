"""Application configuration, loaded from environment variables."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="NEXUS_", extra="ignore")

    app_name: str = "NEXUS"
    environment: str = "development"
    debug: bool = False

    # Database. SQLite by default so the app runs with zero setup;
    # docker-compose overrides this with PostgreSQL.
    database_url: str = "sqlite+aiosqlite:///./nexus.db"

    # Redis is optional: caching and rate limiting fall back to in-memory.
    redis_url: str | None = None

    # Auth
    secret_key: str = "change-me-in-production"
    access_token_minutes: int = 15
    refresh_token_days: int = 14

    # Search
    provider_timeout_seconds: float = 6.0
    max_results_per_provider: int = 8
    cache_ttl_seconds: int = 300

    # LLM (provider-agnostic). If no key is set, NEXUS falls back to an
    # extractive answer built directly from sources.
    llm_provider: str = "anthropic"  # anthropic | openai | grok | none
    llm_model: str = "claude-sonnet-4-6"
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    grok_api_key: str | None = None

    # Rate limiting
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8080"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
