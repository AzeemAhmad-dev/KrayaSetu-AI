from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from backend.app.database import get_db
from backend.app.services.time_validation import get_canonical_now, get_canonical_today_str
from backend.app.models.maintenance import FaultObservation, MaintenanceTask, WorkType, Equipment, Department, Crew, Block, PlannedActivity
from backend.app.models.events import EventLog
from backend.app.schemas.api_schemas import (
    FaultCreateRequest,
    FaultAssessRequest,
    HumanDecisionRequest,
    CrewBase,
    TaskStatusUpdateRequest,
    TaskCompleteRequest,
)
from backend.app.services.ai_assessor import ai_assessor
from backend.app.services.event_logger import log_event

from backend.app.models.network import Section

router = APIRouter(tags=["Maintenance"])

@router.get("/maintenance/faults")
def get_faults(
    status: Optional[str] = None,
    department_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(FaultObservation)
    if department_id:
        query = query.filter(FaultObservation.department_id == department_id.upper())
    if status:
        query = query.filter(FaultObservation.status == status)
    faults = query.order_by(FaultObservation.timestamp.desc()).all()

    results = []
    for f in faults:
        related_task = f.tasks[0] if f.tasks else None
        related_task_id = related_task.id if related_task else None
        related_task_status = related_task.status if related_task else None
        related_task_priority = related_task.priority if related_task else None

        related_block_id = None
        related_block_status = None
        if related_task:
            if related_task.block_id:
                related_block_id = related_task.block_id
            elif related_task.blocks:
                related_block_id = related_task.blocks[0].id
            if related_block_id:
                blk = db.query(Block).filter(Block.id == related_block_id).first()
                if blk:
                    related_block_status = blk.status

        station_name = None
        if f.section_id:
            sec = db.query(Section).filter(Section.id == f.section_id).first()
            if sec:
                station_name = f"{sec.from_station_code}–{sec.to_station_code}"

        results.append({
            "id": f.id,
            "fault_id": f.id,
            "issue_id": f.id,
            "reporter": f.reporter,
            "reporter_role": f.reporter_role,
            "timestamp": f.timestamp.isoformat() if f.timestamp else None,
            "train_reference": f.train_reference,
            "corridor_id": f.corridor_id,
            "section_id": f.section_id,
            "station_code": station_name,
            "track_name": f.track_name,
            "location_km": f.location_km,
            "location_description": f.location_description,
            "fault_title": f.fault_title,
            "category": f.fault_title or f.description or "General Defect",
            "description": f.description,
            "department_id": f.department_id,
            "severity": f.severity,
            "priority": related_task_priority or ("CRITICAL" if f.severity == "CRITICAL" else ("P2" if f.severity == "HIGH" else "P3")),
            "status": f.status,
            "ai_assessed": f.ai_assessed,
            "ai_confidence": f.ai_confidence,
            "ai_recommended_severity": f.ai_recommended_severity,
            "ai_recommended_urgency": f.ai_recommended_urgency,
            "ai_recommended_protection": f.ai_recommended_protection,
            "ai_recommended_mode": f.ai_recommended_mode,
            "ai_explanation": f.ai_explanation,
            "human_status": f.human_status,
            "human_decision_by": f.human_decision_by,
            "human_decision_at": f.human_decision_at.isoformat() if f.human_decision_at else None,
            "human_notes": f.human_notes,
            "source_type": f.source_type,
            "related_task_id": related_task_id,
            "related_task_status": related_task_status,
            "related_block_id": related_block_id,
            "related_block_status": related_block_status,
            "completion_time": f.human_decision_at.isoformat() if (f.status == "COMPLETED" and f.human_decision_at) else (related_task.completed_at.isoformat() if (related_task and related_task.completed_at) else None),
            "resolution_notes": f.human_notes or ("Resolved & Verified" if f.status == "COMPLETED" else None)
        })

    return results

@router.post("/maintenance/faults")
def create_fault(req: FaultCreateRequest, db: Session = Depends(get_db)):
    fault_id = f"FAULT-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    fault = FaultObservation(
        id=fault_id,
        reporter=req.reporter,
        reporter_role=req.reporter_role,
        train_reference=req.train_reference,
        corridor_id=req.corridor_id,
        section_id=req.section_id,
        track_name=req.track_name,
        location_km=req.location_km,
        location_description=req.location_description,
        fault_title=req.fault_title,
        description=req.description,
        department_id=req.department_id,
        severity=req.severity,
        status="OBSERVATION",
        source_type="FIELD_OBSERVATION"
    )
    db.add(fault)
    db.commit()
    db.refresh(fault)

    log_event(
        db=db,
        actor=req.reporter,
        role=req.reporter_role,
        entity="FAULT",
        entity_id=fault_id,
        action="FAULT_REPORTED",
        new_state="OBSERVATION",
        reason=req.fault_title,
        provenance="FIELD_OBSERVATION"
    )

    return {"status": "SUCCESS", "fault_id": fault_id, "message": "Fault observation logged successfully"}

