"""
Comprehensive End-to-End Workflow Acceptance Tests
KrayaSetu AI — Verification of:
TEST A: Before submission — Divisional Block Ledger, Operational Views, Departments = EMPTY / not shown
TEST B: Submit Proposed Block — Only THAT block transitions into Divisional Block Ledger (count = 1), no duplicates, other 49 remain invisible
TEST C: COBO/SOBO Approval + Sanction — Block becomes visible in Joint Coordination, Master Network, Station Master, Loco Pilot, and Department
TEST D: Shadow Block Propagation — Tri-department Shadow Block (PWAY + TRD + SNT) approved/sanctioned by COBO:
        - Parent block remains ONE block
        - P.Way workspace sees its child task
        - TRD workspace sees its child task
        - S&T workspace sees its child task
        - All child tasks have status APPROVED
TEST E: Department Log — Senior Divisional Engineer confirms a defect/task:
        - Task is marked APPROVED/CONFIRMED
        - Appears in department activity log with correct department, actor, and status
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from scripts.populate_four_block_dataset import populate_four_block_dataset

client = TestClient(app)


def setup_function():
    """Reset dataset before each test."""
    populate_four_block_dataset()


def test_end_to_end_workflow():
    # -------------------------------------------------------------
    # TEST A — BEFORE SUBMISSION
    # -------------------------------------------------------------
    # 1. Divisional Block Ledger must be EMPTY (0 records)
    res_ledger = client.get("/api/blocks", params={"ledger_only": True})
    assert res_ledger.status_code == 200
    assert len(res_ledger.json()) == 0, f"Expected 0 ledger blocks, got {len(res_ledger.json())}"

    # 2. Joint Coordination must have 0 pending blocks (all 50 are raw PROPOSED)
    res_coord = client.get("/api/blocks/coordination")
    assert res_coord.status_code == 200
    assert len(res_coord.json()["pending_approval"]) == 0
    assert len(res_coord.json()["approved"]) == 0

    # 3. Operational views (Master Network, Station Master, Loco Pilot) must see 0 blocks
    res_op = client.get("/api/blocks", params={"operational_only": True})
    assert res_op.status_code == 200
    assert len(res_op.json()) == 0

    # 4. Department workspaces must see 0 operational blocks
    for dept in ["PWAY", "TRD", "SNT"]:
        res_dept = client.get("/api/blocks", params={"department_id": dept, "operational_only": True})
        assert res_dept.status_code == 200
        assert len(res_dept.json()) == 0, f"Department {dept} should see 0 operational blocks before approval, got {len(res_dept.json())}"

    # -------------------------------------------------------------
    # TEST B — SUBMIT PROPOSED BLOCK
    # -------------------------------------------------------------
    # Pick a specific proposed planned block: BLOCK-PLN-001 with task TASK-PLN-001
    target_block_id = "BLOCK-PLN-001"
    target_task_id = "TASK-PLN-001"

    # Submit the proposed block
    submit_res = client.post(f"/api/blocks/{target_block_id}/submit", json={
        "actor": "P.Way Section Engineer (BHS)",
        "role": "ENGINEER",
        "notes": "Submitted proposed block for divisional clearance",
    })
    assert submit_res.status_code == 200
    assert submit_res.json()["new_status"] == "PENDING_APPROVAL"

    # Divisional Block Ledger must now show EXACTLY 1 record (BLOCK-PLN-001)
    res_ledger_b = client.get("/api/blocks", params={"ledger_only": True})
    assert res_ledger_b.status_code == 200
    ledger_blocks = res_ledger_b.json()
    assert len(ledger_blocks) == 1, f"Expected exactly 1 block in ledger after submission, got {len(ledger_blocks)}"
    assert ledger_blocks[0]["id"] == target_block_id
    assert ledger_blocks[0]["status"] == "PENDING_APPROVAL"

    # The other 49 records must NOT appear in the ledger
    all_blocks = client.get("/api/blocks").json()
    assert len(all_blocks) == 50, "Total blocks in DB must remain 50 (NO DUPLICATES)"
    other_proposed = [b for b in all_blocks if b["id"] != target_block_id]
    assert all(b["status"] in ["PLANNED", "PROPOSED"] for b in other_proposed)

    # Operational views must STILL see 0 blocks (not yet approved)
    res_op_b = client.get("/api/blocks", params={"operational_only": True})
    assert len(res_op_b.json()) == 0

    # -------------------------------------------------------------
    # TEST C — COBO/SOBO APPROVAL + SANCTION
    # -------------------------------------------------------------
    # Approve block as Chief of Block Officer
    approve_res = client.post(f"/api/blocks/{target_block_id}/approve", json={
        "actor": "Chief of Block Officer (COA / Bhopal)",
        "role": "CHIEF_OF_BLOCK_OFFICER",
        "notes": "Sanctioned at Joint Coordination Desk",
    })
    assert approve_res.status_code == 200
    assert approve_res.json()["new_status"] == "APPROVED"

    # Now it IS operationally visible (Master Network, Station Master, Loco Pilot)
    res_op_c = client.get("/api/blocks", params={"operational_only": True})
    assert res_op_c.status_code == 200
    op_ids = [b["id"] for b in res_op_c.json()]
    assert target_block_id in op_ids
    assert len(op_ids) == 1  # Only the approved block, NOT the other 49

    # Joint Coordination Desk shows it in approved list
    res_coord_c = client.get("/api/blocks/coordination").json()
    assert any(b["id"] == target_block_id for b in res_coord_c["approved"])

    # Relevant department (PWAY) can see it operationally
    res_pway_c = client.get("/api/blocks", params={"department_id": "PWAY", "operational_only": True}).json()
    assert any(b["id"] == target_block_id for b in res_pway_c)


def test_shadow_block_propagation():
    # -------------------------------------------------------------
    # TEST D — SHADOW BLOCK TRI-DEPARTMENT PROPAGATION
    # -------------------------------------------------------------
    # Pick a tri-department Shadow Block: BLOCK-SHD-001
    # Tasks: TASK-SHD-01-1 (PWAY), TASK-SHD-01-2 (TRD), TASK-SHD-01-3 (SNT)
    shadow_id = "BLOCK-SHD-001"

    # 1. Before approval, TRD, SNT, PWAY see 0 operational blocks
    for dept in ["PWAY", "TRD", "SNT"]:
        res_pre = client.get("/api/blocks", params={"department_id": dept, "operational_only": True}).json()
        assert not any(b["id"] == shadow_id for b in res_pre)

    # 2. Submit the Shadow Block
    sub_res = client.post(f"/api/blocks/{shadow_id}/submit", json={
        "actor": "Joint Coordination Cell",
        "role": "ENGINEER",
        "notes": "Joint shadow possession submission",
    })
    assert sub_res.status_code == 200

    # 3. COBO Approves & Sanctions the Shadow Block
    appr_res = client.post(f"/api/blocks/{shadow_id}/approve", json={
        "actor": "Chief of Block Officer (COA / Bhopal)",
        "role": "CHIEF_OF_BLOCK_OFFICER",
        "notes": "Sanctioned multi-department shadow block",
    })
    assert appr_res.status_code == 200

    # 4. Verify the Parent Shadow Block remains ONE block
    all_blocks = client.get("/api/blocks").json()
    shadow_instances = [b for b in all_blocks if b["id"] == shadow_id]
    assert len(shadow_instances) == 1, "Shadow Block must remain ONE parent block (no duplicate blocks created)"
    sb = shadow_instances[0]
    assert sb["status"] == "APPROVED"
    assert sb["block_type"] == "SHADOW"

    # 5. P.Way workspace query must find the Shadow Block and its PWAY task
    res_pway = client.get("/api/blocks", params={"department_id": "PWAY", "operational_only": True}).json()
    pway_match = [b for b in res_pway if b["id"] == shadow_id]
    assert len(pway_match) == 1, "P.Way workspace must see the sanctioned Shadow Block"
    pway_tasks = [t["id"] for t in pway_match[0]["tasks"] if t["department_id"] == "PWAY"]
    assert "TASK-SHD-01-1" in pway_tasks

    # 6. TRD/OHE workspace query must find the Shadow Block and its TRD task
    res_trd = client.get("/api/blocks", params={"department_id": "TRD", "operational_only": True}).json()
    trd_match = [b for b in res_trd if b["id"] == shadow_id]
    assert len(trd_match) == 1, "TRD workspace must see the sanctioned Shadow Block"
    trd_tasks = [t["id"] for t in trd_match[0]["tasks"] if t["department_id"] == "TRD"]
    assert "TASK-SHD-01-2" in trd_tasks

    # 7. S&T workspace query must find the Shadow Block and its SNT task
    res_snt = client.get("/api/blocks", params={"department_id": "SNT", "operational_only": True}).json()
    snt_match = [b for b in res_snt if b["id"] == shadow_id]
    assert len(snt_match) == 1, "S&T workspace must see the sanctioned Shadow Block"
    snt_tasks = [t["id"] for t in snt_match[0]["tasks"] if t["department_id"] == "SNT"]
    assert "TASK-SHD-01-3" in snt_tasks

    # 8. All child tasks must have status == "APPROVED"
    all_child_tasks = pway_match[0]["tasks"]
    for t in all_child_tasks:
        # Check in DB
        res_t = client.get(f"/api/maintenance/tasks")
        matching = [x for x in res_t.json() if x["id"] == t["id"]]
        if matching:
            assert matching[0]["status"] == "APPROVED", f"Task {t['id']} must have status APPROVED"


def test_department_activity_log():
    # -------------------------------------------------------------
    # TEST E — DEPARTMENT ACTIVITY LOG & TASK CONFIRMATION
    # -------------------------------------------------------------
    # Senior Divisional Engineer confirms a fault/task
    fault_res = client.get("/api/maintenance/faults").json()
    assert len(fault_res) > 0
    pway_fault = [f for f in fault_res if f["department_id"] == "PWAY"][0]

    dec_res = client.post("/api/maintenance/approve", json={
        "fault_id": pway_fault["id"],
        "decision": "CONFIRMED",
        "decided_by": "Senior Divisional Engineer (Operating/Civil)",
        "notes": "Verified rail profile safety and sanctioned immediate correction work",
    })
    assert dec_res.status_code == 200

    # Query events for PWAY department
    events_res = client.get("/api/events", params={"department_id": "PWAY"}).json()
    assert len(events_res) > 0

    # Verify the confirmed task appears in P.Way logs
    expected_task_id = f"TASK-{pway_fault['id'].replace('FAULT-', '')}"
    task_events = [e for e in events_res if e["entity_id"] == expected_task_id or e.get("task_id") == expected_task_id]
    assert len(task_events) >= 1, f"Task {expected_task_id} must appear in P.Way activity log"
    ev = task_events[0]
    assert ev["actor"] == "Senior Divisional Engineer (Operating/Civil)"
    assert ev["action"] in ["TASK_CONFIRMED", "TASK_APPROVED"]
    assert ev["new_state"] == "APPROVED"
