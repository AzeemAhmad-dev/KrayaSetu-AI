"""
Canonical 50-Block Synchronization & Lifecycle Regression Tests
Smart India Hackathon Problem Statement 26027 | WCR - Bhopal Division

Implements Tests A through F per Sections 21-26 of the Critical Bug Specification:
- TEST A: Navigation must not regenerate (Dataset A == Dataset A)
- TEST B: CP-SAT must use same dataset (Input & output stamped with canonical block_id and fingerprint)
- TEST C: Explicit regeneration replaces dataset across Operations, Block Planner, and CP-SAT
- TEST D: Proposal and sanction updates existing canonical block without duplication (exact 50 blocks)
- TEST E: Simulated restart/refresh preserves Dataset A without silent reseeding
- TEST F: Repeated round-trip navigation has zero mutation and zero drift
"""

import pytest
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.maintenance import Block, MaintenanceTask
from backend.app.services.dataset_identity import compute_dataset_fingerprint

client = TestClient(app)


def test_suite_test_a_navigation_must_not_regenerate():
    """TEST A: Normal page navigation must never regenerate or alter the dataset."""
    db = SessionLocal()
    initial_fp = compute_dataset_fingerprint(db)
    blocks_before = [(b.id, b.corridor_id, b.section_id, b.location_km) for b in db.query(Block).order_by(Block.id).all()]
    tasks_before = [(t.id, t.block_id, t.corridor_id, t.priority) for t in db.query(MaintenanceTask).order_by(MaintenanceTask.id).all()]
    db.close()

    # Simulate navigating through all pages multiple times
    for _ in range(3):
        # Operations / Decision
        res_op = client.get("/api/planning/priorities?limit=1000")
        assert res_op.status_code == 200
        assert res_op.json()["dataset_fingerprint"] == initial_fp

        res_sum = client.get("/api/planning/dashboard-summary")
        assert res_sum.status_code == 200
        assert res_sum.json()["dataset_fingerprint"] == initial_fp

        # Block Planner
        res_blk = client.get("/api/blocks")
        assert res_blk.status_code == 200
        assert len(res_blk.json()) == 50

        res_mov = client.get("/api/train-movements")
        assert res_mov.status_code == 200

        # Coordination
        res_coord = client.get("/api/blocks/coordination")
        assert res_coord.status_code == 200

        # Corridors & Network Map
        res_corr = client.get("/api/corridors")
        assert res_corr.status_code == 200

    # Verify DB state is byte-for-byte invariant
    db = SessionLocal()
    final_fp = compute_dataset_fingerprint(db)
    blocks_after = [(b.id, b.corridor_id, b.section_id, b.location_km) for b in db.query(Block).order_by(Block.id).all()]
    tasks_after = [(t.id, t.block_id, t.corridor_id, t.priority) for t in db.query(MaintenanceTask).order_by(MaintenanceTask.id).all()]
    db.close()

    assert initial_fp == final_fp
    assert blocks_before == blocks_after
    assert tasks_before == tasks_after


def test_suite_test_b_cpsat_uses_current_canonical_dataset():
    """TEST B: CP-SAT must solve on current DB tasks and propagate block_id and fingerprint."""
    db = SessionLocal()
    current_fp = compute_dataset_fingerprint(db)
    db_tasks = {t.id: t.block_id for t in db.query(MaintenanceTask).all()}
    db.close()

    # Run CP-SAT on CORR-01
    opt_res = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "execution_date": "2026-10-01",
        "allow_bundling": True
    })
    assert opt_res.status_code == 200
    opt_data = opt_res.json()

    # CP-SAT must be stamped with the database's dataset fingerprint
    assert opt_data.get("dataset_fingerprint") == current_fp

    # Every scheduled item must belong to the current dataset and carry a valid block_id
    schedule = opt_data.get("schedule", [])
    assert len(schedule) > 0
    for item in schedule:
        task_id = item.get("task_id")
        block_id = item.get("block_id")
        assert task_id in db_tasks
        assert block_id is not None
        assert block_id == db_tasks[task_id]


