from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://remotesync:password@postgres:5432/remotesync"
    REDIS_URL: str = "redis://redis:6379"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS - ALLOW ALL FOR LOCAL DEV
    ALLOWED_HOSTS: List[str] = ["*"]
    
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()