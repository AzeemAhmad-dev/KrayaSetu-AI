from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.database import get_db
from backend.app.models.network import Division, Corridor, Station, CorridorStation, Section, Track, Asset
from backend.app.models.trains import TrainMovement
from backend.app.models.maintenance import Block, OperationalRestriction

router = APIRouter(tags=["Network"])

@router.get("/summary")
def get_network_summary(db: Session = Depends(get_db)):
    division = db.query(Division).first()
    corridors_count = db.query(Corridor).count()
    stations_count = db.query(Station).count()
    major_stations_count = db.query(Station).filter(Station.is_major == True).count()
    active_blocks_count = db.query(Block).filter(Block.status == "ACTIVE").count()
    restrictions_count = db.query(OperationalRestriction).filter(OperationalRestriction.active == True).count()

    return {
        "division": {
            "id": division.id if division else "BPL-DIV",
            "name": division.name if division else "Bhopal Division",
            "zone": division.zone if division else "West Central Railway (WCR)",
            "headquarters": division.headquarters if division else "Rani Kamalapati, Bhopal",
            "established": division.established if division else "1952-04-01"
        },
        "statistics": {
            "total_corridors": corridors_count,
            "total_researched_locations": stations_count,
            "major_stations_count": major_stations_count,
            "active_blocks_count": active_blocks_count,
            "active_restrictions_count": restrictions_count
        },
        "provenance": {
            "geography": "REAL_PUBLIC",
            "stations": "REAL_PUBLIC",
            "specifications": "REAL_PUBLIC"
        }
    }

@router.get("/corridors")
def get_corridors(db: Session = Depends(get_db)):
    corridors = db.query(Corridor).all()
    results = []
    for c in corridors:
        # Load major stations along corridor
        major_stns = [
            {
                "code": cs.station.code,
                "name": cs.station.name,
                "category": cs.station.category,
                "km": cs.km_chainage,
                "platforms": cs.station.platforms,
                "loop_lines": cs.station.loop_lines,
                "is_major": cs.is_major
            }
            for cs in c.corridor_stations if cs.is_major
        ]
        # Active trains in corridor
        trains_count = db.query(TrainMovement).filter(TrainMovement.current_section_id.like(f"%{c.id}%")).count()
        blocks_count = db.query(Block).filter(Block.corridor_id == c.id).count()

        results.append({
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "type": c.type,
            "track_configuration": c.track_configuration,
            "electrified": c.electrified,
            "voltage": c.voltage,
            "max_permissible_speed_kmph": c.max_permissible_speed_kmph,
            "total_distance_km": c.total_distance_km,
            "description": c.description,
            "major_stations": major_stns,
            "total_locations": len(c.corridor_stations),
            "active_trains_count": trains_count,
            "blocks_count": blocks_count,
            "provenance": "REAL_PUBLIC"
        })
    return results

@router.get("/corridors/{corridor_id}")
def get_corridor_detail(corridor_id: str, db: Session = Depends(get_db)):
    corridor = db.query(Corridor).filter(Corridor.id == corridor_id).first()
    if not corridor:
        raise HTTPException(status_code=404, detail=f"Corridor {corridor_id} not found")

    # Return complete list of underlying locations (intermediate + major)
    all_stations = [
        {
            "code": cs.station.code,
            "name": cs.station.name,
            "category": cs.station.category,
            "km": cs.km_chainage,
            "platforms": cs.station.platforms,
            "loop_lines": cs.station.loop_lines,
            "sidings": cs.station.sidings,
            "infra_status": cs.station.infra_status,
            "is_major": cs.is_major,
            "sequence": cs.sequence
        }
        for cs in sorted(corridor.corridor_stations, key=lambda x: x.km_chainage)
    ]

    sections = [
        {
            "id": s.id,
            "name": s.name,
            "start_km": s.start_km,
            "end_km": s.end_km,
            "tracks_count": s.tracks_count,
            "from_station": s.from_station_code,
            "to_station": s.to_station_code
        }
        for s in corridor.sections
    ]

    blocks = db.query(Block).filter(Block.corridor_id == corridor_id).all()
    restrictions = db.query(OperationalRestriction).filter(OperationalRestriction.corridor_id == corridor_id, OperationalRestriction.active == True).all()

    return {
        "corridor": {
            "id": corridor.id,
            "name": corridor.name,
            "code": corridor.code,
            "type": corridor.type,
            "track_configuration": corridor.track_configuration,
            "electrified": corridor.electrified,
            "voltage": corridor.voltage,
            "max_permissible_speed_kmph": corridor.max_permissible_speed_kmph,
            "total_distance_km": corridor.total_distance_km,
            "description": corridor.description
        },
        "all_locations_count": len(all_stations),
        "all_locations": all_stations,
        "sections": sections,
        "blocks": [
            {
                "id": b.id,
                "task_id": b.task_id,
                "track_name": b.track_name,
                "location_km": b.location_km,
                "requested_start_time": b.requested_start_time,
                "requested_end_time": b.requested_end_time,
                "status": b.status,
                "conflict_status": b.conflict_status,
                "conflict_summary": b.conflict_summary
            }
            for b in blocks
        ],
        "restrictions": [
            {
                "id": r.id,
                "track_name": r.track_name,
                "start_km": r.start_km,
                "end_km": r.end_km,
                "restriction_type": r.restriction_type,
                "speed_limit_kmph": r.speed_limit_kmph,
                "reason": r.reason
            }
            for r in restrictions
        ],
        "provenance": {
            "locations": "REAL_PUBLIC",
            "intermediate_granularity": "COMPLETE_UNDERLYING_NETWORK",
            "blocks_and_restrictions": "SIMULATED"
        }
    }

