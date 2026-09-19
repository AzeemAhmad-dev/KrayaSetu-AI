import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.app.database import get_db
from backend.app.models.trains import Train, TrainSchedule, TrainMovement
from backend.app.data.railradar import railradar_client

router = APIRouter(tags=["Trains"])

def compute_dynamic_estimated_time(scheduled_time: Optional[str], delay_minutes: int) -> str:
    """
    Dynamically computes estimated_time from scheduled_time (HH:MM format) and delay_minutes.
    Uses standard integer minute arithmetic with modulo 1440 to properly handle midnight crossovers.
    """
    if not scheduled_time:
        return "12:00"
    try:
        parts = scheduled_time.strip().split(":")
        if len(parts) >= 2:
            hours = int(parts[0])
            minutes = int(parts[1])
            total_minutes = (hours * 60 + minutes + int(delay_minutes)) % 1440
            return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    except (ValueError, TypeError):
        pass
    return scheduled_time


def compute_dynamic_delay_category(delay_minutes: int) -> str:
    """
    Recomputes delay_category from delay_minutes based on standard railway thresholds:
    - delay <= 5: ON_TIME
    - 5 < delay <= 15: MINOR
    - 15 < delay <= 45: MODERATE
    - 45 < delay <= 90: HEAVY
    - delay > 90: SEVERE
    """
    d = int(delay_minutes)
    if d <= 5:
        return "ON_TIME"
    elif d <= 15:
        return "MINOR"
    elif d <= 45:
        return "MODERATE"
    elif d <= 90:
        return "HEAVY"
    return "SEVERE"


@router.get("/trains")
def get_trains(service_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Train)
    if service_type:
        query = query.filter(Train.service_type == service_type.upper())
    trains = query.all()

    results = []
    for t in trains:
        m = t.movement
        delay_mins = m.delay_minutes if m else 0
        sched_time = m.scheduled_time if m else "12:00"
        est_time = compute_dynamic_estimated_time(sched_time, delay_mins)
        delay_cat = compute_dynamic_delay_category(delay_mins)
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
            "scheduled_time": sched_time,
            "estimated_time": est_time,
            "delay_minutes": delay_mins,
            "delay_category": delay_cat,
            "status": m.status if m else "RUNNING",
            "hold_location": m.hold_location if m else None,
            "hold_reason": m.hold_reason if m else None,
            "movement_source_type": m.source_type if m else "SIMULATED"
        })
    return results

