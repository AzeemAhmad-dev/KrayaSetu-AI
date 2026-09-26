import os
import shutil
import pytest

@pytest.fixture(scope="session", autouse=True)
def preserve_canonical_test_database():
    """Backup krayasetu.db before test session and restore after all tests finish."""
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "krayasetu.db"))
    bak_path = db_path + ".session_bak"
    if os.path.exists(db_path):
        shutil.copy2(db_path, bak_path)
    yield
    if os.path.exists(bak_path):
        shutil.copy2(bak_path, db_path)
        try:
            os.remove(bak_path)
        except Exception:
            pass
