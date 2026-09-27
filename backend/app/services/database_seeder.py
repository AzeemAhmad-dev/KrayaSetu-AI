"""
Database Seeder Service for KrayaSetu AI
Smart India Hackathon Problem Statement 26027 | Bhopal Division (WCR)

Ensures that whenever the backend starts on a fresh environment (e.g. Render cloud deployment
where the SQLite database is not committed to git), the canonical network infrastructure,
train timetables, active train movements, and 50 blocks are automatically and idempotently seeded.
"""

import os
import json
import logging
from typing import Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.database import engine, SessionLocal, Base
from backend.app.models.network import Division, Corridor, Station, CorridorStation, Section, Track, Asset
from backend.app.models.trains import Train, TrainSchedule, TrainMovement, TrainEvent
from backend.app.models.maintenance import Department, WorkType, Equipment, FaultObservation, MaintenanceTask, Block
from backend.app.models.events import Scenario, EventLog
from backend.app.services.movement_engine import MovementEngine
from backend.app.services.freight_generator import get_freight_trains
from backend.app.services.scenario_service import initialize_scenarios
from backend.app.services.event_logger import log_event

logger = logging.getLogger("krayasetu.seeder")


def seed_network_and_trains(db: Session) -> Dict[str, int]:
    """
    Populates division network topology, departments, equipment, trains, and train movements
    from data/bhopal_division_network.json, data/maintenance_rules.json, and data/timetables.json.
    """
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))

    # 1. Division & Corridors
    network_path = os.path.join(data_dir, "bhopal_division_network.json")
    if not os.path.exists(network_path):
        logger.warning(f"Network data file not found at {network_path}")
        return {"error": "Network data missing"}

    with open(network_path, "r", encoding="utf-8") as f:
        network_data = json.load(f)

    div_info = network_data["division"]
    division = db.query(Division).filter(Division.id == "BPL-DIV").first()
    if not division:
        division = Division(
            id="BPL-DIV",
            name=div_info["division_name"],
            zone=div_info["zone"],
            headquarters=div_info["headquarters"],
            established=div_info["established"]
        )
        db.add(division)
        db.commit()

    inserted_stations = set(s.code for s in db.query(Station).all())
    corridors_added = 0

    for c in network_data["corridors"]:
        corr = db.query(Corridor).filter(Corridor.id == c["id"]).first()
        if not corr:
            corr = Corridor(
                id=c["id"],
                division_id=division.id,
                name=c["name"],
                code=c["code"],
                type=c["type"],
                track_configuration=c["track_configuration"],
                electrified=c["electrified"],
                voltage=c["voltage"],
                max_permissible_speed_kmph=c["max_permissible_speed_kmph"],
                total_distance_km=c["total_distance_km"],
                description=c["description"]
            )
            db.add(corr)
            corridors_added += 1

        stations_list = c["stations"]
        for idx, s in enumerate(stations_list):
            code = s["code"]
            if code not in inserted_stations:
                station = Station(
                    code=code,
                    name=s["name"],
                    category=s["category"],
                    is_major=s["is_major"],
                    platforms=s["platforms"],
                    loop_lines=s["loop_lines"],
                    sidings=s["sidings"],
                    infra_status=s["infra_status"]
                )
                db.add(station)
                inserted_stations.add(code)

            cs_id = f"{c['id']}_{code}"
            if not db.query(CorridorStation).filter(CorridorStation.id == cs_id).first():
                corr_stn = CorridorStation(
                    id=cs_id,
                    corridor_id=c["id"],
                    station_code=code,
                    km_chainage=s["km"],
                    sequence=idx + 1,
                    is_major=s["is_major"]
                )
                db.add(corr_stn)

            if idx > 0:
                prev_s = stations_list[idx - 1]
                sec_id = f"SEC-{c['id']}-{prev_s['code']}-{code}"
                if not db.query(Section).filter(Section.id == sec_id).first():
                    sec = Section(
                        id=sec_id,
                        corridor_id=c["id"],
                        from_station_code=prev_s["code"],
                        to_station_code=code,
                        name=f"{prev_s['name']} – {s['name']}",
                        start_km=prev_s["km"],
                        end_km=s["km"],
                        tracks_count=3 if c["track_configuration"] == "TRIPLE_LINE" else (2 if c["track_configuration"] == "DOUBLE_LINE" else 1)
                    )
                    db.add(sec)

                    track_up = Track(
                        id=f"{sec_id}-UP",
                        section_id=sec_id,
                        name="UP_MAIN",
                        track_type="MAIN",
                        direction="UP",
                        electrified=True,
                        speed_limit_kmph=c["max_permissible_speed_kmph"]
                    )
                    track_down = Track(
                        id=f"{sec_id}-DOWN",
                        section_id=sec_id,
                        name="DOWN_MAIN",
                        track_type="MAIN",
                        direction="DOWN",
                        electrified=True,
                        speed_limit_kmph=c["max_permissible_speed_kmph"]
                    )
                    db.add(track_up)
                    db.add(track_down)

                    if c["track_configuration"] == "TRIPLE_LINE":
                        track_3rd = Track(
                            id=f"{sec_id}-3RD",
                            section_id=sec_id,
                            name="THIRD_LINE",
                            track_type="MAIN",
                            direction="BI_DIRECTIONAL",
                            electrified=True,
                            speed_limit_kmph=100
                        )
                        db.add(track_3rd)

    db.commit()

    # 2. Departments & WorkTypes & Equipment
    rules_path = os.path.join(data_dir, "maintenance_rules.json")
    if os.path.exists(rules_path):
        with open(rules_path, "r", encoding="utf-8") as f:
            rules_data = json.load(f)

        for d in rules_data["departments"]:
            if not db.query(Department).filter(Department.id == d["id"]).first():
                db.add(Department(id=d["id"], name=d["name"], description=d["description"]))

            for wt in d["work_types"]:
                if not db.query(WorkType).filter(WorkType.id == wt["id"]).first():
                    db.add(WorkType(
                        id=wt["id"],
                        department_id=d["id"],
                        name=wt["name"],
                        compatible_modes=wt["mode"],
                        default_protection=wt["protection"],
                        default_duration_mins=wt["default_duration_mins"],
                        requires_power_isolation=wt["requires_power_isolation"],
                        requires_track_occupation=wt["requires_track_occupation"],
                        compatible_with_train_movement=wt.get("compatible_with_train_movement", False)
                    ))

        for eq in rules_data["equipment_registry"]:
            if not db.query(Equipment).filter(Equipment.id == eq["id"]).first():
                db.add(Equipment(
                    id=eq["id"],
                    department_id=eq["assigned_department"],
                    name=eq["name"],
                    type=eq["type"],
                    base_station_code=eq["base_station"],
                    status=eq["status"]
                ))
        db.commit()

    # 3. Trains & Timetables
    tt_path = os.path.join(data_dir, "timetables.json")
    trains_added = 0
    if os.path.exists(tt_path):
        with open(tt_path, "r", encoding="utf-8") as f:
            tt_data = json.load(f)

        for pt in tt_data["passenger_trains"]:
            if not db.query(Train).filter(Train.train_number == pt["train_number"]).first():
                db.add(Train(
                    train_number=pt["train_number"],
                    train_id=pt["train_number"],
                    train_name=pt["train_name"],
                    train_type=pt["train_type"],
                    service_type=pt["service_type"],
                    origin=pt["origin"],
                    destination=pt["destination"],
                    corridor_id=pt["corridor_id"],
                    direction=pt["direction"],
                    priority=pt["priority"],
                    source_type=pt["source_type"]
                ))
                trains_added += 1

                for idx, s in enumerate(pt["schedule"]):
                    db.add(TrainSchedule(
                        train_number=pt["train_number"],
                        station_code=s["station_code"],
                        station_name=s["station_name"],
                        sequence=idx + 1,
                        scheduled_arrival=s["arrival"],
                        scheduled_departure=s["departure"],
                        halt_minutes=s["halt_minutes"],
                        km_from_origin=s["km"]
                    ))

        for ft in tt_data["freight_templates"]:
            if not db.query(Train).filter(Train.train_number == ft["freight_id"]).first():
                db.add(Train(
                    train_number=ft["freight_id"],
                    train_id=ft["freight_id"],
                    train_name=f"{ft['freight_id']} ({ft['cargo_type']} Rake)",
                    train_type="FREIGHT",
                    service_type="FREIGHT",
                    origin=ft["origin_region"],
                    destination=ft["destination_region"],
                    corridor_id=ft["corridor_id"],
                    direction=ft["direction"],
                    priority=4,
                    source_type=ft["source_type"],
                    cargo_type=ft["cargo_type"]
                ))
                trains_added += 1

        db.commit()

        # 4. Movements
        if db.query(TrainMovement).count() == 0:
            movement_engine = MovementEngine()
            pass_movements = movement_engine.simulate_passenger_movements(tt_data["passenger_trains"], scenario_id="NORMAL")
            freight_movements = movement_engine.simulate_freight_movements(tt_data["freight_templates"], scenario_id="NORMAL")
            all_movements = pass_movements + freight_movements

            for m in all_movements:
                db.add(TrainMovement(
                    id=f"MOV-{m['train_number']}",
                    train_number=m["train_number"],
                    current_location=m["current_location"],
                    current_station_code=m.get("current_station_code"),
                    current_section_id=m.get("current_section_id"),
                    current_track=m["current_track"],
                    current_km=m["current_km"],
                    direction=m["direction"],
                    speed_kmph=m["speed_kmph"],
                    scheduled_time=m["scheduled_time"],
                    estimated_time=m["estimated_time"],
                    delay_minutes=m["delay_minutes"],
                    delay_category=m["delay_category"],
                    status=m["status"],
                    hold_location=m.get("hold_location"),
                    hold_reason=m.get("hold_reason"),
                    hold_start_time=m.get("hold_start_time"),
                    hold_end_time=m.get("hold_end_time"),
                    source_type=m["source_type"],
                    updated_at=datetime.utcnow()
                ))
            db.commit()

    # 5. Scenarios
    initialize_scenarios(db)
    db.commit()

    return {
        "corridors": db.query(Corridor).count(),
        "stations": db.query(Station).count(),
        "trains": db.query(Train).count(),
        "movements": db.query(TrainMovement).count(),
    }


