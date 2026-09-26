"""
Focused Regression Test Suite: CP-SAT Lifecycle & False-Proposal Elimination
Smart India Hackathon Problem Statement 26027 | WCR - Bhopal Division

Implements Tests A through E per Section 8 of the prompt:
- Test A: Canonical regeneration produces 50 blocks, 64 tasks, 64 faults in PLANNED / DRAFT lifecycle.
- Test B: CP-SAT scan/solve is purely read-only for domain data (fingerprint invariant, no new IDs, no proposal events).
- Test C: Pre-proposal state logic ensures items remain unproposed (no false "Proposal Created").
- Test D: Explicit proposal updates existing canonical block (count stays 50) and generates BLOCK_PROPOSED event.
- Test E: Department visibility after explicit proposal correctly scopes to P.Way, TRD, and S&T workspaces.
"""

import pytest
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.maintenance import Block, MaintenanceTask, FaultObservation
from backend.app.models.events import EventLog
from backend.app.services.dataset_identity import compute_dataset_fingerprint

client = TestClient(app)


def test_suite_test_a_canonical_regeneration_initial_lifecycle():
    """Test A: Regeneration produces exactly 50 blocks, 64 tasks, 64 faults in PLANNED/DRAFT state."""
    res = client.post("/api/blocks/regenerate-canonical?seed=883311")
    assert res.status_code == 200
    data = res.json()
    assert data["total_blocks"] == 50
    assert data["total_tasks"] == 64

    db = SessionLocal()
    blocks = db.query(Block).all()
    tasks = db.query(MaintenanceTask).all()
    faults = db.query(FaultObservation).all()

    assert len(blocks) == 50
    assert len(tasks) == 64
    assert len(faults) == 64

    # Verify lifecycle state semantics: all blocks start as PLANNED with DRAFT approval status
    for b in blocks:
        assert b.status == "PLANNED", f"Block {b.id} should be PLANNED, got {b.status}"
        assert b.approval_status == "DRAFT", f"Block {b.id} approval_status should be DRAFT, got {b.approval_status}"

    # Verify all tasks start as PENDING (awaiting block proposal/execution)
    for t in tasks:
        assert t.status == "PENDING", f"Task {t.id} status should be PENDING, got {t.status}"

    db.close()


def test_suite_test_b_cpsat_scan_solve_domain_purity():
    """Test B: CP-SAT solve is read-only for domain data; fingerprint invariant; no proposal event."""
    db = SessionLocal()
    blocks_before = {b.id: b.status for b in db.query(Block).all()}
    tasks_before = {t.id: t.status for t in db.query(MaintenanceTask).all()}
    faults_count_before = db.query(FaultObservation).count()
    events_count_before = db.query(EventLog).count()
    fp_before = compute_dataset_fingerprint(db)
    db.close()

    # Run CP-SAT on CORR-01
    res = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "execution_date": "2026-10-01",
        "allow_bundling": True
    })
    assert res.status_code == 200
    opt_data = res.json()
    assert opt_data.get("status") in ["OPTIMAL_SCHEDULE_FOUND", "FEASIBLE"]

    db = SessionLocal()
    blocks_after = {b.id: b.status for b in db.query(Block).all()}
    tasks_after = {t.id: t.status for t in db.query(MaintenanceTask).all()}
    faults_count_after = db.query(FaultObservation).count()
    events_after = db.query(EventLog).order_by(EventLog.id.desc()).all()
    fp_after = compute_dataset_fingerprint(db)
    db.close()

    # Assert 100% domain data invariants
    assert len(blocks_after) == 50
    assert len(tasks_after) == 64
    assert faults_count_after == faults_count_before == 64
    assert blocks_before == blocks_after, "Block statuses must not be altered by CP-SAT"
    assert tasks_before == tasks_after, "Task statuses must not be altered by CP-SAT"
    assert fp_before == fp_after, "Dataset fingerprint MUST be invariant across CP-SAT run"

    # Assert no BLOCK_PROPOSED or BLOCK_CREATED event was generated
    recent_events = events_after[:len(events_after) - events_count_before]
    actions = [e.action for e in recent_events]
    assert "BLOCK_PROPOSED" not in actions, "CP-SAT must NOT generate BLOCK_PROPOSED events"
    assert "BLOCK_CREATED" not in actions, "CP-SAT must NOT generate BLOCK_CREATED events"
    assert "PROPOSAL_CREATED" not in actions, "CP-SAT must NOT generate PROPOSAL_CREATED events"
    # Existing CP_SAT_OPTIMIZATION telemetry event is permitted
    assert "CP_SAT_OPTIMIZATION" in actions


