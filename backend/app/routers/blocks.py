import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import case
from datetime import datetime
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.maintenance import Block, MaintenanceTask
from backend.app.models.network import Section, Corridor
from backend.app.models.trains import TrainMovement
from backend.app.schemas.api_schemas import (
    BlockProposalRequest,
    BlockApprovalRequest,
    BlockActionRequest,
    ProposalFromScheduleRequest,
    OptimizeRequest,
)
from backend.app.services.conflict_engine import conflict_engine
from backend.app.services.optimizer import block_optimizer
from backend.app.services.event_logger import log_event
from backend.app.services.candidate_generator import candidate_generator
from backend.app.services.explanation_service import explanation_service

router = APIRouter(tags=["Blocks"])


def serialize_block(b: Block, db: Optional[Session] = None) -> dict:
    dept = b.task.department_id if (b.task and b.task.department_id) else "PWAY"
    priority = b.task.priority if b.task else "MEDIUM"
    work_type = b.task.work_type_id if b.task else None
    task_title = (
        b.task.fault.description if (b.task and b.task.fault and b.task.fault.description)
        else (b.task.work_type_id if b.task else "Scheduled Track Maintenance")
    )

    # Multi-department coordination metadata
    dept_list = [dept]

    # Check approval_notes for genuine multi-department / bundled tasks
    if b.approval_notes:
        try:
            notes_data = json.loads(b.approval_notes)
            if isinstance(notes_data, dict):
                for d in notes_data.get("departments", []):
                    if d and d not in dept_list:
                        dept_list.append(d)
                bundled_ids = notes_data.get("bundled_tasks", [])
                if db and bundled_ids:
                    for bt in db.query(MaintenanceTask).filter(MaintenanceTask.id.in_(bundled_ids)).all():
                        if bt.department_id and bt.department_id not in dept_list:
                            dept_list.append(bt.department_id)
        except Exception:
            pass

    # NOTE: Do NOT add TRD simply because power_isolation_required is True.
    # Power isolation is an electrical coordination/safety requirement, not a maintenance task.

    dept_names = {
        "PWAY": "P.Way (Civil)",
        "TRD": "TRD (25kV OHE)",
        "SNT": "S&T (Signaling)",
    }
    is_multi = len(dept_list) > 1
    participating_str = " + ".join([dept_names.get(d, d) for d in dept_list])
    trd_coord = bool(b.power_isolation_required)

    sec_name = b.section_id
    corr_name = b.corridor_id
    from_stn = None
    to_stn = None
    stn_codes = []

    if db:
        if b.section_id:
            sec = db.query(Section).filter(Section.id == b.section_id).first()
            if sec:
                sec_name = sec.name
                from_stn = sec.from_station_code
                to_stn = sec.to_station_code
                if from_stn:
                    stn_codes.append(from_stn)
                if to_stn and to_stn not in stn_codes:
                    stn_codes.append(to_stn)
        if b.corridor_id:
            corr = db.query(Corridor).filter(Corridor.id == b.corridor_id).first()
            if corr:
                corr_name = corr.name

    # Fallback station codes from section_id if not resolved
    if not stn_codes and b.section_id:
        parts = b.section_id.split("-")
        if len(parts) >= 4:
            stn_codes = [parts[-2], parts[-1]]
            from_stn = parts[-2]
            to_stn = parts[-1]

    created_dt = b.created_at or datetime.utcnow()
    date_str = created_dt.strftime("%Y-%m-%d")
    month_str = created_dt.strftime("%B %Y")
    week_str = f"Week {created_dt.isocalendar()[1]}"

    return {
        "id": b.id,
        "task_id": b.task_id,
        "task_title": task_title,
        "task_priority": priority,
        "department_id": dept,
        "departments": dept_list,
        "is_multi_department": is_multi,
        "participating_departments": participating_str,
        "work_type_name": work_type,
        "corridor_id": b.corridor_id,
        "corridor_name": corr_name,
        "section_id": b.section_id,
        "section_name": sec_name,
        "from_station_code": from_stn,
        "to_station_code": to_stn,
        "station_codes": stn_codes,
        "date": date_str,
        "scheduled_date": date_str,
        "month": month_str,
        "week": week_str,
        "track_name": b.track_name,
        "location_km": b.location_km,
        "requested_start_time": b.requested_start_time,
        "requested_end_time": b.requested_end_time,
        "duration_mins": b.duration_mins,
        "status": b.status,
        "conflict_status": b.conflict_status,
        "conflict_summary": b.conflict_summary,
        "conflicting_trains": json.loads(b.conflicting_trains) if b.conflicting_trains else [],
        "protection_type": b.protection_type,
        "power_isolation_required": b.power_isolation_required,
        "trd_coordination_required": trd_coord,
        "assigned_machine": b.assigned_machine,
        "proposed_by": b.proposed_by,
        "approval_status": b.approval_status,
        "approved_by": b.approved_by,
        "approval_notes": b.approval_notes,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("/blocks")
def get_blocks(
    status: Optional[str] = None,
    corridor_id: Optional[str] = None,
    department_id: Optional[str] = None,
    section_id: Optional[str] = None,
    power_isolation_required: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    priority_order = case(
        (MaintenanceTask.priority == "CRITICAL", 1),
        (MaintenanceTask.priority == "HIGH", 2),
        (MaintenanceTask.priority == "MEDIUM", 3),
        (MaintenanceTask.priority == "LOW", 4),
        else_=5
    )

    query = db.query(Block).outerjoin(MaintenanceTask, Block.task_id == MaintenanceTask.id)
    if status:
        query = query.filter(Block.status == status)
    if corridor_id:
        query = query.filter(Block.corridor_id == corridor_id)
    if section_id:
        query = query.filter(Block.section_id == section_id)
    if power_isolation_required is not None:
        query = query.filter(Block.power_isolation_required == power_isolation_required)
    if department_id:
        if department_id == "TRD":
            query = query.filter((MaintenanceTask.department_id == "TRD") | (Block.approval_notes.like('%"TRD"%')))
        elif department_id == "PWAY":
            query = query.filter(
                (MaintenanceTask.department_id == "PWAY") |
                (Block.approval_notes.like('%"PWAY"%')) |
                (MaintenanceTask.department_id == None) |
                (Block.task_id == None)
            )
        elif department_id == "SNT":
            query = query.filter((MaintenanceTask.department_id == "SNT") | (Block.approval_notes.like('%"SNT"%')))
        else:
            query = query.filter((MaintenanceTask.department_id == department_id) | (Block.approval_notes.like(f'%"{department_id}"%')))

    blocks = query.order_by(priority_order, Block.created_at.desc()).all()
    return [serialize_block(b, db=db) for b in blocks]


@router.get("/blocks/coordination")
def get_blocks_coordination(db: Session = Depends(get_db)):
    """Provides structured multi-department coordination view (P-Way, S&T, TRD)."""
    blocks = db.query(Block).outerjoin(MaintenanceTask, Block.task_id == MaintenanceTask.id).all()
    serialized = [serialize_block(b, db=db) for b in blocks]

    pending = [b for b in serialized if b["status"] in ["PROPOSED", "PENDING_APPROVAL", "PLANNED"]]
    approved = [b for b in serialized if b["status"] == "APPROVED"]
    selected = [b for b in serialized if b["status"] == "SELECTED"]
    rejected = [b for b in serialized if b["status"] == "REJECTED"]
    re_plan = [b for b in serialized if b["status"] in ["RE_PLAN", "DEFERRED"]]

    by_dept = {
        "PWAY": [b for b in serialized if "PWAY" in b.get("departments", [b.get("department_id")])],
        "SNT": [b for b in serialized if "SNT" in b.get("departments", [b.get("department_id")])],
        "TRD": [b for b in serialized if "TRD" in b.get("departments", [b.get("department_id")]) or b.get("power_isolation_required")],
    }

    return {
        "summary": {
            "total_blocks": len(serialized),
            "pending_approval": len(pending),
            "approved": len(approved),
            "selected": len(selected),
            "rejected": len(rejected),
            "re_plan": len(re_plan),
        },
        "pending_approval": pending,
        "approved": approved,
        "selected": selected,
        "rejected": rejected,
        "by_department": by_dept,
    }


@router.get("/blocks/{block_id}")
def get_block_by_id(block_id: str, db: Session = Depends(get_db)):
    """Retrieve details of a specific maintenance block."""
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail=f"Block '{block_id}' not found")
    return serialize_block(block, db=db)


@router.get("/blocks/{block_id}/explanation")
def get_block_decision_explanation(block_id: str, db: Session = Depends(get_db)):
    """
    Phase 8 Explainable Decision Support:
    Answers all 5 Core Judge Questions for a specific block:
    1. Why was this maintenance task prioritized? (S-R-C-A-O framework & factor weights)
    2. Why were these tasks bundled into this block? (Geographic, track, protection & power isolation synergy)
    3. Why was this time window selected? (Solver feasibility, >=15 min safety headway)
    4. What train movements are affected? (Schedule-based impact, passenger vs freight, delay penalties)
    5. Why was another task deferred? (Operational capacity limits, higher-priority safety work)
    """
    res = explanation_service.explain_block_decision(block_id, db)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=404, detail=res.get("message"))
    return res


