import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.app.database import get_db
from backend.app.models.trains import Train, TrainSchedule, TrainMovement
from backend.app.data.railradar import railradar_client

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

            # Determine delay category
            if delay_minutes <= 5:
                delay_category = "ON_TIME"
            elif delay_minutes <= 15:
                delay_category = "MINOR"
            elif delay_minutes <= 45:
                delay_category = "MODERATE"
            elif delay_minutes <= 90:
                delay_category = "HEAVY"
            else:
                delay_category = "SEVERE"

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
            delay_minutes = m.delay_minutes
            delay_category = m.delay_category
            status = m.status
            source_type = m.source_type or "SIMULATED"

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
            "estimated_time": m.estimated_time,
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

@router.get("/trains/{train_number}/live")
async def get_train_live_telemetry(train_number: str, db: Session = Depends(get_db)):
    """
    Fetch live telemetry for a train from RailRadar API.
    Falls back gracefully to simulated/COA telemetry if RailRadar is unreachable or unconfigured.
    """
    train = db.query(Train).filter(Train.train_number == train_number).first()
    live_data = await railradar_client.get_live_train_status(train_number)
    
    movement = train.movement if train else None
    return {
        "train_number": train_number,
        "train_name": train.train_name if train else train_number,
        "telemetry_source": live_data.get("source", "SIMULATED_COA"),
        "live_telemetry": live_data,
        "db_movement": {
            "current_location": movement.current_location if movement else None,
            "current_track": movement.current_track if movement else None,
            "current_km": movement.current_km if movement else 0.0,
            "delay_minutes": movement.delay_minutes if movement else 0,
            "delay_category": movement.delay_category if movement else "ON_TIME",
            "status": movement.status if movement else "RUNNING"
        } if movement else None
    }