@router.post("/maintenance/assess")
def assess_fault(req: FaultAssessRequest, db: Session = Depends(get_db)):
    fault = db.query(FaultObservation).filter(FaultObservation.id == req.fault_id).first()
    if not fault:
        raise HTTPException(status_code=404, detail="Fault observation not found")

    # Pre-inference validator (QA-103): catch None values for categorical features
    if fault.fault_title is None or fault.department_id is None or fault.track_name is None:
        assessment = {
            "department": fault.department_id or "PWAY",
            "severity": "MEDIUM",
            "urgency": "NEXT_WINDOW",
            "required_protection": "TRAFFIC_BLOCK",
            "maintenance_mode": "SHORT_BLOCK",
            "operational_impact": "SPEED_RESTRICTION",
            "recommended_action": "Dispatched via Rule-Based Engine (Missing Features).",
            "requires_power_isolation": False,
            "requires_track_occupation": True,
            "compatible_with_train_movement": False,
            "confidence": 0.50,
            "explanation": "[Rule-Based Fallback]: Bypassed XGBoost inference due to missing categorical data (null fault_title or department).",
            "label": "RULE-BASED FALLBACK"
        }
    else:
        # Run AI decision support
        assessment = ai_assessor.assess_fault(fault)

    fault.ai_assessed = True
    fault.ai_confidence = assessment["confidence"]
    fault.ai_recommended_severity = assessment["severity"]
    fault.ai_recommended_urgency = assessment["urgency"]
    fault.ai_recommended_protection = assessment["required_protection"]
    fault.ai_recommended_mode = assessment["maintenance_mode"]
    fault.ai_explanation = assessment["explanation"]
    fault.status = "AI_ASSESSED"

    db.commit()

    log_event(
        db=db,
        actor="AI Decision Support",
        role="SYSTEM",
        entity="FAULT",
        entity_id=fault.id,
        action="AI_ASSESSMENT_COMPLETED",
        previous_state="OBSERVATION",
        new_state="AI_ASSESSED",
        reason=assessment["recommended_action"],
        provenance="DERIVED"
    )

    return {
        "status": "SUCCESS",
        "fault_id": fault.id,
        "assessment": assessment
    }

@router.post("/maintenance/approve")
def human_decision(req: HumanDecisionRequest, db: Session = Depends(get_db)):
    fault = db.query(FaultObservation).filter(FaultObservation.id == req.fault_id).first()
    if not fault:
        raise HTTPException(status_code=404, detail="Fault observation not found")

    decision = req.decision.upper()
    fault.human_status = decision
    fault.human_decision_by = req.decided_by
    fault.human_decision_at = datetime.now(timezone.utc)
    fault.human_notes = req.notes

    if decision in ["CONFIRMED", "OVERRIDDEN"]:
        sev = req.override_severity or fault.ai_recommended_severity or fault.severity
        mode = req.override_mode or fault.ai_recommended_mode or "FULL_BLOCK"
        prot = req.override_protection or fault.ai_recommended_protection or "TRAFFIC_BLOCK"
        fault.severity = sev
        fault.status = "TASKED"

        task_id = f"TASK-{fault.id.replace('FAULT-', '')}"
        existing_task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
        if existing_task:
            task = existing_task
            task.status = "APPROVED"
        else:
            task = MaintenanceTask(
                id=task_id,
                fault_id=fault.id,
                department_id=fault.department_id,
                work_type_id="GENERAL_CORRECTION",
                corridor_id=fault.corridor_id,
                section_id=fault.section_id,
                track_name=fault.track_name,
                location_km=fault.location_km,
                severity=sev,
                priority="P1" if sev == "CRITICAL" else ("P2" if sev == "HIGH" else "P3"),
                assigned_crew=f"{fault.department_id} Maintenance Squad",
                required_protection=prot,
                maintenance_mode=mode,
                requires_power_isolation=("POWER" in prot),
                requires_track_occupation=("TRAFFIC" in prot or "EMERGENCY" in prot),
                status="APPROVED",
                source_type="SYNTHETIC"
            )
            # Use XGBoost Duration Regressor for P80 duration prediction
            task.duration_mins = ai_assessor.predict_duration_minutes(task)
            db.add(task)
    elif decision == "REJECTED":
        fault.status = "REJECTED"
    elif decision == "ESCALATED":
        fault.status = "EMERGENCY_ESCALATED"
        fault.severity = "CRITICAL"

    db.commit()

    log_event(
        db=db,
        actor=req.decided_by,
        role="CONTROLLER",
        entity="FAULT",
        entity_id=fault.id,
        action=f"HUMAN_{decision}",
        previous_state="AI_ASSESSED",
        new_state=fault.status,
        reason=req.notes or f"Human decision: {decision}",
        provenance="REAL_PUBLIC"
    )

    if decision in ["CONFIRMED", "OVERRIDDEN"]:
        log_event(
            db=db,
            actor=req.decided_by,
            role="SENIOR_DIVISIONAL_ENGINEER",
            entity="TASK",
            entity_id=task_id,
            action=f"TASK_{decision}",
            previous_state=None,
            new_state="APPROVED",
            reason=f"Task {decision} by {req.decided_by} for {fault.department_id}: {req.notes or ''}",
            provenance="REAL_PUBLIC"
        )

    return {
        "status": "SUCCESS",
        "fault_id": fault.id,
        "new_status": fault.status,
        "human_decision": decision
    }

