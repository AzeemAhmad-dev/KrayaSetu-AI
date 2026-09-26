"""
Acceptance Test Suite for Master Prompt Requirements & Workflow Consistency
KrayaSetu AI — Bhopal Division (WCR)

Verifies:
1. Requirement 1: Conflict engine canonical passenger service aggregation (no duplicates).
2. Requirement 2: Department-scoped issue log (faults filtered strictly by department_id).
3. Requirement 3: Additional pre-planned activities API (Current / Due Now, Weekly, Monthly).
4. Requirements 4-7: CP-SAT schedule enriched fields, deferred task metadata, and ledger auto-submit.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_conflict_engine_canonical_passenger_aggregation():
    """Verify passenger services appear exactly once without duplicate 12155 entries."""
    res = client.post("/api/blocks/check-conflict", json={
        "corridor_id": "CORR-01",
        "section_id": "SEC-CORR-01-BHS-SOI",
        "track_name": "DOWN_MAIN",
        "location_km": 152.2,
        "requested_start_time": "12:00",
        "requested_end_time": "14:00",
        "duration_mins": 120,
        "protection_type": "TRAFFIC_BLOCK",
        "power_isolation_required": False
    })
    assert res.status_code == 200
    data = res.json()
    assert "evaluation" in data
    eval_res = data["evaluation"]

    passenger_conflicts = eval_res.get("conflicting_passenger_trains", [])
    # Verify canonical uniqueness: train numbers must be unique
    seen_trains = set()
    for train in passenger_conflicts:
        tnum = train.get("train_number")
        assert tnum not in seen_trains, f"Duplicate passenger service found: {tnum}"
        seen_trains.add(tnum)

    # If 12155 is present, count must be exactly 1
    count_12155 = sum(1 for t in passenger_conflicts if "12155" in str(t.get("train_number")))
    assert count_12155 <= 1, f"Expected 12155 to appear at most once, but found {count_12155} times"

    # Summary check
    summary = eval_res.get("summary", "")
    if len(passenger_conflicts) == 1:
        assert "1 passenger service" in summary or "Direct track occupancy conflict" in summary


def test_department_scoped_faults_api():
    """Verify Department Issue Log returns only defects belonging to that department."""
    for dept in ["PWAY", "TRD", "SNT"]:
        res = client.get(f"/api/maintenance/faults?department_id={dept}")
        assert res.status_code == 200
        faults = res.json()
        assert len(faults) > 0, f"Expected faults for department {dept}"
        for f in faults:
            assert f["department_id"] == dept, f"Fault {f['id']} has department {f['department_id']}, expected {dept}"
            # Verify enriched fields are present
            assert "category" in f
            assert "priority" in f
            assert "station_code" in f


def test_planned_activities_api():
    """Verify pre-planned activities query and status update."""
    # 1. Query CURRENT cadence
    res_curr = client.get("/api/maintenance/planned-activities?cadence=CURRENT")
    assert res_curr.status_code == 200
    curr_acts = res_curr.json()
    assert len(curr_acts) >= 3, "Expected at least 3 CURRENT activities"
    for a in curr_acts:
        assert a["cadence"] == "CURRENT"
        assert "is_due_now" in a
        assert a["location_km"] is not None

    # 2. Query WEEKLY cadence
    res_wk = client.get("/api/maintenance/planned-activities?cadence=WEEKLY")
    assert res_wk.status_code == 200
    wk_acts = res_wk.json()
    assert len(wk_acts) >= 9, "Expected at least 9 WEEKLY activities"

    # 3. Query MONTHLY cadence
    res_mo = client.get("/api/maintenance/planned-activities?cadence=MONTHLY")
    assert res_mo.status_code == 200
    mo_acts = res_mo.json()
    assert len(mo_acts) >= 9, "Expected at least 9 MONTHLY activities"

    # 4. Status update
    first_act_id = curr_acts[0]["id"]
    patch_res = client.patch(f"/api/maintenance/planned-activities/{first_act_id}/status?status=IN_PROGRESS")
    assert patch_res.status_code == 200
    assert patch_res.json()["new_status"] == "IN_PROGRESS"


def test_cpsat_rich_fields_and_ledger_auto_submit():
    """Verify CP-SAT proposal detailed fields and immediate ledger visibility upon auto_submit."""
    # 1. Run optimization
    opt_res = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "allow_bundling": True
    })
    assert opt_res.status_code == 200
    opt_data = opt_res.json()
    assert "schedule" in opt_data
    assert "deferred_tasks" in opt_data

    # Check rich fields on scheduled items
    if opt_data["schedule"]:
        first_item = opt_data["schedule"][0]
        assert "corridor_id" in first_item
        assert "track_name" in first_item
        assert "location_km" in first_item
        assert "station_name" in first_item
        assert first_item.get("block_type") == "Planned Block"

    # Check rich fields on deferred tasks
    if opt_data["deferred_tasks"]:
        first_def = opt_data["deferred_tasks"][0]
        assert "task_id" in first_def
        assert "department" in first_def
        assert "location" in first_def
        assert "rescheduled_slot" in first_def
        assert first_def.get("status") == "DEFERRED"

    # 2. Propose from schedule with auto_submit=True
    if opt_data["schedule"]:
        target_item = opt_data["schedule"][0]
        prop_res = client.post("/api/blocks/propose-from-schedule", json={
            "task_id": target_item["task_id"],
            "corridor_id": target_item.get("corridor_id", "CORR-01"),
            "section_id": target_item.get("section_id", "SEC-CORR-01-BHS-SOI"),
            "track_name": target_item.get("track_name", "DOWN_MAIN"),
            "location_km": target_item.get("location_km", 152.2),
            "requested_start_time": target_item["allocated_start_time"],
            "requested_end_time": target_item["allocated_end_time"],
            "duration_mins": target_item.get("duration_mins", 120),
            "auto_submit": True
        })
        assert prop_res.status_code == 200
        prop_block = prop_res.json()["block"]
        assert prop_block["status"] == "PENDING_APPROVAL"

        # Verify it appears immediately in the Divisional Block Ledger
        ledger_res = client.get("/api/blocks?ledger_only=true")
        assert ledger_res.status_code == 200
        ledger_blocks = ledger_res.json()
        matching = [b for b in ledger_blocks if b["id"] == prop_block["id"]]
        assert len(matching) == 1, f"Block {prop_block['id']} with status PENDING_APPROVAL must appear in Divisional Block Ledger"


def test_notes_sanitization_no_raw_json():
    """Verify that no block returned by the API ever exposes raw JSON dumps in approval_notes."""
    res = client.get("/api/blocks")
    assert res.status_code == 200
    blocks = res.json()
    assert len(blocks) > 0

    for b in blocks:
        notes = b.get("approval_notes")
        if notes is not None:
            trimmed = notes.strip()
            # Must NOT be a raw JSON object string
            assert not (trimmed.startswith("{") and trimmed.endswith("}")), (
                f"Block {b['id']} has raw JSON in approval_notes: {notes}"
            )
            # Must be a clean human string
            assert isinstance(notes, str)


def test_planned_block_cadence_visibility():
    """Verify that default blocks API provides full visibility into planned blocks across Bhopal division."""
    all_res = client.get("/api/blocks")
    assert all_res.status_code == 200
    all_blocks = all_res.json()

    # Operational only query should filter strictly
    op_res = client.get("/api/blocks?operational_only=true")
    assert op_res.status_code == 200
    op_blocks = op_res.json()

    # All operational blocks must have valid operational statuses
    allowed_op = {"APPROVED", "SANCTIONED", "ACTIVE", "COMPLETED", "SELECTED"}
    for ob in op_blocks:
        assert ob["status"] in allowed_op

    # Total planned blocks should be >= operational blocks
    assert len(all_blocks) >= len(op_blocks)

    # Verify corridor isolation: CORR-01
    corr1_res = client.get("/api/blocks?corridor_id=CORR-01")
    assert corr1_res.status_code == 200
    corr1_blocks = corr1_res.json()
    for cb in corr1_blocks:
        assert cb["corridor_id"] == "CORR-01"

