import os
from typing import Optional
from pydantic import BaseModel

# Automatically load environment variables from .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
    _backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env")
    if os.path.exists(_backend_env):
        load_dotenv(_backend_env)
except ImportError:
    pass

class Settings(BaseModel):
    PROJECT_NAME: str = "KrayaSetu AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./krayasetu.db")
    RANDOM_SEED: int = int(os.getenv("RANDOM_SEED", 42))
    DEFAULT_DIVISION: str = os.getenv("DEFAULT_DIVISION", "Bhopal Division")
    ZONE: str = os.getenv("ZONE", "West Central Railway (WCR)")

    # Live Train Telemetry (RailRadar API)
    RAILRADAR_API_BASE_URL: str = os.getenv("RAILRADAR_API_BASE_URL", "https://api.railradar.in/v1")
    RAILRADAR_API_KEY: Optional[str] = os.getenv("RAILRADAR_API_KEY", None)
    RAILRADAR_TIMEOUT_SECONDS: float = float(os.getenv("RAILRADAR_TIMEOUT_SECONDS", "3.0"))

settings = Settings()
