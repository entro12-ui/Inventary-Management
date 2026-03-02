from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "your-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    SQL_ECHO: bool = False
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    DEFAULT_CURRENCY: str = "ETB"
    DEFAULT_LOW_STOCK_THRESHOLD: int = 5

    ENABLE_AI_PREDICTIONS: bool = True
    PREDICTION_DAYS: int = 30
    MODEL_CACHE_DIR: str = "./models/cache"

    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore")


settings = Settings()
