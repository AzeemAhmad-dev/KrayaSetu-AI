from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.trains import Train, TrainSchedule, TrainMovement

router = APIRouter(tags=["Trains"])

@router.get("/trains")
def get_trains(service_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Train)
    if service_type:
        query = query.filter(Train.service_type == service_type.upper())
    trains = query.all()

    results = []
    for t in trains:
        m = t.movement
        results.append({
            "train_number": t.train_number,
            "train_id": t.train_id,
            "train_name": t.train_name,
            "train_type": t.train_type,
            "service_type": t.service_type,
            "origin": t.origin,
            "destination": t.destination,
            "direction": t.direction,
            "priority": t.priority,
            "source_type": t.source_type,
            "cargo_type": t.cargo_type,
            "current_location": m.current_location if m else "Unknown",
            "current_track": m.current_track if m else "DOWN_MAIN",
            "current_km": m.current_km if m else 0.0,
            "scheduled_time": m.scheduled_time if m else "12:00",
            "estimated_time": m.estimated_time if m else "12:00",
            "delay_minutes": m.delay_minutes if m else 0,
            "delay_category": m.delay_category if m else "ON_TIME",
            "status": m.status if m else "RUNNING",
            "hold_location": m.hold_location if m else None,
            "hold_reason": m.hold_reason if m else None,
            "movement_source_type": m.source_type if m else "SIMULATED"
        })
    return results

@router.get("/train-movements")
def get_train_movements(db: Session = Depends(get_db)):
    movements = db.query(TrainMovement).all()
    results = []
    for m in movements:
        t = m.train
        results.append({
            "train_number": m.train_number,
            "train_name": t.train_name if t else m.train_number,
            "train_type": t.train_type if t else "PASSENGER",
            "service_type": t.service_type if t else "PASSENGER",
            "origin": t.origin if t else "Unknown",
            "destination": t.destination if t else "Unknown",
            "direction": m.direction,
            "priority": t.priority if t else 3,
            "current_location": m.current_location,
            "current_station_code": m.current_station_code,
            "current_section_id": m.current_section_id,
            "current_track": m.current_track,
            "current_km": m.current_km,
            "speed_kmph": m.speed_kmph,
            "scheduled_time": m.scheduled_time,
            "estimated_time": m.estimated_time,
            "delay_minutes": m.delay_minutes,
            "delay_category": m.delay_category,
            "status": m.status,
            "hold_location": m.hold_location,
            "hold_reason": m.hold_reason,
            "hold_start_time": m.hold_start_time,
            "hold_end_time": m.hold_end_time,
            "cargo_type": t.cargo_type if t else None,
            "source_type": m.source_type, # SIMULATED
            "train_source_type": t.source_type if t else "REAL_PUBLIC", # REAL_PUBLIC or SYNTHETIC
            "updated_at": m.updated_at.isoformat() if m.updated_at else None
        })
    return results

@router.get("/trains/{train_number}")
def get_train_detail(train_number: str, db: Session = Depends(get_db)):
    train = db.query(Train).filter(Train.train_number == train_number).first()
    if not train:
        raise HTTPException(status_code=404, detail=f"Train {train_number} not found")

    sched = [
        {
            "sequence": s.sequence,
            "station_code": s.station_code,
            "station_name": s.station_name,
            "scheduled_arrival": s.scheduled_arrival,
            "scheduled_departure": s.scheduled_departure,
            "halt_minutes": s.halt_minutes,
            "km": s.km_from_origin
        }
        for s in train.schedules
    ]

    m = train.movement
    movement_info = {
        "current_location": m.current_location if m else None,
        "current_track": m.current_track if m else None,
        "current_km": m.current_km if m else 0.0,
        "speed_kmph": m.speed_kmph if m else 0.0,
        "scheduled_time": m.scheduled_time if m else None,
        "estimated_time": m.estimated_time if m else None,
        "delay_minutes": m.delay_minutes if m else 0,
        "delay_category": m.delay_category if m else "ON_TIME",
        "status": m.status if m else "RUNNING",
        "hold_location": m.hold_location if m else None,
        "hold_reason": m.hold_reason if m else None,
        "source_type": m.source_type if m else "SIMULATED"
    } if m else None

    return {
        "train_number": train.train_number,
        "train_id": train.train_id,
        "train_name": train.train_name,
        "train_type": train.train_type,
        "service_type": train.service_type,
        "origin": train.origin,
        "destination": train.destination,
        "direction": train.direction,
        "priority": train.priority,
        "source_type": train.source_type, # REAL_PUBLIC or SYNTHETIC
        "cargo_type": train.cargo_type,
        "schedule": sched,
        "movement": movement_info
    }
