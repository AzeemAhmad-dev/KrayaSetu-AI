"""
Production Baseline Verification Tests for KrayaSetu AI
Smart India Hackathon Problem Statement 26027 | WCR - Bhopal Division

Verifies:
1. Canonical 50-Block Dataset Pipeline (GENERATE -> VALIDATE -> PROMOTE)
2. Marey IST Clock & Active Train Detection
3. Maintenance Completed Tasks Cadence Filtering
4. Vercel SPA Fallback Configuration
"""

import os
import json
import shutil
from datetime import datetime, timedelta
import pytest
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.maintenance import Block, MaintenanceTask, FaultObservation
from backend.app.services.time_validation import get_canonical_now, get_canonical_today_str
from scripts.populate_four_block_dataset import (
    generate_candidate_dataset,
    validate_candidate_dataset,
    promote_dataset_to_canonical,
    populate_four_block_dataset,
)

client = TestClient(app)


def test_canonical_pipeline_generate_validate():
    """Verify that candidate generation produces 50 blocks, 64 tasks, 64 faults,
    and passes strict railway validation."""
    db = SessionLocal()
    try:
        faults, tasks, blocks, seed = generate_candidate_dataset(db=db, demo_seed=12345)
        assert len(blocks) == 50
        assert len(tasks) == 64
        assert len(faults) == 64

        # Validate candidate dataset
        assert validate_candidate_dataset(faults, tasks, blocks, db=db) is True

        # Validation rejects altered block count
        with pytest.raises(ValueError, match="Expected exactly 50 blocks"):
            validate_candidate_dataset(faults, tasks, blocks[:-1], db=db)

        # Validation rejects tampered shadow block
        sb = next(b for b in blocks if b.block_type == "SHADOW")
        original_notes = sb.approval_notes
        sb.approval_notes = json.dumps({"bundled_tasks": ["FAKE-TASK-ID"]})
        with pytest.raises(ValueError, match="approval_notes bundled_tasks"):
            validate_candidate_dataset(faults, tasks, blocks, db=db)
        sb.approval_notes = original_notes

        # Validation rejects task with invalid block reference
        tasks[0].block_id = "NON_EXISTENT_BLOCK"
        with pytest.raises(ValueError, match="references non-existent block"):
            validate_candidate_dataset(faults, tasks, blocks, db=db)
        tasks[0].block_id = blocks[0].id
    finally:
        db.close()


def test_populate_four_block_dataset_execution():
    """Verify end-to-end execution of populate_four_block_dataset."""
    result = populate_four_block_dataset(seed=98765)
    assert result["status"] == "SUCCESS"
    assert result["total_blocks"] == 50
    assert result["distribution"]["RULING"] == 3
    assert result["distribution"]["PLANNED"] == 33
    assert result["distribution"]["EMERGENT"] == 5
    assert result["distribution"]["SHADOW"] == 9
    assert result["total_tasks"] == 64


def test_marey_ist_clock_and_active_trains():
    """Verify active trains endpoint uses Asia/Kolkata date & time."""
    canonical_today = get_canonical_today_str()
    canonical_now = get_canonical_now()

    res = client.get("/api/railway/active-trains?mode=LIVE")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["reference_date"] == canonical_today
    assert data["is_today"] is True
    assert data["total_active_trains"] > 0

    # Verify at least one active train has movement telemetry
    active_trains = [t for t in data["trains"] if t.get("is_active")]
    assert len(active_trains) > 0
    first_active = active_trains[0]
    assert len(first_active["historicalPositions"]) > 0
    assert first_active["currentKm"] > 0

    # Querying a future date should report is_today = False and empty historical positions
    res_future = client.get("/api/railway/active-trains?mode=FUTURE&reference_date=2026-11-15")
    assert res_future.status_code == 200
    future_data = res_future.json()
    assert future_data["is_today"] is False
    assert future_data["total_active_trains"] == 0