@router.post("/blocks/check-conflict")
def check_block_conflict(req: BlockProposalRequest, db: Session = Depends(get_db)):
    # Fetch active train movements
    movements = db.query(TrainMovement).all()
    mov_dicts = [
        {
            "train_number": m.train_number,
            "train_name": m.train.train_name if m.train else m.train_number,
            "train_type": m.train.train_type if m.train else "PASSENGER",
            "direction": m.direction,
            "current_track": m.current_track,
            "current_km": m.current_km,
            "scheduled_time": m.scheduled_time,
            "estimated_time": m.estimated_time,
            "delay_minutes": m.delay_minutes,
            "status": m.status,
            "priority": m.train.priority if m.train else 3
        }
        for m in movements
    ]

    sec_id = req.section_id
    if not sec_id and req.task_id:
        t = db.query(MaintenanceTask).filter(MaintenanceTask.id == req.task_id).first()
        if t and t.section_id:
            sec_id = t.section_id
    if not sec_id:
        sec = db.query(Section).filter(Section.corridor_id == req.corridor_id).first()
        if sec:
            sec_id = sec.id
    if not sec_id:
        sec_id = "SEC-CORR-01-ET-PRKD"

    evaluation = conflict_engine.evaluate_block_proposal(
        corridor_id=req.corridor_id,
        section_id=sec_id,
        track_name=req.track_name,
        location_km=req.location_km,
        start_time=req.requested_start_time,
        end_time=req.requested_end_time,
        protection_type=req.protection_type,
        requires_power_isolation=req.power_isolation_required,
        train_movements=mov_dicts
    )

    return {
        "status": "SUCCESS",
        "evaluation": evaluation
    }

