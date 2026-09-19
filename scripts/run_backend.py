import sys
import os
import uvicorn

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting KrayaSetu AI Backend on http://{host}:{port} ...")
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=False)
