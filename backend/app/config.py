import os
import shutil
from pathlib import Path
from typing import Optional, List
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

# Determine absolute root directory for safe database path anchoring
_app_dir = Path(__file__).resolve().parent
_backend_dir = _app_dir.parent
_repo_dir = _backend_dir.parent
_default_db_file = (_repo_dir / "krayasetu.db").resolve()

def _is_vercel_runtime() -> bool:
    """Detect if running inside Vercel serverless environment."""
    return bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV") or os.getenv("NOW_REGION"))

def _prepare_database_url() -> str:
    r"""
    Resolves the canonical database connection URL across runtimes:
    1. Local Development (Windows / Linux / macOS): <project-root>/krayasetu.db
    2. Docker Container:  /app/krayasetu.db (or explicitly provided DATABASE_URL)
    3. Vercel Serverless: /tmp/krayasetu.db (copied from bundled krayasetu.db on cold start)
    """
    is_vercel = _is_vercel_runtime()
    env_url = os.getenv("DATABASE_URL")

    # Handle Vercel serverless runtime ONLY
    if is_vercel:
        # If user explicitly provided a remote database (e.g., postgresql://), respect it
        if env_url and not env_url.startswith("sqlite"):
            return env_url

        tmp_dir = Path("/tmp")
        tmp_dir.mkdir(parents=True, exist_ok=True)
        tmp_db_file = tmp_dir / "krayasetu.db"

        candidate_paths = [
            _default_db_file,
            _repo_dir / "krayasetu.db",
            _backend_dir / "krayasetu.db",
            Path.cwd() / "krayasetu.db",
            Path("/var/task/krayasetu.db"),
            Path("/var/task/backend/krayasetu.db"),
        ]

        bundled_db = None
        for candidate in candidate_paths:
            try:
                if candidate.is_file() and candidate.stat().st_size > 0:
                    bundled_db = candidate
                    break
            except Exception:
                continue

        if not tmp_db_file.exists() or tmp_db_file.stat().st_size == 0:
            if bundled_db:
                shutil.copy2(bundled_db, tmp_db_file)
            else:
                raise FileNotFoundError(
                    f"Production SQLite database 'krayasetu.db' was not found in deployment package. "
                    f"Checked paths: {[str(p) for p in candidate_paths]}. "
                    f"Ensure krayasetu.db is bundled with the Vercel deployment."
                )

        return f"sqlite:///{tmp_db_file.as_posix()}"

    # Non-Vercel runtimes (Local Windows/Linux / Docker / Standard VM)
    if env_url and env_url not in ("sqlite:///./krayasetu.db", "sqlite:///krayasetu.db"):
        if env_url.startswith("sqlite:////") or env_url.startswith("sqlite:///"):
            path_str = env_url.replace("sqlite:///", "")
            try:
                Path(path_str).parent.mkdir(parents=True, exist_ok=True)
            except Exception:
                pass
        return env_url

    # Default canonical local database anchored at project root
    try:
        _default_db_file.parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    return f"sqlite:///{_default_db_file.as_posix()}"


class Settings(BaseModel):
    PROJECT_NAME: str = "KrayaSetu AI"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    API_PREFIX: str = "/api"
    DATABASE_URL: str = _prepare_database_url()
    RANDOM_SEED: int = int(os.getenv("RANDOM_SEED", 42))
    DEFAULT_DIVISION: str = os.getenv("DEFAULT_DIVISION", "Bhopal Division")
    ZONE: str = os.getenv("ZONE", "West Central Railway (WCR)")

    # CORS configuration: default to "*" for seamless local/multi-port dev
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    # Security & Admin Authentication
    ADMIN_API_KEY: Optional[str] = os.getenv("ADMIN_API_KEY", None)

    # Live Train Telemetry (RailRadar API)
    RAILRADAR_API_BASE_URL: str = os.getenv("RAILRADAR_API_BASE_URL", "https://api.railradar.in/v1")
    RAILRADAR_API_KEY: Optional[str] = os.getenv("RAILRADAR_API_KEY", None)
    RAILRADAR_TIMEOUT_SECONDS: float = float(os.getenv("RAILRADAR_TIMEOUT_SECONDS", "3.0"))

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
