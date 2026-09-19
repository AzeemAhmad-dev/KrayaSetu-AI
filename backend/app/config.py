import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "KrayaSetu AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = "sqlite:///./krayasetu.db"
    RANDOM_SEED: int = 42
    DEFAULT_DIVISION: str = "Bhopal Division"
    ZONE: str = "West Central Railway (WCR)"

settings = Settings()