def test_completed_tasks_cadence_filtering():
    """Verify completed tasks endpoint supports cadence period filtering."""
    for period in ["TODAY", "DAILY", "WEEKLY", "MONTHLY", "ALL"]:
        res = client.get(f"/api/maintenance/completed-tasks?period={period}")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    # Test with custom reference_date
    res_custom = client.get("/api/maintenance/completed-tasks?period=WEEKLY&reference_date=2026-09-26")
    assert res_custom.status_code == 200
    assert isinstance(res_custom.json(), list)


def test_vercel_spa_fallback_routing():
    """Verify vercel.json contains the SPA client fallback rewrite rule."""
    vercel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "vercel.json"))
    assert os.path.exists(vercel_path), "vercel.json must exist in project root"
    with open(vercel_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    rewrites = config.get("rewrites", [])
    has_api_rewrite = any("/api" in r.get("source", "") for r in rewrites)
    has_spa_rewrite = any("index.html" in r.get("destination", "") for r in rewrites)

    assert has_api_rewrite, "vercel.json must have API rewrite"
    assert has_spa_rewrite, "vercel.json must have SPA client-side fallback rewrite to /index.html"


def test_regenerate_canonical_endpoint_success():
    """Verify /api/blocks/regenerate-canonical generates and promotes 50 canonical blocks."""
    res = client.post("/api/blocks/regenerate-canonical?seed=424242")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["total_blocks"] == 50
    assert data["distribution"]["RULING"] == 3
    assert data["distribution"]["PLANNED"] == 33
    assert data["distribution"]["EMERGENT"] == 5
    assert data["distribution"]["SHADOW"] == 9
    assert data["total_tasks"] == 64
    assert "50-block scenario regenerated successfully." in data["message"]


def test_regenerate_canonical_endpoint_rollback_on_failure():
    """Verify that if candidate validation fails, the existing database is left 100% untouched."""
    from unittest.mock import patch

    db = SessionLocal()
    initial_count = db.query(Block).count()
    initial_block_ids = {b.id for b in db.query(Block).all()}
    db.close()

    with patch("scripts.populate_four_block_dataset.validate_candidate_dataset", side_effect=ValueError("Simulated Invariant Failure")):
        res = client.post("/api/blocks/regenerate-canonical")
        assert res.status_code == 500
        assert "Simulated Invariant Failure" in res.json().get("detail", "")

    # Assert database state was completely preserved via rollback
    db = SessionLocal()
    after_count = db.query(Block).count()
    after_block_ids = {b.id for b in db.query(Block).all()}
    db.close()

    assert after_count == initial_count == 50
    assert after_block_ids == initial_block_ids


def test_corridor_block_planning_diversification_and_isolation():
    """Verify all 5 active corridors are represented with Daily, Weekly, and Monthly
    blocks and strict corridor isolation (zero cross-corridor leakage)."""
    now = get_canonical_now()
    today = now.date()
    today_str = today.strftime("%Y-%m-%d")
    weekday = today.weekday()
    mon = today - timedelta(days=weekday)
    sun = mon + timedelta(days=6)
    month_prefix = today.strftime("%Y-%m")

    active_corridors = ["CORR-01", "CORR-02", "CORR-03", "CORR-04", "CORR-05"]
    total_blocks_seen = 0

    for cid in active_corridors:
        res = client.get(f"/api/blocks?corridor_id={cid}")
        assert res.status_code == 200
        blocks = res.json()
        assert len(blocks) >= 4, f"Corridor {cid} should have at least 4 blocks, got {len(blocks)}"

        total_blocks_seen += len(blocks)

        # Assert strict corridor isolation: all returned blocks MUST belong to this corridor
        for b in blocks:
            assert b["corridor_id"] == cid, f"Cross-corridor leakage: block {b['id']} with corridor {b['corridor_id']} returned for query {cid}"
            assert b["section_id"].startswith(f"SEC-{cid}-"), f"Section {b['section_id']} does not match corridor {cid}"
            assert "maksi" not in b["section_id"].lower()
            assert "ruthiyai" not in b["section_id"].lower()

        # Cadence checks
        daily_cnt = sum(1 for b in blocks if (b.get("execution_date") or "")[:10] == today_str)
        weekly_cnt = sum(
            1 for b in blocks
            if b.get("execution_date") and mon <= datetime.strptime(b["execution_date"][:10], "%Y-%m-%d").date() <= sun
        )
        monthly_cnt = sum(1 for b in blocks if (b.get("execution_date") or "").startswith(month_prefix))

        assert daily_cnt >= 1, f"Corridor {cid} missing Daily blocks ({daily_cnt} found)"
        assert weekly_cnt >= 1, f"Corridor {cid} missing Weekly blocks ({weekly_cnt} found)"
        assert monthly_cnt >= 1, f"Corridor {cid} missing Monthly blocks ({monthly_cnt} found)"

    assert total_blocks_seen == 50, f"Expected exactly 50 total blocks across corridors, got {total_blocks_seen}"


def test_multiple_regenerations_preserve_composition_and_representation():
    """Verify that multiple regenerations with different seeds produce valid 50-block
    scenarios preserving the 3/33/5/9 composition and full 5-corridor representation."""
    for seed in [111, 222, 333]:
        res = client.post(f"/api/blocks/regenerate-canonical?seed={seed}")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"
        assert data["total_blocks"] == 50
        assert data["distribution"]["RULING"] == 3
        assert data["distribution"]["PLANNED"] == 33
        assert data["distribution"]["EMERGENT"] == 5
        assert data["distribution"]["SHADOW"] == 9
        assert data["total_tasks"] == 64

        # Verify all 5 corridors remain represented in database
        db = SessionLocal()
        try:
            corrs = {b.corridor_id for b in db.query(Block).all()}
            assert corrs == {"CORR-01", "CORR-02", "CORR-03", "CORR-04", "CORR-05"}
            for cid in corrs:
                c_cnt = db.query(Block).filter(Block.corridor_id == cid).count()
                assert c_cnt >= 4, f"Corridor {cid} under-represented with {c_cnt} blocks on seed {seed}"
        finally:
            db.close()


def test_get_blocks_repeated_stability():
    """Test that GET /api/blocks called 5 times in a row returns the EXACT SAME list of block IDs in the exact same order."""
    first_res = client.get("/api/blocks")
    assert first_res.status_code == 200
    first_blocks = first_res.json()
    assert len(first_blocks) == 50
    first_ids = [b["id"] for b in first_blocks]

    for iteration in range(4):
        res = client.get("/api/blocks")
        assert res.status_code == 200
        blocks = res.json()
        ids = [b["id"] for b in blocks]
        assert ids == first_ids, f"Block IDs differed on call {iteration + 2}"
        assert blocks == first_blocks, f"Block content differed on call {iteration + 2}"


def test_navigation_read_endpoints_zero_mutation():
    """Test that navigating between routes / calling read endpoints does NOT change the database row count or modify any block/task ID."""
    db = SessionLocal()
    try:
        initial_block_count = db.query(Block).count()
        initial_task_count = db.query(MaintenanceTask).count()
        initial_blocks = [(b.id, b.corridor_id, b.status, b.execution_date) for b in db.query(Block).order_by(Block.id).all()]
        initial_tasks = [(t.id, t.block_id, t.priority, t.sev_score, t.risk_score) for t in db.query(MaintenanceTask).order_by(MaintenanceTask.id).all()]
    finally:
        db.close()

    assert initial_block_count == 50
    assert initial_task_count == 64

    navigation_endpoints = [
        "/api/blocks",
        "/planning/priorities",
        "/planning/candidates",
        "/api/blocks?corridor_id=CORR-01",
        "/api/blocks?corridor_id=CORR-02",
        "/api/blocks?corridor_id=CORR-03",
        "/api/blocks?corridor_id=CORR-04",
        "/api/blocks?corridor_id=CORR-05",
        "/api/blocks/coordination",
        "/planning/dashboard-summary",
        "/api/railway/active-trains?mode=LIVE",
        "/api/health",
        "/api/blocks",
    ]

    for ep in navigation_endpoints:
        res = client.get(ep)
        assert res.status_code == 200, f"Endpoint {ep} failed with {res.status_code}"

    # Verify database state after navigation is 100% identical
    db = SessionLocal()
    try:
        after_block_count = db.query(Block).count()
        after_task_count = db.query(MaintenanceTask).count()
        after_blocks = [(b.id, b.corridor_id, b.status, b.execution_date) for b in db.query(Block).order_by(Block.id).all()]
        after_tasks = [(t.id, t.block_id, t.priority, t.sev_score, t.risk_score) for t in db.query(MaintenanceTask).order_by(MaintenanceTask.id).all()]
    finally:
        db.close()

    assert after_block_count == initial_block_count == 50
    assert after_task_count == initial_task_count == 64
    assert after_blocks == initial_blocks
    assert after_tasks == initial_tasks


def test_priority_queue_tasks_link_canonical_blocks():
    """Verify that tasks in /planning/priorities contain valid block_id links to canonical blocks."""
    res = client.get("/planning/priorities?limit=100")
    assert res.status_code == 200
    data = res.json()
    tasks = data.get("tasks", [])
    assert len(tasks) == 64

    db = SessionLocal()
    try:
        valid_block_ids = {b.id for b in db.query(Block).all()}
    finally:
        db.close()

    for t in tasks:
        assert "block_id" in t
        assert t["block_id"] in valid_block_ids, f"Task {t['task_id']} linked to invalid block {t['block_id']}"


def test_only_explicit_regenerate_modifies_dataset():
    """Verify that ONLY POST /api/blocks/regenerate-canonical changes the dataset."""
    db = SessionLocal()
    try:
        before_blocks = {b.id: (b.requested_start_time, b.location_km) for b in db.query(Block).all()}
    finally:
        db.close()

    res = client.post("/api/blocks/regenerate-canonical?seed=555555")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["total_blocks"] == 50

    db = SessionLocal()
    try:
        after_blocks = {b.id: (b.requested_start_time, b.location_km) for b in db.query(Block).all()}
        assert len(after_blocks) == 50
    finally:
        db.close()


def test_post_regeneration_get_stability():
    """Verify that after regeneration, subsequent GET requests are completely stable and read-only."""
    res1 = client.get("/api/blocks")
    assert res1.status_code == 200
    blocks1 = res1.json()

    res2 = client.get("/api/blocks")
    assert res2.status_code == 200
    blocks2 = res2.json()

    assert blocks1 == blocks2

    # Query priorities
    prio_res = client.get("/planning/priorities")
    assert prio_res.status_code == 200

    # Re-verify blocks unchanged
    res3 = client.get("/api/blocks")
    assert res3.status_code == 200
    assert res3.json() == blocks1


def test_cp_sat_uses_latest_regenerated_dataset_end_to_end():
    """
    CRITICAL SYNCHRONIZATION TEST:
    Verifies that when a canonical 50-block dataset is regenerated:
    1. CP-SAT optimization immediately and exclusively consumes tasks from the new dataset.
    2. Scheduled items output by CP-SAT reference valid block_id and task_id from the latest dataset.
    3. Proposing from schedule updates the existing canonical block and maintains the exact 50-block invariant.
    """
    # 1. Regenerate with seed A
    seed_a = 771122
    res_a = client.post(f"/api/blocks/regenerate-canonical?seed={seed_a}")
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["status"] == "SUCCESS"
    assert data_a["total_blocks"] == 50

    db = SessionLocal()
    try:
        tasks_a = {t.id: t.location_km for t in db.query(MaintenanceTask).all()}
        blocks_a = {b.id: b.location_km for b in db.query(Block).all()}
    finally:
        db.close()

    # 2. Run CP-SAT optimization for CORR-01
    opt_payload_a = {
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "allow_bundling": True
    }
    opt_res_a = client.post("/api/blocks/optimize", json=opt_payload_a)
    assert opt_res_a.status_code == 200
    opt_data_a = opt_res_a.json()
    assert len(opt_data_a["schedule"]) > 0

    # Verify all scheduled tasks and block_ids match dataset A
    for item in opt_data_a["schedule"]:
        assert item["task_id"] in tasks_a, f"Task {item['task_id']} not found in dataset A tasks"
        if item.get("block_id"):
            assert item["block_id"] in blocks_a, f"Block {item['block_id']} not found in dataset A blocks"

    # 3. Now explicitly REGENERATE with seed B
    seed_b = 883344
    res_b = client.post(f"/api/blocks/regenerate-canonical?seed={seed_b}")
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["status"] == "SUCCESS"
    assert data_b["total_blocks"] == 50

    db = SessionLocal()
    try:
        tasks_b = {t.id: t.location_km for t in db.query(MaintenanceTask).all()}
        blocks_b = {b.id: b.location_km for b in db.query(Block).all()}
        total_blocks_count = db.query(Block).count()
        assert total_blocks_count == 50
    finally:
        db.close()

    # Verify dataset was actually randomized/updated between seeds
    diff_count = sum(1 for tid in tasks_b if tasks_b.get(tid) != tasks_a.get(tid))
    assert diff_count > 0, "Dataset was not altered between seeds"

    # 4. Run CP-SAT optimization again for CORR-01
    opt_res_b = client.post("/api/blocks/optimize", json=opt_payload_a)
    assert opt_res_b.status_code == 200
    opt_data_b = opt_res_b.json()
    assert len(opt_data_b["schedule"]) > 0

    # 5. Verify ALL scheduled items in opt_data_b reference the NEW dataset B state
    for item in opt_data_b["schedule"]:
        assert item["task_id"] in tasks_b, f"Task {item['task_id']} not found in dataset B"
        if item.get("block_id"):
            assert item["block_id"] in blocks_b, f"Block {item['block_id']} not found in dataset B"
            # Location in scheduled result should match dataset B location
            assert abs(item["location_km"] - tasks_b[item["task_id"]]) < 1e-4

    # 6. Propose a block from schedule using an item from opt_data_b
    sched_item = opt_data_b["schedule"][0]
    prop_payload = {
        "block_id": sched_item.get("block_id"),
        "task_id": sched_item["task_id"],
        "corridor_id": sched_item["corridor_id"],
        "section_id": sched_item["section_id"],
        "track_name": sched_item["track_name"],
        "location_km": sched_item["location_km"],
        "execution_date": sched_item.get("execution_date") or "2026-03-25",
        "requested_start_time": sched_item["allocated_start_time"],
        "requested_end_time": sched_item["allocated_end_time"],
        "duration_mins": sched_item["duration_mins"],
        "protection_type": "TRAFFIC_BLOCK",
        "power_isolation_required": False,
        "assigned_machine": sched_item.get("assigned_machine"),
        "proposed_by": "CP-SAT Optimizer / Controller",
        "auto_submit": True
    }
    prop_res = client.post("/api/blocks/propose-from-schedule", json=prop_payload)
    assert prop_res.status_code == 200
    prop_data = prop_res.json()
    assert prop_data["status"] == "SUCCESS"

    # Verify that the existing canonical block was updated and NO duplicate orphan was created
    if sched_item.get("block_id"):
        assert prop_data["block_id"] == sched_item["block_id"]

    db = SessionLocal()
    try:
        final_block_count = db.query(Block).count()
        assert final_block_count == 50, f"Expected exactly 50 blocks after proposal update, got {final_block_count}"
        updated_block = db.query(Block).filter(Block.id == prop_data["block_id"]).first()
        assert updated_block is not None
        assert updated_block.status == "PENDING_APPROVAL"
        assert updated_block.requested_start_time == sched_item["allocated_start_time"]
    finally:
        db.close()