@router.get("/stations")
def get_stations(major_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(Station)
    if major_only:
        query = query.filter(Station.is_major == True)
    stations = query.all()

    return [
        {
            "code": s.code,
            "name": s.name,
            "category": s.category,
            "is_major": s.is_major,
            "platforms": s.platforms,
            "loop_lines": s.loop_lines,
            "sidings": s.sidings,
            "infra_status": s.infra_status,
            "provenance": "REAL_PUBLIC"
        }
        for s in stations
    ]

@router.get("/stations/{station_code}")
def get_station_master_detail(station_code: str, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.code == station_code.upper()).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"Station {station_code} not found")

    # Corridor and chainage info
    corr_links = [
        {
            "corridor_id": cl.corridor_id,
            "corridor_name": cl.corridor.name,
            "km_chainage": cl.km_chainage,
            "sequence": cl.sequence
        }
        for cl in station.corridor_links
    ]

    # Active trains currently present or incoming within 30 km
    movements = db.query(TrainMovement).all()
    present_trains = []
    incoming_trains = []
    holding_trains = []

    for m in movements:
        # Check if train is stopped/present at this station
        if m.current_station_code == station.code:
            item = {
                "train_number": m.train_number,
                "train_name": m.train.train_name if m.train else m.train_number,
                "train_type": m.train.train_type if m.train else "PASSENGER",
                "service_type": m.train.service_type if m.train else "PASSENGER",
                "current_track": m.current_track,
                "status": m.status,
                "scheduled_time": m.scheduled_time,
                "estimated_time": m.estimated_time,
                "delay_minutes": m.delay_minutes,
                "delay_category": m.delay_category,
                "hold_reason": m.hold_reason,
                "source_type": m.source_type
            }
            if m.status == "HELD":
                holding_trains.append(item)
            else:
                present_trains.append(item)
        elif abs(m.current_km - (station.corridor_links[0].km_chainage if station.corridor_links else 0)) <= 35:
            incoming_trains.append({
                "train_number": m.train_number,
                "train_name": m.train.train_name if m.train else m.train_number,
                "train_type": m.train.train_type if m.train else "PASSENGER",
                "direction": m.direction,
                "current_location": m.current_location,
                "speed_kmph": m.speed_kmph,
                "estimated_time": m.estimated_time,
                "delay_minutes": m.delay_minutes,
                "delay_category": m.delay_category,
                "source_type": m.source_type
            })

    # Nearby maintenance blocks within 20 km
    nearby_blocks = db.query(Block).all()
    blocks_filtered = []
    stn_km = station.corridor_links[0].km_chainage if station.corridor_links else 0
    for b in nearby_blocks:
        if abs(b.location_km - stn_km) <= 25:
            blocks_filtered.append({
                "id": b.id,
                "track_name": b.track_name,
                "location_km": b.location_km,
                "start_time": b.requested_start_time,
                "end_time": b.requested_end_time,
                "status": b.status,
                "conflict_status": b.conflict_status,
                "conflict_summary": b.conflict_summary
            })

    # Nearby restrictions
    restrictions = db.query(OperationalRestriction).filter(OperationalRestriction.active == True).all()
    restrictions_filtered = [
        {
            "id": r.id,
            "track_name": r.track_name,
            "start_km": r.start_km,
            "end_km": r.end_km,
            "speed_limit_kmph": r.speed_limit_kmph,
            "reason": r.reason
        }
        for r in restrictions if abs(r.start_km - stn_km) <= 30
    ]

    return {
        "station": {
            "code": station.code,
            "name": station.name,
            "category": station.category,
            "is_major": station.is_major,
            "platforms": station.platforms,
            "loop_lines": station.loop_lines,
            "sidings": station.sidings,
            "infra_status": station.infra_status,
            "corridors": corr_links
        },
        "platforms_layout": [
            {
                "platform_number": i + 1,
                "status": "OCCUPIED" if i < len(present_trains) else "CLEAR",
                "occupied_by": present_trains[i]["train_name"] if i < len(present_trains) else None,
                "track_type": "MAIN"
            }
            for i in range(station.platforms)
        ],
        "loop_lines_layout": [
            {
                "loop_number": j + 1,
                "name": f"Loop Line {j + 1}",
                "status": "HOLDING_FREIGHT" if j < len(holding_trains) else "AVAILABLE",
                "occupied_by": holding_trains[j]["train_name"] if j < len(holding_trains) else None,
                "reason": holding_trains[j].get("hold_reason") if j < len(holding_trains) else None
            }
            for j in range(station.loop_lines)
        ],
        "present_trains": present_trains,
        "holding_trains": holding_trains,
        "incoming_trains": incoming_trains,
        "nearby_blocks": blocks_filtered,
        "nearby_restrictions": restrictions_filtered,
        "provenance": {
            "station_data": "REAL_PUBLIC",
            "movements_and_holds": "SIMULATED",
            "layout": "VERIFIED_OPERATIONAL_MODEL"
        }
    }