@router.post("/blocks/propose")
def propose_block(req: BlockProposalRequest, db: Session = Depends(get_db)):
    movements = db.query(TrainMovement).all()
    mov_dicts = [
        {
            "train_number": m.train_number,
            "train_name": m.train.train_name if m.train else m.train_number,
            "train_type": m.train.train_type if m.train else "PASSENGER",
            "direction": m.direction,
            "current_track": m.current_track,
            "current_km": m.current_km,
            "scheduled_time": m.scheduled_time,
            "estimated_time": m.estimated_time,
            "delay_minutes": m.delay_minutes,
            "status": m.status,
            "priority": m.train.priority if m.train else 3,
        }
        for m in movements
    ]

    sec_id = req.section_id
    if not sec_id and req.task_id:
        t = db.query(MaintenanceTask).filter(MaintenanceTask.id == req.task_id).first()
        if t and t.section_id:
            sec_id = t.section_id
    if not sec_id:
        sec = db.query(Section).filter(Section.corridor_id == req.corridor_id).first()
        if sec:
            sec_id = sec.id
    if not sec_id:
        sec_id = "SEC-CORR-01-ET-PRKD"

    evaluation = conflict_engine.evaluate_block_proposal(
        corridor_id=req.corridor_id,
        section_id=sec_id,
        track_name=req.track_name,
        location_km=req.location_km,
        start_time=req.requested_start_time,
        end_time=req.requested_end_time,
        protection_type=req.protection_type,
        requires_power_isolation=req.power_isolation_required,
        train_movements=mov_dicts,
    )

    task_id = req.task_id
    if not task_id:
        # Resolve matching task for this corridor/section
        task_query = db.query(MaintenanceTask).filter(MaintenanceTask.corridor_id == req.corridor_id)
        if sec_id:
            task_match = task_query.filter(MaintenanceTask.section_id == sec_id).first()
            if task_match:
                task_id = task_match.id
        if not task_id:
            task_match = task_query.first()
            if task_match:
                task_id = task_match.id
        if not task_id:
            any_task = db.query(MaintenanceTask).first()
            if any_task:
                task_id = any_task.id

    block_id = f"BLOCK-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:18]}"
    initial_status = "PROPOSED"
    approval_notes_data = {}
    if req.departments:
        approval_notes_data["departments"] = req.departments
    if req.bundled_tasks:
        approval_notes_data["bundled_tasks"] = req.bundled_tasks
    notes_json = json.dumps(approval_notes_data) if approval_notes_data else None

    block = Block(
        id=block_id,
        task_id=task_id,
        corridor_id=req.corridor_id,
        section_id=sec_id,
        track_name=req.track_name,
        location_km=req.location_km,
        requested_start_time=req.requested_start_time,
        requested_end_time=req.requested_end_time,
        duration_mins=req.duration_mins,
        status=initial_status,
        conflict_status=evaluation["conflict_status"],
        conflict_summary=evaluation["summary"],
        conflicting_trains=json.dumps(evaluation["conflicting_passenger_trains"]),
        protection_type=req.protection_type,
        power_isolation_required=req.power_isolation_required,
        assigned_machine=req.assigned_machine,
        proposed_by=req.proposed_by,
        approval_status=initial_status,
        approval_notes=notes_json,
    )
    db.add(block)

    if task_id:
        task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
        if task:
            task.status = "PROPOSED"

    db.commit()

    log_event(
        db=db,
        actor=req.proposed_by,
        role="ENGINEER",
        entity="BLOCK",
        entity_id=block_id,
        action="BLOCK_PROPOSED",
        previous_state=None,
        new_state=initial_status,
        reason=f"Block proposed for {req.requested_start_time}-{req.requested_end_time} ({evaluation['conflict_status']})",
        provenance="DERIVED",
    )

    return {
        "status": "SUCCESS",
        "block_id": block_id,
        "conflict_status": evaluation["conflict_status"],
        "summary": evaluation["summary"],
        "alternative_window": evaluation.get("alternative_window"),
    }


