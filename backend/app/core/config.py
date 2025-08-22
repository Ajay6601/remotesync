from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://remotesync:password@localhost/remotesync"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # Encryption
    ENCRYPTION_KEY: str = "your-encryption-key-32-bytes-long"
    
    # AWS (for production)
    AWS_REGION: str = "us-east-1"
    S3_BUCKET: str = "remotesync-files"
    
    # WebRTC
    TURN_SERVER_URL: str = "turn:your-turn-server.com:3478"
    TURN_USERNAME: str = "username"
    TURN_PASSWORD: str = "password"
    
    class Config:
        env_file = ".env"

settings = Settings()