def ensure_database_seeded() -> Dict[str, Any]:
    """
    Idempotent health-check and auto-seeder called on application startup.
    Ensures that an unseeded environment (like a freshly spun Render instance)
    is fully populated with Bhopal Division topology, trains, and canonical blocks.
    """
    db = SessionLocal()
    try:
        corridor_count = db.query(Corridor).count()
        train_count = db.query(Train).count()
        block_count = db.query(Block).count()

        status = {
            "initial_corridors": corridor_count,
            "initial_trains": train_count,
            "initial_blocks": block_count,
            "seeded_network": False,
            "seeded_blocks": False
        }

        if corridor_count == 0 or train_count == 0:
            logger.info("Empty network/train tables detected. Running baseline seeder...")
            seed_res = seed_network_and_trains(db)
            status["seeded_network"] = True
            status["network_details"] = seed_res

        if block_count == 0:
            logger.info("No maintenance blocks detected. Populating 50 canonical blocks...")
            from scripts.populate_four_block_dataset import populate_four_block_dataset
            block_res = populate_four_block_dataset(seed=42)
            status["seeded_blocks"] = True
            status["block_details"] = block_res

        return status
    except Exception as e:
        logger.error(f"Error during ensure_database_seeded: {e}", exc_info=True)
        return {"error": str(e)}
    finally:
        db.close()