@router.post("/blocks/propose-from-schedule")
def propose_block_from_schedule(req: ProposalFromScheduleRequest, db: Session = Depends(get_db)):
    """Creates a proposed block from an optimizer schedule item or candidate block."""
    movements = db.query(TrainMovement).all()
    mov_dicts = [
        {
            "train_number": m.train_number,
            "train_name": m.train.train_name if m.train else m.train_number,
            "train_type": m.train.train_type if m.train else "PASSENGER",
            "direction": m.direction,
            "current_track": m.current_track,
            "current_km": m.current_km,
            "scheduled_time": m.scheduled_time,
            "estimated_time": m.estimated_time,
            "delay_minutes": m.delay_minutes,
            "status": m.status,
            "priority": m.train.priority if m.train else 3,
        }
        for m in movements
    ]

    sec_id = req.section_id
    if not sec_id and req.task_id:
        t = db.query(MaintenanceTask).filter(MaintenanceTask.id == req.task_id).first()
        if t and t.section_id:
            sec_id = t.section_id
    if not sec_id:
        sec = db.query(Section).filter(Section.corridor_id == req.corridor_id).first()
        if sec:
            sec_id = sec.id
    if not sec_id:
        sec_id = "SEC-CORR-01-ET-PRKD"

    evaluation = conflict_engine.evaluate_block_proposal(
        corridor_id=req.corridor_id,
        section_id=sec_id,
        track_name=req.track_name,
        location_km=req.location_km,
        start_time=req.requested_start_time,
        end_time=req.requested_end_time,
        protection_type=req.protection_type,
        requires_power_isolation=req.power_isolation_required,
        train_movements=mov_dicts,
    )

    task_id = req.task_id

    block_id = f"BLOCK-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:18]}"
    initial_status = "PENDING_APPROVAL" if req.auto_submit else "PROPOSED"
    approval_notes_data = {}
    if req.departments:
        approval_notes_data["departments"] = req.departments
    if req.bundled_tasks:
        approval_notes_data["bundled_tasks"] = req.bundled_tasks
    notes_json = json.dumps(approval_notes_data) if approval_notes_data else None

    block = Block(
        id=block_id,
        task_id=task_id,
        corridor_id=req.corridor_id,
        section_id=sec_id,
        track_name=req.track_name,
        location_km=req.location_km,
        requested_start_time=req.requested_start_time,
        requested_end_time=req.requested_end_time,
        duration_mins=req.duration_mins,
        status=initial_status,
        conflict_status=evaluation["conflict_status"],
        conflict_summary=evaluation["summary"],
        conflicting_trains=json.dumps(evaluation["conflicting_passenger_trains"]),
        protection_type=req.protection_type,
        power_isolation_required=req.power_isolation_required,
        assigned_machine=req.assigned_machine,
        proposed_by=req.proposed_by,
        approval_status=initial_status,
        approval_notes=notes_json,
    )
    db.add(block)

    if task_id:
        task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
        if task:
            task.status = initial_status

    db.commit()

    log_event(
        db=db,
        actor=req.proposed_by,
        role="SYSTEM" if "Optimizer" in req.proposed_by else "ENGINEER",
        entity="BLOCK",
        entity_id=block_id,
        action="BLOCK_PROPOSED",
        previous_state=None,
        new_state=initial_status,
        reason=f"Block proposed from schedule for {req.requested_start_time}-{req.requested_end_time}",
        provenance="DERIVED",
    )

    return {
        "status": "SUCCESS",
        "block_id": block_id,
        "block": serialize_block(block),
        "conflict_status": evaluation["conflict_status"],
        "summary": evaluation["summary"],
        "alternative_window": evaluation.get("alternative_window"),
    }


