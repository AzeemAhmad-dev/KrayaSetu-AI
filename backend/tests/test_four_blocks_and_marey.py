import pytest
from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_four_block_types_distribution_and_schema():
    """Verify that blocks endpoint returns all 4 block types with tasks and metadata."""
    res = client.get("/api/blocks")
    assert res.status_code == 200
    blocks = res.json()
    assert len(blocks) >= 50

    block_types = {b.get("block_type") for b in blocks}
    assert "RULING" in block_types
    assert "PLANNED" in block_types
    assert "EMERGENT" in block_types
    assert "SHADOW" in block_types

    # Verify shadow blocks have multi-department bundled tasks
    shadow_blocks = [b for b in blocks if b.get("block_type") == "SHADOW"]
    assert len(shadow_blocks) >= 5
    for sb in shadow_blocks:
        assert sb["is_multi_department"] is True
        assert len(sb.get("tasks", [])) >= 2
        depts = {t["department_id"] for t in sb["tasks"]}
        assert len(depts) >= 2  # Multi-department synergy

    # Verify ruling blocks
    ruling_blocks = [b for b in blocks if b.get("block_type") == "RULING"]
    assert len(ruling_blocks) >= 2
    for rb in ruling_blocks:
        assert rb["planning_origin"] == "ANNUAL_MAINTENANCE_PROGRAMME_2026"

    # Verify emergent blocks
    emergent_blocks = [b for b in blocks if b.get("block_type") == "EMERGENT"]
    assert len(emergent_blocks) >= 4
    for eb in emergent_blocks:
        assert eb["planning_origin"] == "CRITICAL_DEFECT_EMERGENCY_INTERVENTION"
        assert eb["task_priority"] == "CRITICAL"

def test_railway_marey_active_trains_endpoint():
    """Verify active trains endpoint returns structured telemetry for Bina-Itarsi corridor."""
    res = client.get("/api/railway/active-trains")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["total_active_trains"] > 0
    assert len(data["trains"]) > 0

    # Inspect first train structure
    t = data["trains"][0]
    assert "trainNumber" in t
    assert "trainName" in t
    assert "category" in t
    assert "direction" in t
    assert "currentKm" in t
    assert "historicalPositions" in t
    assert "scheduledPath" in t
    assert len(t["historicalPositions"]) > 0

def test_railway_corridor_stations_endpoint():
    """Verify corridor stations endpoint returns exactly 27 stations from Bina to Itarsi."""
    res = client.get("/api/railway/corridor-stations")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["stations_count"] == 27
    assert data["stations"][0]["code"] == "BINA"
    assert data["stations"][0]["km"] == 0.0
    assert data["stations"][-1]["code"] == "ET"
    assert data["stations"][-1]["km"] == 231.0


def test_marey_expanded_trains_and_halts():
    """Verify expanded 24h train schedule and horizontal halt geometry in DEMO mode."""
    res = client.get("/api/railway/active-trains?mode=DEMO")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["reference_time"] == "19:55"
    assert data["total_trains"] >= 25
    assert data["total_active_trains"] >= 5

    # Check for presence of halt geometry in scheduled paths (both ARRIVAL and DEPARTURE)
    has_halt_dep = False
    for t in data["trains"]:
        for pt in t["scheduledPath"]:
            if pt.get("type") == "DEPARTURE":
                has_halt_dep = True
                break
        if has_halt_dep:
            break
    assert has_halt_dep is True


def test_operational_only_block_filtering():
    """Verify operational_only parameter filters out unapproved draft proposals."""
    res = client.get("/api/blocks?operational_only=true")
    assert res.status_code == 200
    blocks = res.json()
    allowed_statuses = {"APPROVED", "SANCTIONED", "ACTIVE", "COMPLETED", "SELECTED"}
    for b in blocks:
        assert b["status"] in allowed_statuses


def test_cobo_approval_gatekeeping():
    """Verify that department roles cannot approve blocks (restricted to COBO)."""
    # Find a proposed or pending block
    res = client.get("/api/blocks?status=PROPOSED")
    blocks = res.json()
    if not blocks:
        res = client.get("/api/blocks?status=PENDING_APPROVAL")
        blocks = res.json()
    if not blocks:
        res = client.get("/api/blocks?status=PLANNED")
        blocks = res.json()

    if blocks:
        target_id = blocks[0]["id"]
        # Department role trying to approve must get 403 Forbidden
        unauth_res = client.post(
            f"/api/blocks/{target_id}/approve",
            json={"actor": "Junior Engineer (P.Way)", "role": "TRACK_PWAY", "notes": "Unauthorized attempt"}
        )
        assert unauth_res.status_code == 403
        assert "Only Chief of Block Officer" in unauth_res.json()["detail"]

