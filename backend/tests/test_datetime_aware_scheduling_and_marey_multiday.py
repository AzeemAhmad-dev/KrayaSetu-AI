"""
Test Suite for Datetime-Aware Scheduling, Multi-Day Marey Telemetry, and Block Overlays
Smart India Hackathon Problem Statement 26027
KrayaSetu AI

Verifies:
1. CP-SAT intraday date/time awareness: Never generates past slots for today.
2. compute_future_planning_horizon boundary handling (intraday future vs next-day advance).
3. Multi-day Marey telemetry endpoint (/railway/active-trains):
   - Future operational dates (e.g. tomorrow) show SCHEDULED status, empty travelled_history, full scheduledPath.
   - Live/current date shows confirmed travelled_history, live telemetry, and reference time.
4. Block proposal execution_date persistence across both /blocks/propose and /blocks/propose-from-schedule.
5. Invariant: Scheduled items returned from /blocks/optimize always include execution_date.
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.time_validation import (
    get_canonical_now,
    compute_future_planning_horizon,
    validate_or_recalculate_future_window,
    time_to_minutes,
    minutes_to_time,
)

client = TestClient(app)


def test_compute_future_planning_horizon_boundaries():
    """Verify compute_future_planning_horizon handles expired intraday windows vs future windows."""
    # Scenario 1: Canonical now is late evening (23:44) on 2026-09-25
    late_now = datetime(2026, 9, 25, 23, 44, 0)
    eff_start, eff_end, target_date = compute_future_planning_horizon(
        requested_start="08:00",
        requested_end="20:00",
        requested_date="2026-09-25",
        canonical_now=late_now,
    )
    # Must advance to tomorrow because 23:44 is past 20:00
    assert target_date == "2026-09-26"
    assert eff_start == "08:00"
    assert eff_end == "20:00"

    # Scenario 2: Canonical now is morning (09:15) on 2026-09-25, requested 08:00-20:00
    morning_now = datetime(2026, 9, 25, 9, 15, 0)
    eff_start, eff_end, target_date = compute_future_planning_horizon(
        requested_start="08:00",
        requested_end="20:00",
        requested_date="2026-09-25",
        canonical_now=morning_now,
    )
    # Fits today! Start must be >= 09:15 + 15m buffer -> 09:30
    assert target_date == "2026-09-25"
    assert time_to_minutes(eff_start) >= time_to_minutes("09:30")
    assert eff_end == "20:00"

    # Scenario 3: Explicit future date (e.g. 2026-09-28)
    future_now = datetime(2026, 9, 25, 14, 0, 0)
    eff_start, eff_end, target_date = compute_future_planning_horizon(
        requested_start="10:00",
        requested_end="16:00",
        requested_date="2026-09-28",
        canonical_now=future_now,
    )
    assert target_date == "2026-09-28"
    assert eff_start == "10:00"
    assert eff_end == "16:00"


def test_cpsat_optimize_endpoint_returns_execution_date():
    """Verify /blocks/optimize response schedule items carry execution_date."""
    resp = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "allow_bundling": True,
        "max_time_seconds": 3.0,
    })
    assert resp.status_code == 200
    data = resp.json()

    assert "target_execution_date" in data
    assert "effective_window_start" in data
    assert "effective_window_end" in data

    if data.get("schedule"):
        for item in data["schedule"]:
            assert "execution_date" in item
            assert item["execution_date"] == data["target_execution_date"]
            assert "allocated_start_time" in item
            assert "allocated_end_time" in item
            # Invariant: START < END
            assert time_to_minutes(item["allocated_start_time"]) < time_to_minutes(item["allocated_end_time"])


def test_cpsat_optimize_endpoint_with_explicit_future_date():
    """Verify passing a future execution_date preserves that date in the schedule."""
    tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    resp = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "09:00",
        "time_window_end": "18:00",
        "execution_date": tomorrow_str,
        "allow_bundling": True,
        "max_time_seconds": 3.0,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["target_execution_date"] == tomorrow_str
    if data.get("schedule"):
        for item in data["schedule"]:
            assert item["execution_date"] == tomorrow_str


def test_active_trains_multi_day_future_semantics():
    """Verify /railway/active-trains behavior on future operational dates."""
    tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    resp = client.get(f"/api/railway/active-trains?mode=LIVE&reference_date={tomorrow_str}")
    assert resp.status_code == 200
    data = resp.json()

    assert data["reference_date"] == tomorrow_str
    assert data["is_today"] is False
    assert data["total_active_trains"] == 0

    # On a future date, every train is SCHEDULED and has travelled 0 historical points
    for train in data["trains"]:
        assert train["status"] == "SCHEDULED"
        assert train["is_active"] is False
        assert len(train["historicalPositions"]) == 0
        assert len(train["scheduledPath"]) >= 2, f"Train {train['trainNumber']} must have a scheduled path"


def test_active_trains_multi_day_today_semantics():
    """Verify /railway/active-trains behavior on the current date."""
    today_str = datetime.now().strftime("%Y-%m-%d")
    resp = client.get(f"/api/railway/active-trains?mode=LIVE&reference_date={today_str}")
    assert resp.status_code == 200
    data = resp.json()

    assert data["reference_date"] == today_str
    assert data["is_today"] is True
    assert "reference_time" in data
    assert len(data["trains"]) > 0


def test_block_proposal_with_execution_date():
    """Verify /blocks/propose persists execution_date on the block record."""
    target_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
    resp = client.post("/api/blocks/propose", json={
        "corridor_id": "CORR-01",
        "track_name": "DOWN_MAIN",
        "location_km": 140.0,
        "requested_start_time": "11:00",
        "requested_end_time": "13:00",
        "duration_mins": 120,
        "execution_date": target_date,
        "protection_type": "TRAFFIC_BLOCK",
        "power_isolation_required": False,
        "proposed_by": "Test Engineer",
        "auto_submit": False,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    block = data["block"]
    assert block["execution_date"] == target_date
    assert block["scheduled_date"] == target_date


def test_propose_from_schedule_with_execution_date():
    """Verify /blocks/propose-from-schedule persists execution_date."""
    target_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    resp = client.post("/api/blocks/propose-from-schedule", json={
        "corridor_id": "CORR-01",
        "track_name": "UP_MAIN",
        "location_km": 160.0,
        "requested_start_time": "14:00",
        "requested_end_time": "16:00",
        "duration_mins": 120,
        "execution_date": target_date,
        "protection_type": "TRAFFIC_BLOCK",
        "power_isolation_required": False,
        "proposed_by": "CP-SAT Optimizer / Controller",
        "auto_submit": True,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    block = data["block"]
    assert block["execution_date"] == target_date