@router.post("/blocks/optimize")
def optimize_blocks(req: OptimizeRequest, db: Session = Depends(get_db)):
    if req.tasks is not None:
        task_dicts = req.tasks
    else:
        query = db.query(MaintenanceTask)
        if req.corridor_id:
            query = query.filter(MaintenanceTask.corridor_id == req.corridor_id)
        if req.target_tasks:
            query = query.filter(MaintenanceTask.id.in_(req.target_tasks))
        tasks = query.all()

        if not tasks:
            tasks = db.query(MaintenanceTask).all()

        task_dicts = [
            {
                "id": t.id,
                "fault_title": t.fault.fault_title if t.fault else t.id,
                "department_id": t.department_id,
                "work_type_id": t.work_type_id,
                "duration_mins": t.duration_mins,
                "section_id": t.section_id or "SEC-MAIN",
                "track_name": t.track_name,
                "priority": t.priority,
                "equipment_id": t.equipment_id,
                "assigned_equipment": t.assigned_crew,
                "requires_power_isolation": t.requires_power_isolation,
                "requires_track_occupation": t.requires_track_occupation,
                "location_km": t.location_km,
            }
            for t in tasks
        ]

    candidate_blocks = []
    if req.allow_bundling and not req.tasks:
        cand_data = candidate_generator.generate_candidate_blocks(db, corridor_id=req.corridor_id)
        candidate_blocks = cand_data.get("candidate_blocks", [])

    if req.train_movements is not None:
        mov_dicts = req.train_movements
    else:
        movements = db.query(TrainMovement).all()
        mov_dicts = [
            {
                "train_number": m.train_number,
                "train_type": m.train.train_type if m.train else "PASSENGER",
                "estimated_time": m.estimated_time,
                "current_track": m.current_track,
                "priority": m.train.priority if m.train else 3,
            }
            for m in movements
        ]

    win_start = req.window_start or req.time_window_start
    win_end = req.window_end or req.time_window_end

    optimization_result = block_optimizer.optimize_blocks(
        tasks=task_dicts,
        train_movements=mov_dicts,
        window_start_str=win_start,
        window_end_str=win_end,
        candidate_blocks=candidate_blocks,
        allow_bundling=req.allow_bundling,
        max_time_seconds=req.max_time_seconds,
    )

    if "deferred_tasks" in optimization_result:
        optimization_result["deferred_tasks"] = [
            explanation_service.enrich_deferred_task(dt) for dt in optimization_result["deferred_tasks"]
        ]

    log_event(
        db=db,
        actor="OR-Tools CP-SAT Optimizer",
        role="SYSTEM",
        entity="BLOCK",
        entity_id=req.corridor_id,
        action="CP_SAT_OPTIMIZATION",
        new_state="OPTIMIZED",
        reason=optimization_result["summary"],
        provenance="DERIVED",
    )

    return optimization_result


