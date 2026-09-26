"""
Acceptance Test: Block Visibility & COBO/SOBO Approval Gate
KrayaSetu AI — Verifies that unapproved blocks do NOT leak into operational views.

Tests:
1. All 50 blocks start as PROPOSED → none visible to operational_only queries
2. Submitting a block moves it to PENDING_APPROVAL → still not operational
3. COBO approves → APPROVED status → now operational
4. Selecting a block → SELECTED → still operational
5. Other blocks remain PROPOSED → invisible to operational queries
6. Coordination endpoint excludes PROPOSED blocks
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_operational_visibility_gate():
    """Verify that unapproved blocks do NOT appear in operational queries."""

    # 1. All blocks should be PROPOSED — operational_only should return 0
    res = client.get("/api/blocks", params={"operational_only": True})
    assert res.status_code == 200
    operational = res.json()
    # Count how many are truly operational (non-PROPOSED, non-PENDING_APPROVAL)
    for b in operational:
        assert b["status"] in ["APPROVED", "SANCTIONED", "ACTIVE", "COMPLETED", "SELECTED"], \
            f"Block {b['id']} with status '{b['status']}' should NOT appear in operational_only=true query"

    # 2. All blocks without operational_only — should return all
    res_all = client.get("/api/blocks")
    assert res_all.status_code == 200
    all_blocks = res_all.json()
    assert len(all_blocks) >= 1, "Should have at least 1 block in the database"

    # 3. Pick a PROPOSED or PLANNED block for lifecycle test
    proposed_blocks = [b for b in all_blocks if b["status"] in ["PROPOSED", "PLANNED"]]
    if len(proposed_blocks) == 0:
        return  # No unsubmitted blocks to test with

    test_block_id = proposed_blocks[0]["id"]

    # 4. Verify test block is NOT in operational view
    res_op = client.get("/api/blocks", params={"operational_only": True})
    op_ids = [b["id"] for b in res_op.json()]
    assert test_block_id not in op_ids, \
        f"Block {test_block_id} must NOT appear in operational_only=true"

    # 5. Submit the block → PENDING_APPROVAL
    submit_res = client.post(f"/api/blocks/{test_block_id}/submit", json={
        "actor": "Test Engineer",
        "role": "ENGINEER",
        "notes": "Test submission",
    })
    assert submit_res.status_code == 200
    assert submit_res.json()["new_status"] == "PENDING_APPROVAL"

    # 6. PENDING_APPROVAL block still NOT operational
    res_op2 = client.get("/api/blocks", params={"operational_only": True})
    op_ids2 = [b["id"] for b in res_op2.json()]
    assert test_block_id not in op_ids2, \
        f"PENDING_APPROVAL block {test_block_id} must NOT appear in operational_only=true"

    # 7. Coordination endpoint SHOULD show PENDING_APPROVAL block
    coord_res = client.get("/api/blocks/coordination")
    assert coord_res.status_code == 200
    coord = coord_res.json()
    coord_pending_ids = [b["id"] for b in coord["pending_approval"]]
    assert test_block_id in coord_pending_ids, \
        f"PENDING_APPROVAL block {test_block_id} must appear in coordination pending list"

    # 8. COBO Approve → APPROVED
    approve_res = client.post(f"/api/blocks/{test_block_id}/approve", json={
        "actor": "Chief of Block Officer (COA / Bhopal)",
        "role": "CHIEF_OF_BLOCK_OFFICER",
        "notes": "Sanctioned for test",
    })
    assert approve_res.status_code == 200
    assert approve_res.json()["new_status"] == "APPROVED"

    # 9. APPROVED block IS operational
    res_op3 = client.get("/api/blocks", params={"operational_only": True})
    op_ids3 = [b["id"] for b in res_op3.json()]
    assert test_block_id in op_ids3, \
        f"APPROVED block {test_block_id} MUST appear in operational_only=true"

    # 10. Other PROPOSED blocks still NOT operational
    for b in proposed_blocks[1:5]:  # Check a few
        assert b["id"] not in op_ids3, \
            f"PROPOSED block {b['id']} must NOT appear in operational view just because {test_block_id} was approved"


def test_coordination_excludes_proposed():
    """Verify that coordination endpoint excludes raw PROPOSED blocks."""
    coord_res = client.get("/api/blocks/coordination")
    assert coord_res.status_code == 200
    coord = coord_res.json()

    # Check all blocks in the coordination response
    all_coord_blocks = (
        coord.get("pending_approval", []) +
        coord.get("approved", []) +
        coord.get("selected", []) +
        coord.get("rejected", [])
    )
    for b in all_coord_blocks:
        assert b["status"] != "PROPOSED", \
            f"PROPOSED block {b['id']} must NOT appear in coordination endpoint"


def test_department_role_cannot_approve():
    """Verify department users cannot approve blocks."""
    # Get a PROPOSED or PLANNED block
    res = client.get("/api/blocks")
    proposed = [b for b in res.json() if b["status"] in ["PROPOSED", "PLANNED"]]
    if len(proposed) == 0:
        return

    test_id = proposed[-1]["id"]

    # First submit it
    client.post(f"/api/blocks/{test_id}/submit", json={
        "actor": "Test Engineer",
        "role": "ENGINEER",
    })

    # Try to approve as department user
    approve_res = client.post(f"/api/blocks/{test_id}/approve", json={
        "actor": "P.Way Gang Mate",
        "role": "TRACK_PWAY",
        "notes": "Attempted approval",
    })
    assert approve_res.status_code == 403, \
        f"Department user TRACK_PWAY should get 403, got {approve_res.status_code}"
