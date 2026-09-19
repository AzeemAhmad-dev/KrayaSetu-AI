from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.maintenance import FaultObservation, MaintenanceTask, WorkType, Equipment, Department, Crew
from backend.app.schemas.api_schemas import FaultCreateRequest, FaultAssessRequest, HumanDecisionRequest, CrewBase
from backend.app.services.ai_assessor import ai_assessor
from backend.app.services.event_logger import log_event

router = APIRouter(tags=["Maintenance"])

@router.get("/maintenance/faults")
def get_faults(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(FaultObservation)
    if status:
        query = query.filter(FaultObservation.status == status)
    faults = query.order_by(FaultObservation.timestamp.desc()).all()

    return [
        {
            "id": f.id,
            "reporter": f.reporter,
            "reporter_role": f.reporter_role,
            "timestamp": f.timestamp.isoformat() if f.timestamp else None,
            "train_reference": f.train_reference,
            "corridor_id": f.corridor_id,
            "section_id": f.section_id,
            "track_name": f.track_name,
            "location_km": f.location_km,
            "location_description": f.location_description,
            "fault_title": f.fault_title,
            "description": f.description,
            "department_id": f.department_id,
            "severity": f.severity,
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
            "source_type": f.source_type
        }
        for f in faults
    ]

@router.post("/maintenance/faults")
def create_fault(req: FaultCreateRequest, db: Session = Depends(get_db)):
    fault_id = f"FAULT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
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
    fault.human_decision_at = datetime.utcnow()
    fault.human_notes = req.notes

    if decision in ["CONFIRMED", "OVERRIDDEN"]:
        sev = req.override_severity or fault.ai_recommended_severity or fault.severity
        mode = req.override_mode or fault.ai_recommended_mode or "FULL_BLOCK"
        prot = req.override_protection or fault.ai_recommended_protection or "TRAFFIC_BLOCK"
        fault.severity = sev
        fault.status = "TASKED"

        # Create MaintenanceTask
        task_id = f"TASK-{fault.id.replace('FAULT-', '')}"
        existing_task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
        if not existing_task:
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
                status="PROPOSED",
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
            "status": t.status
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