# --- State Transition Helpers & Action Handlers ---

def _execute_block_submission(block: Block, req: Optional[BlockActionRequest], db: Session) -> dict:
    if block.status == "PENDING_APPROVAL":
        return {"status": "SUCCESS", "block_id": block.id, "new_status": "PENDING_APPROVAL"}

    if block.status not in ["PROPOSED", "DRAFT", "PENDING"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state transition: Cannot submit block '{block.id}' in status '{block.status}'. Must be in 'PROPOSED' status."
        )

    prev_state = block.status
    block.status = "PENDING_APPROVAL"
    block.approval_status = "PENDING_APPROVAL"

    if block.task:
        block.task.status = "PENDING_APPROVAL"

    db.commit()

    actor = (req.actor or req.approved_by) if (req and (req.actor or req.approved_by)) else "P.Way Section Engineer"
    role = req.role if (req and req.role) else "ENGINEER"
    notes = (req.notes or req.reason) if (req and (req.notes or req.reason)) else "Submitted for divisional block clearance"

    log_event(
        db=db,
        actor=actor,
        role=role,
        entity="BLOCK",
        entity_id=block.id,
        action="BLOCK_SUBMITTED",
        previous_state=prev_state,
        new_state="PENDING_APPROVAL",
        reason=notes,
        provenance="DERIVED",
    )

    return {"status": "SUCCESS", "block_id": block.id, "new_status": "PENDING_APPROVAL"}


def _execute_block_approval(block: Block, req: Optional[BlockActionRequest], db: Session) -> dict:
    if block.status in ["APPROVED", "SANCTIONED"]:
        raise HTTPException(status_code=400, detail=f"Repeated action rejected: Block '{block.id}' is already in APPROVED status.")

    if block.status not in ["PENDING_APPROVAL", "PENDING", "PLANNED", "PROPOSED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state transition: Cannot approve block '{block.id}' in status '{block.status}'. Must be in 'PROPOSED' or 'PENDING_APPROVAL' status."
        )

    prev_state = block.status
    block.status = "APPROVED"
    block.approval_status = "APPROVED"

    actor = (req.actor or req.approved_by) if (req and (req.actor or req.approved_by)) else "Chief of Block Officer (COA / Bhopal)"
    role = req.role if (req and req.role) else ("CHIEF_OF_BLOCK_OFFICER" if any(k in actor for k in ["Chief", "COA", "Block Officer"]) else "CONTROLLER")
    notes = (req.notes or req.reason) if (req and (req.notes or req.reason)) else "Sanctioned at Joint Coordination Desk"

    block.approved_by = actor
    block.approval_notes = notes

    if block.task:
        block.task.status = "APPROVED"

    db.commit()

    log_event(
        db=db,
        actor=actor,
        role=role,
        entity="BLOCK",
        entity_id=block.id,
        action="BLOCK_APPROVED",
        previous_state=prev_state,
        new_state="APPROVED",
        reason=notes,
        provenance="REAL_PUBLIC",
    )

    return {"status": "SUCCESS", "block_id": block.id, "new_status": "APPROVED", "approved_by": block.approved_by}


def _execute_block_rejection(block: Block, req: Optional[BlockActionRequest], db: Session) -> dict:
    if block.status == "REJECTED":
        raise HTTPException(status_code=400, detail=f"Repeated action rejected: Block '{block.id}' is already in REJECTED status.")

    if block.status not in ["PENDING_APPROVAL", "PENDING", "PLANNED", "PROPOSED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state transition: Cannot reject block '{block.id}' in status '{block.status}'. Must be in 'PROPOSED' or 'PENDING_APPROVAL' status."
        )

    prev_state = block.status
    block.status = "REJECTED"
    block.approval_status = "REJECTED"

    actor = (req.actor or req.approved_by) if (req and (req.actor or req.approved_by)) else "Chief of Block Officer (COA / Bhopal)"
    role = req.role if (req and req.role) else ("CHIEF_OF_BLOCK_OFFICER" if any(k in actor for k in ["Chief", "COA", "Block Officer"]) else "CONTROLLER")
    notes = (req.notes or req.reason) if (req and (req.notes or req.reason)) else "Rejected at Joint Coordination Desk"

    block.approval_notes = notes

    if block.task:
        block.task.status = "PENDING"

    db.commit()

    log_event(
        db=db,
        actor=actor,
        role=role,
        entity="BLOCK",
        entity_id=block.id,
        action="BLOCK_REJECTED",
        previous_state=prev_state,
        new_state="REJECTED",
        reason=notes,
        provenance="REAL_PUBLIC",
    )

    return {"status": "SUCCESS", "block_id": block.id, "new_status": "REJECTED"}


