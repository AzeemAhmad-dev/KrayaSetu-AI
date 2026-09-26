import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.maintenance import Block, MaintenanceTask

client = TestClient(app)

def test_task_completion_independence():
    """Verify that completing an individual task does NOT mark the overall block as COMPLETED."""
    db = SessionLocal()
    try:
        # Find a shadow block
        shadow_block = db.query(Block).filter(Block.block_type == "SHADOW").first()
        assert shadow_block is not None, "Shadow block should exist"
        initial_block_status = shadow_block.status

        # Find one associated task for this block
        task = db.query(MaintenanceTask).filter(MaintenanceTask.block_id == shadow_block.id).first()
        if not task:
            task = db.query(MaintenanceTask).filter(MaintenanceTask.id == shadow_block.task_id).first()
        assert task is not None, "Associated task should exist"

        # Complete the individual task via API
        res = client.post(f"/api/maintenance/tasks/{task.id}/complete", json={
            "completed_by": "Test Engineer (S&T)",
            "notes": "Point machine calibration completed"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"
        assert data["new_status"] == "COMPLETED"
        assert data["completed_at"] is not None

        # Verify task in DB
        db.refresh(task)
        assert task.status == "COMPLETED"
        assert task.completed_at is not None

        # Verify parent block status is UNCHANGED
        db.refresh(shadow_block)
        assert shadow_block.status == initial_block_status, f"Parent block status should remain {initial_block_status}, not COMPLETED"

        # Verify GET /api/maintenance/completed-tasks
        completed_res = client.get("/api/maintenance/completed-tasks")
        assert completed_res.status_code == 200
        completed_list = completed_res.json()
        matching = [t for t in completed_list if t["id"] == task.id]
        assert len(matching) > 0
        assert matching[0]["status"] == "COMPLETED"
        assert matching[0]["block_id"] == shadow_block.id
        assert matching[0]["completed_at"] is not None

        # Verify GET /api/blocks returns the shadow block with all tasks and task status preserved
        blocks_res = client.get(f"/api/blocks?block_type=SHADOW")
        assert blocks_res.status_code == 200
        blocks_data = blocks_res.json()
        target_block = next((b for b in blocks_data if b["id"] == shadow_block.id), None)
        assert target_block is not None
        assert len(target_block["tasks"]) >= 2
        # Check that the completed task has status COMPLETED and completed_at in target_block["tasks"]
        target_task_in_block = next((t for t in target_block["tasks"] if t["id"] == task.id), None)
        assert target_task_in_block is not None
        assert target_task_in_block["status"] == "COMPLETED"
        assert target_task_in_block["completed_at"] is not None

    finally:
        db.close()