@router.get("/maintenance/tasks")
def get_maintenance_tasks(db: Session = Depends(get_db)):
    tasks = db.query(MaintenanceTask).all()
    return [
        {
            "id": t.id,
            "fault_id": t.fault_id,
            "department_id": t.department_id,
            "work_type_id": t.work_type_id,
            "corridor_id": t.corridor_id,
            "section_id": t.section_id,
            "track_name": t.track_name,
            "location_km": t.location_km,
            "severity": t.severity,
            "priority": t.priority,
            "duration_mins": t.duration_mins,
            "crew_id": t.crew_id,
            "assigned_crew": t.assigned_crew,
            "equipment_id": t.equipment_id,
            "operational_impact": t.operational_impact,
            "required_protection": t.required_protection,
            "maintenance_mode": t.maintenance_mode,
            "requires_power_isolation": t.requires_power_isolation,
            "requires_track_occupation": t.requires_track_occupation,
            "status": t.status,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "block_id": t.block_id
        }
        for t in tasks
    ]

@router.get("/maintenance/crews")
def get_crews(department_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Crew)
    if department_id:
        query = query.filter(Crew.department_id == department_id)
    crews = query.all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "department_id": c.department_id,
            "crew_type": c.crew_type,
            "gang_size": c.gang_size,
            "base_station_code": c.base_station_code,
            "contact_supervisor": c.contact_supervisor,
            "max_duty_hours": c.max_duty_hours,
            "active": c.active
        }
        for c in crews
    ]

@router.get("/maintenance/equipment")
def get_equipment_registry(db: Session = Depends(get_db)):
    equipment = db.query(Equipment).all()
    return [
        {
            "id": e.id,
            "department_id": e.department_id,
            "name": e.name,
            "type": e.type,
            "base_station_code": e.base_station_code,
            "status": e.status
        }
        for e in equipment
    ]


@router.post("/maintenance/tasks/{task_id}/complete")
def complete_task(
    task_id: str,
    req: Optional[TaskCompleteRequest] = None,
    db: Session = Depends(get_db)
):
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")

    completed_by = req.completed_by if req else "Field Department Squad"
    notes = req.notes if req else f"Work completed by {task.department_id} squad"

    previous_status = task.status
    task.status = "COMPLETED"
    task.completed_at = datetime.now(timezone.utc)

    # CRITICAL: Individual department task completion does NOT complete the overall block.
    # The parent block remains in its current operational state (ACTIVE/SCHEDULED/APPROVED)
    # until formally closed by COBO/Operations.

    db.commit()
    db.refresh(task)

    log_event(
        db=db,
        actor=completed_by or "Department Crew",
        role="FIELD_ENGINEER",
        entity="TASK",
        entity_id=task.id,
        action="TASK_COMPLETED",
        previous_state=previous_status,
        new_state="COMPLETED",
        reason=notes,
        provenance="FIELD_OBSERVATION"
    )

    return {
        "status": "SUCCESS",
        "task_id": task.id,
        "new_status": task.status,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "department_id": task.department_id,
        "message": f"Task {task.id} marked as COMPLETED by {task.department_id}. Parent block status unchanged."
    }