def _execute_block_selection(block: Block, req: Optional[BlockActionRequest], db: Session) -> dict:
    if block.status == "SELECTED":
        raise HTTPException(status_code=400, detail=f"Repeated action rejected: Block '{block.id}' is already in SELECTED status.")

    if block.status not in ["APPROVED", "SANCTIONED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state transition: Cannot select block '{block.id}' in status '{block.status}'. Must be in 'APPROVED' status."
        )

    prev_state = block.status
    block.status = "SELECTED"
    block.approval_status = "SELECTED"
    if req and (req.notes or req.reason):
        block.approval_notes = req.notes or req.reason

    if block.task:
        block.task.status = "SCHEDULED"

    db.commit()

    actor = (req.actor or req.approved_by) if (req and (req.actor or req.approved_by)) else "Chief Controller"
    role = req.role if (req and req.role) else ("CHIEF_OF_BLOCK_OFFICER" if any(k in actor for k in ["Chief", "COA", "Block Officer"]) else "CONTROLLER")
    notes = (req.notes or req.reason) if (req and (req.notes or req.reason)) else "Maintenance Block Selected & Cleared for Operational Planning"

    log_event(
        db=db,
        actor=actor,
        role=role,
        entity="BLOCK",
        entity_id=block.id,
        action="BLOCK_SELECTED",
        previous_state=prev_state,
        new_state="SELECTED",
        reason=notes,
        provenance="REAL_PUBLIC",
    )

    return {"status": "SUCCESS", "block_id": block.id, "new_status": "SELECTED"}


def _execute_block_replan(block: Block, req: Optional[BlockActionRequest], db: Session) -> dict:
    if block.status not in ["APPROVED", "SANCTIONED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state transition: Cannot re-plan block '{block.id}' in status '{block.status}'. Must be in 'APPROVED' status."
        )

    prev_state = block.status
    block.status = "RE_PLAN"
    block.approval_status = "RE_PLAN"

    actor = (req.actor or req.approved_by) if (req and (req.actor or req.approved_by)) else "Divisional Section Controller"
    role = req.role if (req and req.role) else ("CHIEF_OF_BLOCK_OFFICER" if any(k in actor for k in ["Chief", "COA", "Block Officer"]) else "CONTROLLER")
    notes = (req.notes or req.reason) if (req and (req.notes or req.reason)) else "Returned to optimizer for re-planning"

    block.approval_notes = notes

    if block.task:
        block.task.status = "PENDING"

    db.commit()

    log_event(
        db=db,
        actor=actor,
        role=role,
        entity="BLOCK",
        entity_id=block.id,
        action="BLOCK_RE_PLAN",
        previous_state=prev_state,
        new_state="RE_PLAN",
        reason=notes,
        provenance="DERIVED",
    )

    return {"status": "SUCCESS", "block_id": block.id, "new_status": "RE_PLAN"}


def _execute_block_deferral(block: Block, req: Optional[BlockActionRequest], db: Session) -> dict:
    if block.status not in ["PENDING_APPROVAL", "PENDING", "PLANNED", "PROPOSED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state transition: Cannot defer block '{block.id}' in status '{block.status}'. Must be in 'PROPOSED' or 'PENDING_APPROVAL' status."
        )

    prev_state = block.status
    block.status = "DEFERRED"
    block.approval_status = "DEFERRED"

    actor = (req.actor or req.approved_by) if (req and (req.actor or req.approved_by)) else "Divisional Section Controller"
    role = req.role if (req and req.role) else ("CHIEF_OF_BLOCK_OFFICER" if any(k in actor for k in ["Chief", "COA", "Block Officer"]) else "CONTROLLER")
    notes = (req.notes or req.reason) if (req and (req.notes or req.reason)) else "Deferred by controller"

    block.approval_notes = notes

    if block.task:
        block.task.status = "PENDING"

    db.commit()

    log_event(
        db=db,
        actor=actor,
        role=role,
        entity="BLOCK",
        entity_id=block.id,
        action="BLOCK_DEFERRED",
        previous_state=prev_state,
        new_state="DEFERRED",
        reason=notes,
        provenance="REAL_PUBLIC",
    )

    return {"status": "SUCCESS", "block_id": block.id, "new_status": "DEFERRED"}


