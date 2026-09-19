import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database import engine, SessionLocal, Base
from backend.app.models.network import Division, Corridor, Station, CorridorStation, Section, Track, Asset
from backend.app.models.trains import Train, TrainSchedule, TrainMovement, TrainEvent
from backend.app.models.maintenance import Department, WorkType, Equipment, FaultObservation, MaintenanceTask, Block, OperationalRestriction
from backend.app.models.events import Scenario, EventLog
from backend.app.services.movement_engine import MovementEngine
from backend.app.services.freight_generator import get_freight_trains
from backend.app.services.scenario_service import initialize_scenarios
from backend.app.services.event_logger import log_event

def seed_db():
    print("Dropping existing tables and recreating schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # 1. Load Network Data
    network_path = os.path.join(os.path.dirname(__file__), "..", "data", "bhopal_division_network.json")
    with open(network_path, "r", encoding="utf-8") as f:
        network_data = json.load(f)

    div_info = network_data["division"]
    division = Division(
        id="BPL-DIV",
        name=div_info["division_name"],
        zone=div_info["zone"],
        headquarters=div_info["headquarters"],
        established=div_info["established"]
    )
    db.add(division)

    inserted_stations = set()

    for c in network_data["corridors"]:
        corridor = Corridor(
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
        db.add(corridor)

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

            # Link Station to this Corridor with specific chainage
            corr_stn = CorridorStation(
                id=f"{c['id']}_{code}",
                corridor_id=c["id"],
                station_code=code,
                km_chainage=s["km"],
                sequence=idx + 1,
                is_major=s["is_major"]
            )
            db.add(corr_stn)

            # Create physical section between adjacent stations
            if idx > 0:
                prev_s = stations_list[idx - 1]
                sec_id = f"SEC-{c['id']}-{prev_s['code']}-{code}"
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
    print(f"Seeded Division, Corridors, {len(inserted_stations)} unique Stations, CorridorStations, Sections, and Tracks.")

    # 2. Seed Maintenance Rules, Departments, and Equipment
    rules_path = os.path.join(os.path.dirname(__file__), "..", "data", "maintenance_rules.json")
    with open(rules_path, "r", encoding="utf-8") as f:
        rules_data = json.load(f)

    for d in rules_data["departments"]:
        dept = Department(id=d["id"], name=d["name"], description=d["description"])
        db.add(dept)

        for wt in d["work_types"]:
            work_type = WorkType(
                id=wt["id"],
                department_id=d["id"],
                name=wt["name"],
                compatible_modes=wt["mode"],
                default_protection=wt["protection"],
                default_duration_mins=wt["default_duration_mins"],
                requires_power_isolation=wt["requires_power_isolation"],
                requires_track_occupation=wt["requires_track_occupation"],
                compatible_with_train_movement=wt.get("compatible_with_train_movement", False)
            )
            db.add(work_type)

    for eq in rules_data["equipment_registry"]:
        equipment = Equipment(
            id=eq["id"],
            department_id=eq["assigned_department"],
            name=eq["name"],
            type=eq["type"],
            base_station_code=eq["base_station"],
            status=eq["status"]
        )
        db.add(equipment)

    db.commit()
    print("Seeded Departments, Work Types, and Equipment Registry.")

    # 3. Seed Passenger Trains and Timetables
    tt_path = os.path.join(os.path.dirname(__file__), "..", "data", "timetables.json")
    with open(tt_path, "r", encoding="utf-8") as f:
        tt_data = json.load(f)

    for pt in tt_data["passenger_trains"]:
        train = Train(
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
        )
        db.add(train)

        for idx, s in enumerate(pt["schedule"]):
            sched = TrainSchedule(
                train_number=pt["train_number"],
                station_code=s["station_code"],
                station_name=s["station_name"],
                sequence=idx + 1,
                scheduled_arrival=s["arrival"],
                scheduled_departure=s["departure"],
                halt_minutes=s["halt_minutes"],
                km_from_origin=s["km"]
            )
            db.add(sched)

    # 4. Seed Synthetic Freight Trains
    for ft in tt_data["freight_templates"]:
        freight = Train(
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
        )
        db.add(freight)

    db.commit()
    print("Seeded Passenger Trains, Timetable Schedules, and Synthetic Freight trains.")

    # 5. Seed Real-time / Simulated Movements
    movement_engine = MovementEngine()
    pass_movements = movement_engine.simulate_passenger_movements(tt_data["passenger_trains"], scenario_id="NORMAL")
    freight_movements = movement_engine.simulate_freight_movements(tt_data["freight_templates"], scenario_id="NORMAL")

    all_movements = pass_movements + freight_movements
    for m in all_movements:
        tm = TrainMovement(
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
        )
        db.add(tm)

    db.commit()
    print(f"Seeded {len(all_movements)} Train Movements (Simulated Passenger & Synthetic Freight).")

    # 6. Operational records (faults, tasks, blocks, restrictions) start clean and empty
    # Operational records are created dynamically by users and system workflows.

    # 8. Seed Scenarios
    initialize_scenarios(db)

    # 9. Initial Event Logs
    log_event(
        db=db,
        actor="KrayaSetu AI Initializer",
        role="SYSTEM",
        entity="SYSTEM",
        entity_id="BPL-DIV",
        action="SYSTEM_INITIALIZED",
        new_state="ACTIVE",
        reason="Bhopal Division operational network model loaded from authoritative WCR and public timetable data.",
        provenance="REAL_PUBLIC"
    )

    db.commit()
    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_db()