@router.get("/train-movements")
async def get_train_movements(db: Session = Depends(get_db)):
    movements = db.query(TrainMovement).all()

    # 1. Clean up UUID Ghost Trains: filter out synthetic trains whose train_number is a 36-char UUID string
    filtered_movements = [
        m for m in movements
        if not (len(m.train_number) == 36 and m.train_number.count("-") == 4)
    ]

    # 2. Identify tracked primary passenger trains
    TRACKED_PASSENGER_TRAINS = {
        '12002', '12001', '20171', '20172', '12615', '12616', '12137', '18237', '11125'
    }

    trains_to_query = [
        m.train_number for m in filtered_movements
        if m.train_number in TRACKED_PASSENGER_TRAINS or (m.train_number.isdigit() and len(m.train_number) == 5)
    ]

    # 3. Concurrent background calls to railradar_client wrapped in asyncio.gather(..., return_exceptions=True)
    live_telemetry_map: Dict[str, Dict[str, Any]] = {}
    if trains_to_query:
        tasks = [railradar_client.get_live_train_status(tnum) for tnum in trains_to_query]
        query_results = await asyncio.gather(*tasks, return_exceptions=True)
        for tnum, res in zip(trains_to_query, query_results):
            if not isinstance(res, Exception) and isinstance(res, dict) and res.get("source") == "RAILRADAR_LIVE":
                live_telemetry_map[tnum] = res

    # 4. Build response: overlay live telemetry when available; gracefully fall back to SIMULATED
    results = []
    for m in filtered_movements:
        t = m.train
        live = live_telemetry_map.get(m.train_number)

        if live:
            delay_minutes = live.get("delay_minutes", m.delay_minutes)

            # Parse location from live telemetry
            loc_raw = live.get("current_location")
            if isinstance(loc_raw, dict):
                stn_name = loc_raw.get("stationName") or loc_raw.get("stationCode") or ""
                stn_status = loc_raw.get("status", "")
                if stn_status == "at-station":
                    current_location = f"{stn_name} (At Station)"
                elif stn_status == "in-transit":
                    current_location = f"Approaching {stn_name}"
                elif stn_name:
                    current_location = f"{stn_name} ({stn_status})"
                else:
                    current_location = m.current_location
                current_stn = loc_raw.get("stationCode") or m.current_station_code
                current_km = float(loc_raw.get("distanceFromOriginKm") or m.current_km)
                speed = float(loc_raw.get("speedKmh") or m.speed_kmph)
            elif isinstance(loc_raw, str) and loc_raw:
                current_location = loc_raw
                current_stn = m.current_station_code
                current_km = m.current_km
                speed = m.speed_kmph
            else:
                current_location = m.current_location
                current_stn = m.current_station_code
                current_km = m.current_km
                speed = m.speed_kmph

            # Map status
            raw_status = live.get("status")
            if raw_status:
                status_map = {
                    "running": "RUNNING",
                    "not-started": "SCHEDULED_HALT",
                    "completed": "COMPLETED",
                    "delayed": "DELAYED"
                }
                status = status_map.get(str(raw_status).lower(), str(raw_status).upper())
            else:
                status = m.status

            source_type = "RAILRADAR_LIVE"
        else:
            current_location = m.current_location
            current_stn = m.current_station_code
            current_km = m.current_km
            speed = m.speed_kmph
            delay_minutes = m.delay_minutes or 0
            status = m.status
            source_type = m.source_type or "SIMULATED"

        # Dynamically calculate estimated arrival time and delay category
        delay_category = compute_dynamic_delay_category(delay_minutes)
        estimated_time = compute_dynamic_estimated_time(m.scheduled_time, delay_minutes)

        results.append({
            "train_number": m.train_number,
            "train_name": t.train_name if t else m.train_number,
            "train_type": t.train_type if t else "PASSENGER",
            "service_type": t.service_type if t else "PASSENGER",
            "origin": t.origin if t else "Unknown",
            "destination": t.destination if t else "Unknown",
            "direction": m.direction,
            "priority": t.priority if t else 3,
            "current_location": current_location,
            "current_station_code": current_stn,
            "current_section_id": m.current_section_id,
            "current_track": m.current_track,
            "current_km": current_km,
            "speed_kmph": speed,
            "scheduled_time": m.scheduled_time,
            "estimated_time": estimated_time,
            "delay_minutes": delay_minutes,
            "delay_category": delay_category,
            "status": status,
            "hold_location": m.hold_location,
            "hold_reason": m.hold_reason,
            "hold_start_time": m.hold_start_time,
            "hold_end_time": m.hold_end_time,
            "cargo_type": t.cargo_type if t else None,
            "source_type": source_type,
            "train_source_type": t.source_type if t else "REAL_PUBLIC",
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
    delay_mins = m.delay_minutes if m else 0
    sched_time = m.scheduled_time if m else None
    est_time = compute_dynamic_estimated_time(sched_time, delay_mins) if sched_time else None
    delay_cat = compute_dynamic_delay_category(delay_mins)
    movement_info = {
        "current_location": m.current_location if m else None,
        "current_track": m.current_track if m else None,
        "current_km": m.current_km if m else 0.0,
        "speed_kmph": m.speed_kmph if m else 0.0,
        "scheduled_time": sched_time,
        "estimated_time": est_time,
        "delay_minutes": delay_mins,
        "delay_category": delay_cat,
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

@router.get("/trains/{train_number}/live")
async def get_train_live_telemetry(train_number: str, db: Session = Depends(get_db)):
    """
    Fetch live telemetry for a train from RailRadar API.
    Falls back gracefully to simulated/COA telemetry if RailRadar is unreachable or unconfigured.
    """
    train = db.query(Train).filter(Train.train_number == train_number).first()
    live_data = await railradar_client.get_live_train_status(train_number)
    
    movement = train.movement if train else None
    db_delay = movement.delay_minutes if movement else 0
    db_sched = movement.scheduled_time if movement else None
    db_est = compute_dynamic_estimated_time(db_sched, db_delay) if db_sched else None
    db_cat = compute_dynamic_delay_category(db_delay)
    return {
        "train_number": train_number,
        "train_name": train.train_name if train else train_number,
        "telemetry_source": live_data.get("source", "SIMULATED_COA"),
        "live_telemetry": live_data,
        "db_movement": {
            "current_location": movement.current_location if movement else None,
            "current_track": movement.current_track if movement else None,
            "current_km": movement.current_km if movement else 0.0,
            "scheduled_time": db_sched,
            "estimated_time": db_est,
            "delay_minutes": db_delay,
            "delay_category": db_cat,
            "status": movement.status if movement else "RUNNING"
        } if movement else None
    }

