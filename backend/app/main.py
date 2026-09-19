import os
import sys

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
_repo_dir = os.path.dirname(_backend_dir)
if _repo_dir not in sys.path:
    sys.path.insert(0, _repo_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base
import backend.app.models
from backend.app.routers import network, trains, maintenance, blocks, scenarios, events, planning

# Ensure all database tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Smart Railway Maintenance Block Planning & Operational Decision Support for Bhopal Division (WCR)"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.schemas.contracts import ScheduleRequest
from app.solver.cp_sat_core import solve_plan
from app.planner.macro_planner import macro_bucket_plan

# Mount API Routers (both with /api prefix for frontend and root for contract tests/qa_backend)
app.include_router(network.router, prefix=settings.API_PREFIX)
app.include_router(trains.router, prefix=settings.API_PREFIX)
app.include_router(maintenance.router, prefix=settings.API_PREFIX)
app.include_router(blocks.router, prefix=settings.API_PREFIX)
app.include_router(scenarios.router, prefix=settings.API_PREFIX)
app.include_router(events.router, prefix=settings.API_PREFIX)
app.include_router(planning.router, prefix=settings.API_PREFIX)

# Root-level router fallbacks for backward-compatible test suites and qa_backend
app.include_router(blocks.router)
app.include_router(scenarios.router)
app.include_router(network.router)
app.include_router(trains.router)
app.include_router(maintenance.router)
app.include_router(events.router)
app.include_router(planning.router)

class OverrideRequest(BaseModel):
    work_id: str
    override_type: str
    parameters: Optional[Dict[str, Any]] = None

@app.post("/plan")
def plan_endpoint(payload: ScheduleRequest):
    return solve_plan(payload)

@app.post("/macro-plan")
def macro_plan_endpoint(payload: ScheduleRequest):
    return macro_bucket_plan(payload)

@app.post("/override")
def override_endpoint(payload: OverrideRequest):
    return {
        "status": "success",
        "work_id": payload.work_id,
        "override_type": payload.override_type,
        "parameters": payload.parameters or {}
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "system": settings.PROJECT_NAME,
        "division": settings.DEFAULT_DIVISION,
        "zone": settings.ZONE,
        "mode": "OPERATIONAL_DECISION_SUPPORT",
        "provenance_enforced": True
    }