def test_suite_test_c_regeneration_changes_dataset_and_syncs():
    """TEST C: Explicit 'Regenerate 50 Blocks' creates Dataset B, updates fingerprint, and syncs across views."""
    # Step 1: Capture Dataset A
    db = SessionLocal()
    fp_a = compute_dataset_fingerprint(db)
    tasks_a = {t.id: t.sev_score for t in db.query(MaintenanceTask).all()}
    db.close()

    # Step 2: Explicitly regenerate to Dataset B with distinct seed
    reg_res = client.post("/api/blocks/regenerate-canonical?seed=771122")
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    fp_b = reg_data.get("dataset_fingerprint")

    # Invariant: Dataset A != Dataset B
    assert fp_a != fp_b

    # Step 3: Verify Operations / Decision reads Dataset B
    prio_res = client.get("/api/planning/priorities?limit=1000")
    assert prio_res.status_code == 200
    assert prio_res.json()["dataset_fingerprint"] == fp_b

    dash_res = client.get("/api/planning/dashboard-summary")
    assert dash_res.status_code == 200
    assert dash_res.json()["dataset_fingerprint"] == fp_b

    # Step 4: Verify CP-SAT uses Dataset B
    opt_res = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "execution_date": "2026-10-01",
        "allow_bundling": True
    })
    assert opt_res.status_code == 200
    assert opt_res.json()["dataset_fingerprint"] == fp_b


def test_suite_test_d_proposal_updates_existing_canonical_block():
    """TEST D: Proposing a scheduled CP-SAT item updates the existing canonical block without duplication."""
    db = SessionLocal()
    initial_blocks_count = db.query(Block).count()
    assert initial_blocks_count == 50
    db.close()

    # Run CP-SAT on CORR-01
    opt_res = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "execution_date": "2026-10-01",
        "allow_bundling": True
    })
    assert opt_res.status_code == 200
    item = opt_res.json()["schedule"][0]

    # Propose from schedule
    prop_res = client.post("/api/blocks/propose-from-schedule", json={
        "block_id": item["block_id"],
        "task_id": item["task_id"],
        "corridor_id": item.get("corridor_id", "CORR-01"),
        "section_id": item.get("section_id", "SEC-CORR-01-BHS-SOI"),
        "track_name": item.get("track_name", "DOWN_MAIN"),
        "location_km": item.get("location_km", 152.2),
        "execution_date": item.get("execution_date", "2026-10-01"),
        "requested_start_time": item["allocated_start_time"],
        "requested_end_time": item["allocated_end_time"],
        "duration_mins": item.get("duration_mins", 120),
        "protection_type": "TRAFFIC_BLOCK",
        "power_isolation_required": False,
        "proposed_by": "CP-SAT Controller",
        "auto_submit": True
    })
    assert prop_res.status_code == 200

    # Verify no duplicate block was created: count must remain exactly 50
    db = SessionLocal()
    final_blocks_count = db.query(Block).count()
    assert final_blocks_count == 50, f"Expected exactly 50 blocks, found {final_blocks_count}"

    # Verify the target canonical block was updated
    target_block = db.query(Block).filter(Block.id == item["block_id"]).first()
    assert target_block is not None
    assert target_block.status in ["PENDING_APPROVAL", "PROPOSED"]
    db.close()


def test_suite_test_e_simulated_restart_preserves_dataset():
    """TEST E: Server restart / new DB session preserves canonical dataset without auto-reseeding."""
    db1 = SessionLocal()
    fp1 = compute_dataset_fingerprint(db1)
    db1.close()

    # Simulate fresh process opening DB
    db2 = SessionLocal()
    fp2 = compute_dataset_fingerprint(db2)
    db2.close()

    assert fp1 == fp2

    # Query API endpoints as if fresh client connected
    res1 = client.get("/api/planning/priorities?limit=1000")
    res2 = client.get("/api/blocks")
    assert res1.json()["dataset_fingerprint"] == fp1
    assert len(res2.json()) == 50


def test_suite_test_f_repeated_navigation_zero_drift():
    """TEST F: 10 successive navigation cycles result in exactly zero mutations and zero drift."""
    db = SessionLocal()
    baseline_fp = compute_dataset_fingerprint(db)
    baseline_blocks = [b.id for b in db.query(Block).order_by(Block.id).all()]
    baseline_tasks = [t.id for t in db.query(MaintenanceTask).order_by(MaintenanceTask.id).all()]
    db.close()

    for cycle in range(10):
        r1 = client.get("/api/planning/priorities?limit=1000")
        r2 = client.get("/api/planning/dashboard-summary")
        r3 = client.get("/api/blocks")
        r4 = client.get("/api/train-movements")
        assert r1.json()["dataset_fingerprint"] == baseline_fp
        assert r2.json()["dataset_fingerprint"] == baseline_fp
        assert len(r3.json()) == 50

    db = SessionLocal()
    assert compute_dataset_fingerprint(db) == baseline_fp
    assert [b.id for b in db.query(Block).order_by(Block.id).all()] == baseline_blocks
    assert [t.id for t in db.query(MaintenanceTask).order_by(MaintenanceTask.id).all()] == baseline_tasks
    db.close()