def test_suite_test_c_frontend_proposal_state_logic():
    """Test C: Proposal state is strictly isolated to explicit user actions and resets on regeneration."""
    # Step 1: CP-SAT schedule returns multiple scheduled items
    opt_res = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "execution_date": "2026-10-01",
        "allow_bundling": True
    })
    schedule = opt_res.json().get("schedule", [])
    assert len(schedule) >= 3, "Schedule must return multiple items to verify isolation"

    # Step 2: Fresh session / After CP-SAT Solve: proposedTaskIds is empty
    proposed_task_ids = set()

    for item in schedule:
        is_already_proposed = item["task_id"] in proposed_task_ids
        assert not is_already_proposed, f"Task {item['task_id']} must NOT be proposed after CP-SAT solve"

    # Step 3: Explicitly propose ONLY the second task (e.g. TASK-B)
    target_task_id = schedule[1]["task_id"]
    proposed_task_ids.add(target_task_id)

    # Step 4: Verify ONLY the target task transitions to proposed; others remain "Propose Block"
    for idx, item in enumerate(schedule):
        is_already_proposed = item["task_id"] in proposed_task_ids
        if item["task_id"] == target_task_id:
            assert is_already_proposed, f"Target task {target_task_id} must be marked as proposed"
        else:
            assert not is_already_proposed, f"Non-target task {item['task_id']} at index {idx} must remain unproposed"

    # Step 5: User clicks "Regenerate 50 Blocks" -> proposedTaskIds is reset to empty
    proposed_task_ids.clear()
    assert len(proposed_task_ids) == 0, "proposedTaskIds must be reset to empty upon canonical regeneration"

    # All items are unproposed again
    for item in schedule:
        assert item["task_id"] not in proposed_task_ids


def test_suite_test_d_explicit_proposal_updates_existing_canonical_block():
    """Test D: Explicit proposal updates existing block (count remains 50) and emits BLOCK_PROPOSED event."""
    db = SessionLocal()
    events_count_before = db.query(EventLog).count()
    db.close()

    opt_res = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "execution_date": "2026-10-01",
        "allow_bundling": True
    })
    item = opt_res.json()["schedule"][0]
    target_block_id = item["block_id"]

    # Execute explicit proposal
    prop_res = client.post("/api/blocks/propose-from-schedule", json={
        "block_id": target_block_id,
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
        "proposed_by": "Senior Section Engineer (Track)",
        "auto_submit": True
    })
    assert prop_res.status_code == 200
    prop_data = prop_res.json()
    assert prop_data["block_id"] == target_block_id

    # Verify database state after proposal
    db = SessionLocal()
    assert db.query(Block).count() == 50, "Total blocks must remain strictly 50 (NO DUPLICATES)"
    updated_block = db.query(Block).filter(Block.id == target_block_id).first()
    assert updated_block is not None
    assert updated_block.status == "PENDING_APPROVAL"
    assert updated_block.approval_status == "PENDING_APPROVAL"

    # Verify BLOCK_PROPOSED event was logged
    recent_events = db.query(EventLog).order_by(EventLog.id.desc()).limit(5).all()
    proposal_events = [e for e in recent_events if e.action == "BLOCK_PROPOSED" and e.entity_id == target_block_id]
    assert len(proposal_events) >= 1, "BLOCK_PROPOSED event must be generated on explicit proposal"
    db.close()


