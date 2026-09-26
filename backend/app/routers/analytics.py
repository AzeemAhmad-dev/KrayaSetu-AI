"""
Analytics & Baseline Comparison Router for KrayaSetu AI
Smart India Hackathon Problem Statement 26027

Exposes:
- GET /api/analytics/baseline-comparison: Compares uncoordinated independent department scheduling
  (P.Way, TRD, S&T in silos) against KrayaSetu AI CP-SAT co-located block plan.
- Reports total asset downtime hours saved, percentage reduction, windows eliminated,
  and train delay minutes saved.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from backend.app.database import get_db
from backend.app.services.baseline_simulator import baseline_simulator
from backend.app.services.dataset_identity import compute_dataset_fingerprint

router = APIRouter(prefix="/analytics", tags=["Analytics & Impact Assessment"])


@router.get("/baseline-comparison")
def get_baseline_comparison(
    corridor_id: Optional[str] = Query(None, description="Filter by corridor ID (e.g. CORR-01, CORR-02) or omit for division-wide"),
    week_start: Optional[str] = Query(None, description="Starting date for the planning week horizon (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Computes side-by-side comparison between:
    1. Independent Department Baseline: P.Way, TRD, and S&T scheduling maintenance in silos without coordination.
    2. KrayaSetu AI Co-located Plan: Synchronized multi-department candidate block possessions.

    Returns:
    - Total asset closure hours (independent vs optimized)
    - Total asset downtime saved (hours) and percentage reduction
    - Breakdown by department (PWAY, TRD, SNT)
    - Train path impact (trains delayed, total delay minutes, delays saved)
    - Granular section-by-section comparison table
    """
    try:
        res = baseline_simulator.simulate_baseline_comparison(
            db=db,
            corridor_id=corridor_id,
            week_start=week_start
        )
        res["dataset_fingerprint"] = compute_dataset_fingerprint(db)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute baseline comparison: {str(e)}")