# --- Action Endpoints ---

@router.post("/blocks/approve")
def legacy_approve_block(req: BlockApprovalRequest, db: Session = Depends(get_db)):
    """Legacy endpoint supporting APPROVE, REJECT, SELECT, RESCHEDULE/REPLAN."""
    block = db.query(Block).filter(Block.id == req.block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    action = req.action.upper()
    action_req = BlockActionRequest(actor=req.approved_by, notes=req.notes)

    if action in ["APPROVE", "APPROVED", "SANCTION", "SANCTIONED"]:
        return _execute_block_approval(block, action_req, db)
    elif action in ["REJECT", "REJECTED"]:
        return _execute_block_rejection(block, action_req, db)
    elif action in ["SELECT", "SELECTED"]:
        return _execute_block_selection(block, action_req, db)
    elif action in ["RESCHEDULE", "REPLAN", "RE_PLAN"]:
        if block.status in ["APPROVED", "SANCTIONED"]:
            return _execute_block_replan(block, action_req, db)
        elif block.status in ["PENDING_APPROVAL", "PENDING", "PLANNED", "PROPOSED"]:
            return _execute_block_deferral(block, action_req, db)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid state transition: Cannot reschedule/replan block '{block.id}' in status '{block.status}'."
            )
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action '{action}'")


@router.post("/blocks/{block_id}/submit")
@router.post("/blocks/{block_id}/submit-for-approval")
def submit_block(block_id: str, req: Optional[BlockActionRequest] = None, db: Session = Depends(get_db)):
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return _execute_block_submission(block, req, db)


@router.post("/blocks/{block_id}/approve")
def approve_block_endpoint(block_id: str, req: Optional[BlockActionRequest] = None, db: Session = Depends(get_db)):
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return _execute_block_approval(block, req, db)


@router.post("/blocks/{block_id}/reject")
def reject_block_endpoint(block_id: str, req: Optional[BlockActionRequest] = None, db: Session = Depends(get_db)):
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return _execute_block_rejection(block, req, db)


@router.post("/blocks/{block_id}/defer")
def defer_block_endpoint(block_id: str, req: Optional[BlockActionRequest] = None, db: Session = Depends(get_db)):
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return _execute_block_deferral(block, req, db)


@router.post("/blocks/{block_id}/select")
def select_block_endpoint(block_id: str, req: Optional[BlockActionRequest] = None, db: Session = Depends(get_db)):
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return _execute_block_selection(block, req, db)


@router.post("/blocks/{block_id}/replan")
def replan_block_endpoint(block_id: str, req: Optional[BlockActionRequest] = None, db: Session = Depends(get_db)):
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return _execute_block_replan(block, req, db)


@router.post("/blocks/demo-reset")
@router.post("/demo/reset")
def reset_demo_blocks(db: Session = Depends(get_db)):
    """
    Safe Demo Reset:
    Clears all temporary demonstration blocks and existing tasks.
    Dynamically generates exactly 50 randomized maintenance tasks across Bhopal Division corridors.
    """
    from scripts.generate_phase3_maintenance_data import generate_dataset

    # Run dynamic generation of exactly 50 tasks
    result = generate_dataset(db=db, total_count=50, random_seed=None)

    return {
        "status": "SUCCESS",
        "cleared_blocks": result.get("cleared_blocks", 0),
        "blocks_deleted": result.get("cleared_blocks", 0),
        "message": f"Successfully reset demo state and generated {result['total_tasks']} dynamic randomized maintenance tasks.",
        "baseline": {
            "blocks": 0,
            "maintenance_tasks": result["total_tasks"],
            "priority_distribution": result["priority_distribution"]
        }
    }