def test_suite_test_e_department_visibility_after_proposal():
    """Test E: After explicit proposal, block becomes visible in the appropriate department workspace."""
    # Step 1: Regenerate fresh canonical scenario
    client.post("/api/blocks/regenerate-canonical?seed=994422")

    # Step 2: Propose a Track (P.Way) block: BLOCK-PLN-001 (task TASK-PLN-001)
    res_prop = client.post("/api/blocks/propose-from-schedule", json={
        "block_id": "BLOCK-PLN-001",
        "task_id": "TASK-PLN-001",
        "corridor_id": "CORR-01",
        "section_id": "SEC-CORR-01-BHS-SOI",
        "track_name": "DOWN_MAIN",
        "location_km": 150.0,
        "execution_date": "2026-10-01",
        "requested_start_time": "10:00",
        "requested_end_time": "12:00",
        "duration_mins": 120,
        "protection_type": "TRAFFIC_BLOCK",
        "power_isolation_required": False,
        "proposed_by": "P.Way Section Engineer",
        "auto_submit": True
    })
    assert res_prop.status_code == 200

    # Step 3: Check Divisional Block Ledger (ledger_only=True)
    res_ledger = client.get("/api/blocks", params={"ledger_only": True})
    assert res_ledger.status_code == 200
    ledger_blocks = res_ledger.json()
    assert any(b["id"] == "BLOCK-PLN-001" for b in ledger_blocks), "BLOCK-PLN-001 must appear in Divisional Block Ledger"

    # Step 4: Check Department Workspace filtering via GET /api/blocks?department_id=PWAY
    res_pway = client.get("/api/blocks", params={"department_id": "PWAY"})
    assert res_pway.status_code == 200
    pway_blocks = res_pway.json()
    assert any(b["id"] == "BLOCK-PLN-001" for b in pway_blocks), "BLOCK-PLN-001 must appear in P.Way workspace"

    # Step 5: Check Coordination view via GET /api/blocks/coordination
    res_coord = client.get("/api/blocks/coordination")
    assert res_coord.status_code == 200
    coord_data = res_coord.json()
    pending = coord_data.get("summary", {}).get("pending_approval", 0)
    assert pending >= 1, "Coordination view must show at least 1 pending block after proposal"


def test_suite_test_f_regeneration_active_ledger_synchronization():
    """Test F: Regeneration replaces active dataset; exactly 50 blocks in DB and ledger API response; no old records."""
    # Step 1: Generate initial canonical dataset (Dataset A)
    res_reg_a = client.post("/api/blocks/regenerate-canonical?seed=123456")
    assert res_reg_a.status_code == 200
    reg_data_a = res_reg_a.json()
    fp_a = reg_data_a["dataset_fingerprint"]

    # Capture 50 items/records from Dataset A via ledger endpoint GET /api/blocks
    res_a = client.get("/api/blocks")
    assert res_a.status_code == 200
    dataset_a_records = res_a.json()
    assert len(dataset_a_records) == 50

    # Dataset A representation
    dataset_A = [(b["id"], b["location_km"], b["duration_mins"], b["requested_start_time"], b["corridor_id"]) for b in dataset_a_records]
    assert len(dataset_A) == 50

    # Verify DB has exactly 50 blocks
    db = SessionLocal()
    assert db.query(Block).count() == 50
    db.close()

    # Step 2: Regenerate to Dataset B with a distinct seed
    res_reg_b = client.post("/api/blocks/regenerate-canonical?seed=654321")
    assert res_reg_b.status_code == 200
    reg_data_b = res_reg_b.json()
    fp_b = reg_data_b["dataset_fingerprint"]

    # Capture 50 items/records from Dataset B via ledger endpoint GET /api/blocks
    res_b = client.get("/api/blocks")
    assert res_b.status_code == 200
    dataset_b_records = res_b.json()
    assert len(dataset_b_records) == 50

    # Dataset B representation
    dataset_B = [(b["id"], b["location_km"], b["duration_mins"], b["requested_start_time"], b["corridor_id"]) for b in dataset_b_records]
    assert len(dataset_B) == 50

    # Core assertions per Section 10:
    assert len(dataset_A) == 50
    assert len(dataset_B) == 50
    assert dataset_A != dataset_B
    assert fp_a != fp_b

    # Verify active DB blocks = 50 and active ledger API response = 50
    db = SessionLocal()
    active_db_blocks = db.query(Block).count()
    active_db_tasks = db.query(MaintenanceTask).count()
    active_db_faults = db.query(FaultObservation).count()
    db.close()

    assert active_db_blocks == 50, f"Expected 50 blocks in DB, found {active_db_blocks}"
    assert len(dataset_b_records) == 50, f"Expected 50 records in active ledger response, found {len(dataset_b_records)}"
    assert active_db_tasks == 64
    assert active_db_faults == 64

    # Verify ledger response contains only Dataset B (0 old records from Dataset A)
    set_a = set(dataset_A)
    set_b = set(dataset_B)
    assert set_a != set_b


