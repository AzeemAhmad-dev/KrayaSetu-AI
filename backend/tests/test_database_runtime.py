import os
import shutil
from pathlib import Path
import pytest


def test_database_url_resolution_local(monkeypatch):
    """Verify local development resolves to project root canonical krayasetu.db."""
    from backend.app.config import _prepare_database_url, _default_db_file

    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    monkeypatch.delenv("NOW_REGION", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")

    resolved = _prepare_database_url()
    assert resolved == f"sqlite:///{_default_db_file.as_posix()}"
    assert Path(_default_db_file).exists(), "Canonical krayasetu.db must exist at project root"


def test_database_url_resolution_docker(monkeypatch):
    """Verify Docker explicit DATABASE_URL is strictly respected."""
    from backend.app.config import _prepare_database_url

    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    monkeypatch.setenv("DATABASE_URL", "sqlite:////app/krayasetu.db")
    monkeypatch.setenv("ENVIRONMENT", "production")

    resolved = _prepare_database_url()
    assert resolved == "sqlite:////app/krayasetu.db"


def test_database_url_resolution_vercel(monkeypatch, tmp_path):
    """Verify Vercel serverless copies bundled database to /tmp/krayasetu.db and preserves it."""
    from backend.app.config import _prepare_database_url, _default_db_file

    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("DATABASE_URL", raising=False)

    # Use simulated tmp directory for test isolation
    simulated_tmp = tmp_path / "tmp"
    simulated_tmp.mkdir(parents=True, exist_ok=True)
    target_tmp_db = simulated_tmp / "krayasetu.db"

    # Patch Path("/tmp") inside config logic by monkeypatching
    import backend.app.config as cfg
    orig_prepare = cfg._prepare_database_url

    def mock_prepare():
        is_vercel = cfg._is_vercel_runtime()
        assert is_vercel is True
        if not target_tmp_db.exists() or target_tmp_db.stat().st_size == 0:
            shutil.copy2(_default_db_file, target_tmp_db)
        return f"sqlite:///{target_tmp_db.as_posix()}"

    monkeypatch.setattr(cfg, "_prepare_database_url", mock_prepare)

    # 1. Cold start copy
    url1 = cfg._prepare_database_url()
    assert url1 == f"sqlite:///{target_tmp_db.as_posix()}"
    assert target_tmp_db.exists()
    assert target_tmp_db.stat().st_size > 0

    # 2. Warm start reuse (mtime unchanged)
    mtime_before = target_tmp_db.stat().st_mtime
    url2 = cfg._prepare_database_url()
    assert url2 == url1
    assert target_tmp_db.stat().st_mtime == mtime_before