@router.patch("/maintenance/tasks/{task_id}/status")
def update_task_status(
    task_id: str,
    req: TaskStatusUpdateRequest,
    db: Session = Depends(get_db)
):
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")

    new_status = req.status.upper()
    previous_status = task.status
    task.status = new_status
    if new_status == "COMPLETED":
        task.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(task)

    log_event(
        db=db,
        actor=req.actor or "Department Crew",
        role="FIELD_ENGINEER",
        entity="TASK",
        entity_id=task.id,
        action=f"TASK_STATUS_{new_status}",
        previous_state=previous_status,
        new_state=new_status,
        reason=req.notes or f"Status updated to {new_status}",
        provenance="FIELD_OBSERVATION"
    )

    return {
        "status": "SUCCESS",
        "task_id": task.id,
        "new_status": task.status,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None
    }


@router.get("/maintenance/completed-tasks")
def get_completed_tasks(
    corridor_id: Optional[str] = None,
    station_code: Optional[str] = None,
    department_id: Optional[str] = None,
    period: Optional[str] = None,
    reference_date: Optional[str] = None,
    status: Optional[str] = "COMPLETED",
    db: Session = Depends(get_db)
):
    target_status = (status or "COMPLETED").upper()
    if target_status == "ACTIVE":
        query = db.query(MaintenanceTask).filter(MaintenanceTask.status.in_(["IN_PROGRESS", "ASSIGNED", "APPROVED"]))
    elif target_status != "ALL":
        query = db.query(MaintenanceTask).filter(MaintenanceTask.status == target_status)
    else:
        query = db.query(MaintenanceTask)

    if department_id:
        query = query.filter(MaintenanceTask.department_id == department_id.upper())
    if corridor_id:
        query = query.filter(MaintenanceTask.corridor_id == corridor_id)

    # Date period filtering
    if period and period.upper() != "ALL":
        p = period.upper()
        ref_str = (reference_date or get_canonical_today_str()).strip()
        try:
            ref_dt = datetime.strptime(ref_str, "%Y-%m-%d")
        except Exception:
            ref_dt = get_canonical_now()

        if p in ("TODAY", "DAILY"):
            start_bound = ref_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            end_bound = ref_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif p == "WEEKLY":
            weekday = ref_dt.weekday()
            start_bound = (ref_dt - timedelta(days=weekday)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_bound = (start_bound + timedelta(days=6)).replace(hour=23, minute=59, second=59, microsecond=999999)
        elif p == "MONTHLY":
            start_bound = ref_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if ref_dt.month == 12:
                next_month = ref_dt.replace(year=ref_dt.year + 1, month=1, day=1)
            else:
                next_month = ref_dt.replace(month=ref_dt.month + 1, day=1)
            end_bound = next_month - timedelta(microseconds=1)
        else:
            start_bound = None
            end_bound = None

        if start_bound and end_bound:
            query = query.filter(
                (MaintenanceTask.completed_at >= start_bound) & (MaintenanceTask.completed_at <= end_bound)
            )

    tasks = query.order_by(MaintenanceTask.completed_at.desc(), MaintenanceTask.id.desc()).all()

    results = []
    for t in tasks:
        # Determine parent block
        parent_block = None
        if t.block_id:
            parent_block = db.query(Block).filter(Block.id == t.block_id).first()
        if not parent_block:
            parent_block = db.query(Block).filter(Block.task_id == t.id).first()

        # Station code filtering if requested
        if station_code:
            match = False
            if parent_block:
                if station_code in (parent_block.section_id or ""):
                    match = True
                try:
                    from backend.app.models.network import Section
                    sec = db.query(Section).filter(Section.id == parent_block.section_id).first()
                    if sec and (sec.from_station_code == station_code or sec.to_station_code == station_code):
                        match = True
                except Exception:
                    pass
            if not match:
                continue

        title_val = (
            t.fault.fault_title if (t.fault and t.fault.fault_title)
            else (t.fault.description if (t.fault and t.fault.description) else (t.work_type_id or t.id))
        )
        desc_val = (
            t.fault.description if (t.fault and t.fault.description)
            else (t.fault.fault_title if (t.fault and t.fault.fault_title) else title_val)
        )

        completion_evt = (
            db.query(EventLog)
            .filter(EventLog.entity == "TASK", EventLog.entity_id == t.id, EventLog.new_state == "COMPLETED")
            .order_by(EventLog.timestamp.desc())
            .first()
        )
        completed_by = completion_evt.actor if completion_evt else (t.assigned_crew or f"{t.department_id} Gang")
        verification_status = "VERIFIED" if (parent_block and parent_block.status in ("COMPLETED", "APPROVED", "ACTIVE")) else "PENDING_VERIFICATION"

        results.append({
            "id": t.id,
            "task_id": t.id,
            "department_id": t.department_id,
            "work_type_id": t.work_type_id,
            "title": title_val,
            "description": desc_val,
            "fault_id": t.fault_id,
            "corridor_id": t.corridor_id,
            "section_id": t.section_id or (parent_block.section_id if parent_block else None),
            "track_name": t.track_name,
            "location_km": t.location_km,
            "priority": t.priority,
            "severity": t.severity,
            "duration_mins": t.duration_mins,
            "assigned_crew": t.assigned_crew,
            "completed_by": completed_by,
            "status": t.status,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "block_id": parent_block.id if parent_block else (t.block_id or "Unlinked"),
            "block_type": parent_block.block_type if parent_block else None,
            "block_status": parent_block.status if parent_block else "UNKNOWN",
            "verification_status": verification_status,
            "requested_start_time": parent_block.requested_start_time if parent_block else None,
            "requested_end_time": parent_block.requested_end_time if parent_block else None,
        })

    return results


@router.get("/maintenance/planned-activities")
def get_planned_activities(
    department_id: Optional[str] = None,
    cadence: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns pre-planned activities distinct from the 50 existing tasks.
    Categorized into:
    - CURRENT / TODAY (Evaluates if scheduled window corresponds to current execution window)
    - WEEKLY
    - MONTHLY
    """
    now = get_canonical_now()
    today_str = get_canonical_today_str()
    current_minutes = now.hour * 60 + now.minute

    query = db.query(PlannedActivity)
    if department_id:
        query = query.filter(PlannedActivity.department_id == department_id.upper())
    if cadence and cadence.upper() != "ALL":
        query = query.filter(PlannedActivity.cadence == cadence.upper())

    activities = query.order_by(PlannedActivity.scheduled_date.asc(), PlannedActivity.start_time.asc()).all()
    results = []

    for a in activities:
        def t2m(t_str: str) -> int:
            try:
                p = t_str.split(":")
                return int(p[0]) * 60 + int(p[1])
            except Exception:
                return 0

        s_min = t2m(a.start_time)
        e_min = t2m(a.end_time)
        if e_min <= s_min:
            e_min += 24 * 60

        is_today = (a.scheduled_date == today_str) or (a.cadence == "CURRENT")
        # Current execution window: today AND within or near current window (within ±45 min buffer)
        is_in_time_window = (s_min - 45) <= current_minutes <= (e_min + 45)
        is_due_now = is_today and (is_in_time_window or a.cadence == "CURRENT")

        status_display = "DUE_NOW" if (is_due_now and a.status not in ["COMPLETED", "IN_PROGRESS"]) else a.status

        h = a.duration_mins // 60
        m = a.duration_mins % 60
        dur_str = f"{h}h {m}m" if m else f"{h}h"
        time_display = f"{a.start_time} – {a.end_time} | {dur_str}"

        results.append({
            "id": a.id,
            "department_id": a.department_id,
            "title": a.title,
            "cadence": a.cadence,
            "scheduled_date": a.scheduled_date,
            "start_time": a.start_time,
            "end_time": a.end_time,
            "duration_mins": a.duration_mins,
            "duration_str": dur_str,
            "time_display": time_display,
            "corridor_id": a.corridor_id,
            "section_id": a.section_id,
            "location_km": a.location_km,
            "location_description": a.location_description,
            "track_name": a.track_name,
            "assigned_crew": a.assigned_crew,
            "priority": a.priority,
            "status": status_display,
            "is_due_now": is_due_now,
            "description": a.description,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return results


@router.patch("/maintenance/planned-activities/{activity_id}/status")
def update_planned_activity_status(
    activity_id: str,
    req: Optional[TaskStatusUpdateRequest] = None,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    act = db.query(PlannedActivity).filter(PlannedActivity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Planned activity not found")

    new_st = (req.status if (req and req.status) else status)
    if not new_st:
        raise HTTPException(status_code=400, detail="Status must be provided")
    new_st = new_st.upper()
    act.status = new_st
    db.commit()
    db.refresh(act)

    log_event(
        db=db,
        actor=(req.actor if req else None) or "Department Supervisor",
        role="ENGINEER",
        entity="TASK",
        entity_id=act.id,
        action=f"ACTIVITY_STATUS_{new_st}",
        previous_state=None,
        new_state=new_st,
        reason=(req.notes if req else None) or f"Activity status updated to {new_st}",
        provenance="FIELD_OBSERVATION"
    )

    return {"status": "SUCCESS", "activity_id": act.id, "new_status": act.status}