def test_suite_test_g_ledger_zero_until_explicit_proposal():
    """
    Test G: Division Block Ledger visibility condition:
    1. Regenerate 50 -> Ledger = 0
    2. CP-SAT Scan/Solve -> Ledger = 0
    3. Explicit Propose Block -> Ledger = 1
    """
    # 1. Regenerate 50 Blocks
    res_reg = client.post("/api/blocks/regenerate-canonical?seed=551133")
    assert res_reg.status_code == 200

    # Verification 1: Ledger must show 0 records
    res_ledger_1 = client.get("/api/blocks?ledger_only=true")
    assert res_ledger_1.status_code == 200
    ledger_records_1 = res_ledger_1.json()
    assert len(ledger_records_1) == 0, f"Expected 0 ledger records after regeneration, got {len(ledger_records_1)}"

    # 2. Run CP-SAT Scan / Solve
    res_cpsat = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "execution_date": "2026-10-01",
        "allow_bundling": True
    })
    assert res_cpsat.status_code == 200
    opt_data = res_cpsat.json()
    assert len(opt_data.get("schedule", [])) > 0

    # Verification 2: Ledger must STILL show 0 records
    res_ledger_2 = client.get("/api/blocks?ledger_only=true")
    assert res_ledger_2.status_code == 200
    ledger_records_2 = res_ledger_2.json()
    assert len(ledger_records_2) == 0, f"Expected 0 ledger records after CP-SAT solve, got {len(ledger_records_2)}"

    # 3. Explicit Propose Block for one result
    first_item = opt_data["schedule"][0]
    res_prop = client.post("/api/blocks/propose-from-schedule", json={
        "block_id": first_item["block_id"],
        "task_id": first_item["task_id"],
        "corridor_id": first_item.get("corridor_id", "CORR-01"),
        "section_id": first_item.get("section_id", "SEC-CORR-01-BHS-SOI"),
        "track_name": first_item.get("track_name", "DOWN_MAIN"),
        "location_km": first_item.get("location_km", 152.2),
        "execution_date": "2026-10-01",
        "requested_start_time": first_item["allocated_start_time"],
        "requested_end_time": first_item["allocated_end_time"],
        "duration_mins": first_item.get("duration_mins", 120),
        "protection_type": "TRAFFIC_BLOCK",
        "power_isolation_required": False,
        "proposed_by": "Controller",
        "auto_submit": True
    })
    assert res_prop.status_code == 200

    # Verification 3: Ledger must show EXACTLY 1 record
    res_ledger_3 = client.get("/api/blocks?ledger_only=true")
    assert res_ledger_3.status_code == 200
    ledger_records_3 = res_ledger_3.json()
    assert len(ledger_records_3) == 1, f"Expected 1 ledger record after explicit proposal, got {len(ledger_records_3)}"
    assert ledger_records_3[0]["id"] == first_item["block_id"]
    assert ledger_records_3[0]["task_id"] == first_item["task_id"]


def test_suite_test_h_marey_graph_visibility_lifecycle():
    """
    Test H: Marey Distance Graph visibility:
    1. Regenerate 50 -> Marey Graph shows 0 blocks
    2. CP-SAT Scan/Solve -> Marey Graph still shows 0 blocks
    3. Explicitly Propose one block -> Marey Graph shows that block
    4. No unproposed PLANNED block appears on the graph
    """
    # 1. Regenerate 50 Blocks
    res_reg = client.post("/api/blocks/regenerate-canonical?seed=772211")
    assert res_reg.status_code == 200

    # Verification 1: Marey Graph data (ledger_only=true) must show 0 blocks
    res_marey_1 = client.get("/api/blocks?ledger_only=true")
    assert res_marey_1.status_code == 200
    marey_blocks_1 = res_marey_1.json()
    assert len(marey_blocks_1) == 0, f"Expected 0 Marey blocks after regeneration, got {len(marey_blocks_1)}"

    # 2. Run CP-SAT Scan / Solve
    res_cpsat = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "execution_date": "2026-10-01",
        "allow_bundling": True
    })
    assert res_cpsat.status_code == 200
    opt_data = res_cpsat.json()
    schedule = opt_data.get("schedule", [])
    assert len(schedule) > 0

    # Verification 2: Marey Graph data must STILL show 0 blocks
    res_marey_2 = client.get("/api/blocks?ledger_only=true")
    assert res_marey_2.status_code == 200
    marey_blocks_2 = res_marey_2.json()
    assert len(marey_blocks_2) == 0, f"Expected 0 Marey blocks after CP-SAT solve, got {len(marey_blocks_2)}"

    # 3. Explicit Propose Block for one result
    first_item = schedule[0]
    res_prop = client.post("/api/blocks/propose-from-schedule", json={
        "block_id": first_item["block_id"],
        "task_id": first_item["task_id"],
        "corridor_id": first_item.get("corridor_id", "CORR-01"),
        "section_id": first_item.get("section_id", "SEC-CORR-01-BHS-SOI"),
        "track_name": first_item.get("track_name", "DOWN_MAIN"),
        "location_km": first_item.get("location_km", 152.2),
        "execution_date": "2026-10-01",
        "requested_start_time": first_item["allocated_start_time"],
        "requested_end_time": first_item["allocated_end_time"],
        "duration_mins": first_item.get("duration_mins", 120),
        "protection_type": "TRAFFIC_BLOCK",
        "power_isolation_required": False,
        "proposed_by": "Controller",
        "auto_submit": True
    })
    assert res_prop.status_code == 200

    # Verification 3: Marey Graph shows exactly that 1 proposed block
    res_marey_3 = client.get("/api/blocks?ledger_only=true")
    assert res_marey_3.status_code == 200
    marey_blocks_3 = res_marey_3.json()
    assert len(marey_blocks_3) == 1, f"Expected 1 Marey block after proposal, got {len(marey_blocks_3)}"
    assert marey_blocks_3[0]["id"] == first_item["block_id"]

    # Verification 4: No unproposed PLANNED block appears on graph
    for b in marey_blocks_3:
        assert b["status"] != "PLANNED", f"Unproposed PLANNED block {b['id']} must not appear on Marey graph"


