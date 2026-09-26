from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.events import EventLog
from backend.app.models.maintenance import MaintenanceTask, Block, FaultObservation

router = APIRouter(tags=["Events"])

@router.get("/events")
def get_events(
    limit: int = 100,
    entity: Optional[str] = None,
    department_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(EventLog)
    if entity:
        query = query.filter(EventLog.entity == entity.upper())

    if department_id:
        dept = department_id.upper()
        # Find all task IDs for this department
        dept_task_ids = [t[0] for t in db.query(MaintenanceTask.id).filter(MaintenanceTask.department_id == dept).all()]
        # Find all fault IDs for this department
        dept_fault_ids = [f[0] for f in db.query(FaultObservation.id).filter(FaultObservation.department_id == dept).all()]
        # Find all block IDs for this department (primary or child tasks)
        dept_blocks_1 = [b[0] for b in db.query(Block.id).join(MaintenanceTask, Block.task_id == MaintenanceTask.id).filter(MaintenanceTask.department_id == dept).all()]
        dept_blocks_2 = [b[0] for b in db.query(Block.id).filter(Block.approval_notes.like(f'%"{dept}"%')).all()]
        dept_blocks_3 = [t[0] for t in db.query(MaintenanceTask.block_id).filter(MaintenanceTask.department_id == dept, MaintenanceTask.block_id != None).all()]
        all_dept_entities = set(dept_task_ids + dept_fault_ids + dept_blocks_1 + dept_blocks_2 + dept_blocks_3)

        dept_filters = [
            EventLog.reason.like(f"%{dept}%"),
            EventLog.actor.like(f"%{dept}%"),
        ]
        if all_dept_entities:
            dept_filters.append(EventLog.entity_id.in_(list(all_dept_entities)))

        query = query.filter(or_(*dept_filters))

    events = query.order_by(EventLog.timestamp.desc()).limit(limit).all()

    # Pre-fetch tasks and blocks to enrich events with task_id, block_id, department_id
    task_map = {t.id: t for t in db.query(MaintenanceTask).all()}
    block_map = {b.id: b for b in db.query(Block).all()}

    results = []
    for e in events:
        dept_val = department_id
        blk_id = None
        task_id = None

        if e.entity == "TASK":
            task_id = e.entity_id
            t = task_map.get(e.entity_id)
            if t:
                dept_val = t.department_id
                blk_id = t.block_id
        elif e.entity == "BLOCK":
            blk_id = e.entity_id
            b = block_map.get(e.entity_id)
            if b:
                task_id = b.task_id
                if b.task and b.task.department_id:
                    dept_val = b.task.department_id
        elif e.entity == "FAULT":
            task_id = f"TASK-{e.entity_id.replace('FAULT-', '')}"

        results.append({
            "id": e.id,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "actor": e.actor,
            "role": e.role,
            "entity": e.entity,
            "entity_id": e.entity_id,
            "task_id": task_id,
            "block_id": blk_id,
            "department_id": dept_val,
            "action": e.action,
            "previous_state": e.previous_state,
            "new_state": e.new_state,
            "reason": e.reason,
            "provenance": e.provenance
        })

    return results