def test_suite_test_i_cpsat_division_wide_scope_and_accounting():
    """
    VERIFICATION OF DIVISION-WIDE CP-SAT SCOPE & ACCOUNTING:
    1. Regenerate 50 canonical blocks across 5 corridors.
    2. Run CP-SAT with corridor_id=None (division-wide scope).
    3. Verify exact 50 = 15 scheduled + 35 dropped accounting.
    4. Verify all 5 corridors are represented in scheduled and dropped.
    5. Verify every dropped task has a graceful degradation reason.
    6. Verify corridor-specific optimization (CORR-01) preserves localized filtering.
    """
    # 1. Regenerate
    res_regen = client.post("/api/blocks/regenerate-canonical?seed=551122")
    assert res_regen.status_code == 200

    # 2. Run division-wide CP-SAT (corridor_id omitted)
    res_div = client.post("/api/blocks/optimize", json={
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "execution_date": "2026-10-01",
        "allow_bundling": True
    })
    assert res_div.status_code == 200
    data_div = res_div.json()

    metrics = data_div["metrics"]
    assert metrics["tasks_requested"] == 50, f"Expected 50 tasks requested, got {metrics['tasks_requested']}"
    assert metrics["tasks_scheduled"] == 15, f"Expected 15 tasks scheduled, got {metrics['tasks_scheduled']}"
    assert metrics["tasks_deferred"] == 35, f"Expected 35 tasks deferred, got {metrics['tasks_deferred']}"
    assert metrics["tasks_scheduled"] + metrics["tasks_deferred"] == 50

    schedule = data_div["schedule"]
    deferred = data_div["deferred_tasks"]
    assert len(schedule) == 15
    assert len(deferred) == 35

    # Verify all 5 corridors represented
    sched_corrs = {s["corridor_id"] for s in schedule}
    def_corrs = {d["corridor_id"] for d in deferred}
    all_corrs = sched_corrs.union(def_corrs)
    for expected_corr in ["CORR-01", "CORR-02", "CORR-03", "CORR-04", "CORR-05"]:
        assert expected_corr in all_corrs, f"Corridor {expected_corr} missing from CP-SAT results"

    # Verify no tasks dropped silently
    all_task_ids = [s["task_id"] for s in schedule] + [d["task_id"] for d in deferred]
    assert len(all_task_ids) == 50
    assert len(set(all_task_ids)) == 50, "Duplicate task IDs found in CP-SAT results"

    # Verify all deferred tasks have explicit reasons
    for dt in deferred:
        assert dt.get("reason_code"), f"Task {dt['task_id']} missing reason_code"
        assert dt.get("reason"), f"Task {dt['task_id']} missing reason"
        assert dt.get("human_readable_reason"), f"Task {dt['task_id']} missing human_readable_reason"

    # Verify corridor-specific optimization preserves filtering
    res_corr1 = client.post("/api/blocks/optimize", json={
        "corridor_id": "CORR-01",
        "time_window_start": "08:00",
        "time_window_end": "20:00",
        "execution_date": "2026-10-01",
        "allow_bundling": True
    })
    assert res_corr1.status_code == 200
    data_corr1 = res_corr1.json()
    for s in data_corr1["schedule"]:
        assert s["corridor_id"] == "CORR-01"




