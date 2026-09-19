# Exhaustive Semantic and Structural Audit: Data Pipelines & Mock Simulations
**Reference Build:** `JYOTI_REFERENCE`
**Port Build:** `SIH26027`

This report exhaustively documents the data generation pipelines, mock simulation scripts, database initialization, and atomic endpoints that exist in the `JYOTI_REFERENCE` build but failed to migrate to the `SIH26027` port.

## 1. Database Initialization (`krayasetu.db`) Divergence
In the `JYOTI_REFERENCE` build, the entire relational database state (network graph, timetables, maintenance rules, synthetic movements) is initialized dynamically via `scripts/seed_database.py` and saved to `krayasetu.db`.
In the `SIH26027` port, the `scripts` directory was abandoned. Database initialization was stripped down to a single 23-line file (`backend/app/db/database.py`) creating a `dispatcher.db` with one table (`DispatcherOverride`). No network, timetable, or schema initialization logic was migrated.

### Missing Script: `JYOTI_REFERENCE/scripts/seed_database.py` (Lines 1-289)
```python
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
```

## 2. Simulated Train Delays & Movement Engine Divergence
In `JYOTI_REFERENCE`, train movements and delays are generated dynamically via an internal physics/movement engine mapping delays probabilistically against network chainage.
In `SIH26027`, this was replaced with a hardcoded dictionary (`MOCK_PAYLOAD`) in `backend/app/data/producers.py` containing a static `train_movements` array. The services directory (`backend/app/services/`) was completely dropped.

### Missing Script: `JYOTI_REFERENCE/backend/app/services/movement_engine.py` (Lines 1-208)
```python
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
from backend.app.services.delay_simulator import simulate_train_delay, compute_delay_category

def parse_time_str(time_str: str) -> datetime:
    """Parses HH:MM into a dummy reference date."""
    h, m = map(int, time_str.split(":"))
    return datetime(2026, 9, 12, h, m)

def format_time_str(dt: datetime) -> str:
    return dt.strftime("%H:%M")

def compute_estimated_time(sched_time_str: str, delay_mins: int) -> str:
    sched_dt = parse_time_str(sched_time_str)
    est_dt = sched_dt + timedelta(minutes=delay_mins)
    return format_time_str(est_dt)

class MovementEngine:
    def __init__(self):
        network_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "bhopal_division_network.json")
        with open(network_path, "r", encoding="utf-8") as f:
            self.network = json.load(f)
        
        # Index stations by corridor and code
        self.corridor_stations: Dict[str, List[Dict[str, Any]]] = {}
        self.station_map: Dict[str, Dict[str, Any]] = {}
        for c in self.network.get("corridors", []):
            cid = c["id"]
            self.corridor_stations[cid] = c["stations"]
            for s in c["stations"]:
                self.station_map[s["code"]] = s

    def get_intermediate_progression(self, corridor_id: str, from_code: str, to_code: str) -> List[Dict[str, Any]]:
        """Returns the full sequence of intermediate locations between two stations."""
        stations = self.corridor_stations.get(corridor_id, [])
        codes = [s["code"] for s in stations]
        if from_code not in codes or to_code not in codes:
            return []
        
        idx1 = codes.index(from_code)
        idx2 = codes.index(to_code)
        step = 1 if idx1 <= idx2 else -1
        return [stations[i] for i in range(idx1, idx2 + step, step)]

    def simulate_passenger_movements(self, passenger_trains: List[Dict[str, Any]], scenario_id: str = "NORMAL", seed: int = 42) -> List[Dict[str, Any]]:
        movements = []
        for t in passenger_trains:
            tnum = t["train_number"]
            ttype = t["train_type"]
            cid = t["corridor_id"]
            direction = t["direction"]
            sched = t["schedule"]

            delay_mins, delay_cat = simulate_train_delay(tnum, ttype, scenario_id=scenario_id, seed=seed)

            # Pick a realistic snapshot along the schedule
            # For demonstration, we position trains along their corridor
            mid_idx = min(len(sched) // 2, len(sched) - 1)
            sched_stop = sched[mid_idx]
            sched_time = sched_stop["departure"]
            est_time = compute_estimated_time(sched_time, delay_mins)

            # Physical location interpolation: either at station or in section
            stn_code = sched_stop["station_code"]
            stn_info = self.station_map.get(stn_code, {})
            current_km = stn_info.get("km", 100.0)

            # Track assignment
            track = "DOWN_MAIN" if direction == "DOWN" else "UP_MAIN"

            # Determine operational state
            if delay_mins > 90:
                status = "DELAYED"
            elif sched_stop["halt_minutes"] > 0:
                status = "SCHEDULED_HALT"
            else:
                status = "RUNNING"

            # Fine-grained physical location name (intermediate location awareness)
            if stn_code == "BPL":
                current_loc = "Bhopal Junction (Platform 2)"
            elif stn_code == "RKMP":
                current_loc = "Rani Kamalapati (Platform 1)"
            elif stn_code == "BHS":
                current_loc = "Vidisha (Main Line)"
            elif stn_code == "BINA":
                current_loc = "Bina Junction (Platform 3)"
            elif stn_code == "ET":
                current_loc = "Itarsi Junction (Platform 4)"
            else:
                # Between stations
                current_loc = f"Section approaching {sched_stop['station_name']} (KM {current_km:.1f})"

            movements.append({
                "train_number": tnum,
                "train_id": tnum,
                "train_name": t["train_name"],
                "train_type": ttype,
                "service_type": "PASSENGER",
                "origin": t["origin"],
                "destination": t["destination"],
                "direction": direction,
                "priority": t["priority"],
                "current_location": current_loc,
                "current_station_code": stn_code,
                "current_section_id": f"SEC-{stn_code}",
                "current_track": track,
                "current_km": current_km,
                "speed_kmph": 0.0 if status == "SCHEDULED_HALT" else 95.0,
                "scheduled_time": sched_time,
                "estimated_time": est_time,
                "delay_minutes": delay_mins,
                "delay_category": delay_cat,
                "status": status,
                "hold_location": None,
                "hold_reason": None,
                "hold_start_time": None,
                "hold_end_time": None,
                "source_type": "SIMULATED",
                "provenance": "SIMULATED_CURRENT_MOVEMENT"
            })
        return movements

    def simulate_freight_movements(self, freight_templates: List[Dict[str, Any]], scenario_id: str = "NORMAL") -> List[Dict[str, Any]]:
        movements = []
        for f in freight_templates:
            fid = f["freight_id"]
            cargo = f["cargo_type"]
            cid = f["corridor_id"]
            direction = f["direction"]
            track = "DOWN_MAIN" if direction == "DOWN" else "UP_MAIN"

            # Check for simulated loop line holding
            if fid == "FREIGHT-F001":
                # Simulated holding at Sumer loop line for Shatabdi / Express clearance
                status = "HELD"
                hold_loc = "Sumer (Loop Line 1)"
                hold_reason = "Path/traffic sequencing for Superfast Shatabdi Exp"
                hold_start = "13:24"
                hold_end = "14:07"
                curr_km = 176.0
                curr_loc = "Sumer Loop Line 1 (Held for Precedence)"
                speed = 0.0
                sched_time = "13:20"
                est_time = "14:10"
                delay_mins = 50
                delay_cat = "MODERATE"
            elif fid == "FREIGHT-F003":
                # Container freight moving between Bir and Chhanera
                status = "RUNNING"
                hold_loc = None
                hold_reason = None
                hold_start = None
                hold_end = None
                curr_km = 45.5
                curr_loc = "Between Bir and Chhanera (KM 45.5)"
                speed = 72.0
                sched_time = "11:15"
                est_time = "11:30"
                delay_mins = 15
                delay_cat = "MINOR"
            else:
                status = "RUNNING"
                hold_loc = None
                hold_reason = None
                hold_start = None
                hold_end = None
                curr_km = 65.0
                curr_loc = f"Section near {f.get('entry_station', 'BINA')} (KM 65.0)"
                speed = 65.0
                sched_time = "12:00"
                est_time = "12:20"
                delay_mins = 20
                delay_cat = "MINOR"

            movements.append({
                "train_number": fid,
                "train_id": fid,
                "train_name": f"{fid} ({cargo} Rake)",
                "train_type": "FREIGHT",
                "service_type": "FREIGHT",
                "origin": f["origin_region"],
                "destination": f["destination_region"],
                "direction": direction,
                "priority": 4,
                "current_location": curr_loc,
                "current_station_code": f.get("preferred_hold_stations", ["SUMR"])[0] if status == "HELD" else None,
                "current_section_id": f"SEC-{cid}-FR",
                "current_track": "LOOP_1" if status == "HELD" else track,
                "current_km": curr_km,
                "speed_kmph": speed,
                "scheduled_time": sched_time,
                "estimated_time": est_time,
                "delay_minutes": delay_mins,
                "delay_category": delay_cat,
                "status": status,
                "hold_location": hold_loc,
                "hold_reason": hold_reason,
                "hold_start_time": hold_start,
                "hold_end_time": hold_end,
                "cargo_type": cargo,
                "source_type": "SYNTHETIC",
                "provenance": "SYNTHETIC_FREIGHT"
            })
        return movements
```

### Missing Script: `JYOTI_REFERENCE/backend/app/services/delay_simulator.py` (Lines 1-76)
```python
import random
from typing import Tuple

def compute_delay_category(delay_minutes: int) -> str:
    if delay_minutes <= 5:
        return "ON_TIME"
    elif delay_minutes <= 25:
        return "MINOR"
    elif delay_minutes <= 60:
        return "MODERATE"
    elif delay_minutes <= 180:
        return "HEAVY"
    else:
        return "SEVERE"

def simulate_train_delay(
    train_number: str,
    train_type: str,
    scenario_id: str = "NORMAL",
    seed: int = 42
) -> Tuple[int, str]:
    """
    Simulates delay based on train type, current scenario, and deterministic seed.
    Realistic distributions:
    - High priority (Vande Bharat / Shatabdi): 85% on time, 15% minor delay
    - Superfast (GT Express / Tamil Nadu): 70% on time, 20% minor, 10% moderate
    - Mail/Express (Punjab Mail): 60% on time, 25% minor, 15% moderate/heavy
    - Heavy delay scenario: targeted trains incur 120-240 mins delay
    """
    rng = random.Random(f"{seed}_{train_number}_{scenario_id}")

    if scenario_id == "HEAVY_DELAY":
        # Specific scenario injection: GT Express (12615) delayed by +3h55m (235 min)
        # Punjab Mail (12137) delayed by +1h45m (105 min)
        if train_number in ["12615", "12616"]:
            delay = 235 # +3h55m
            return delay, compute_delay_category(delay)
        elif train_number in ["12137", "12138"]:
            delay = 105 # +1h45m
            return delay, compute_delay_category(delay)

    # Standard distribution
    roll = rng.random()
    if train_type in ["VANDE_BHARAT", "SHATABDI"]:
        if roll < 0.82:
            delay = rng.randint(0, 4)
        elif roll < 0.95:
            delay = rng.randint(6, 18)
        else:
            delay = rng.randint(20, 35)
    elif train_type == "SUPERFAST":
        if roll < 0.70:
            delay = rng.randint(0, 5)
        elif roll < 0.90:
            delay = rng.randint(8, 24)
        elif roll < 0.97:
            delay = rng.randint(28, 55)
        else:
            delay = rng.randint(60, 95)
    elif train_type == "MAIL_EXPRESS":
        if roll < 0.60:
            delay = rng.randint(0, 5)
        elif roll < 0.85:
            delay = rng.randint(10, 30)
        else:
            delay = rng.randint(35, 75)
    else: # FREIGHT or PASSENGER
        if roll < 0.40:
            delay = rng.randint(0, 15)
        elif roll < 0.75:
            delay = rng.randint(20, 50)
        else:
            delay = rng.randint(55, 120)

    return delay, compute_delay_category(delay)
```

## 3. Synthetic Freight Flows Divergence
In `JYOTI_REFERENCE`, synthetic freight rakes (with logic for specific cargo types, loop line holding, and capacity impacts) are dynamically generated.
In `SIH26027`, no dynamic freight data generation exists.

### Missing Script: `JYOTI_REFERENCE/backend/app/services/freight_generator.py` (Lines 1-53)
```python
import json
import os
from typing import List, Dict, Any

def get_freight_trains(scenario_id: str = "NORMAL") -> List[Dict[str, Any]]:
    """
    Returns synthetic constrained freight movements.
    Respects corridor topology and infrastructure holding.
    """
    path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "timetables.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    freights = list(data.get("freight_templates", []))

    # In FREIGHT_HEAVY scenario, add extra synthetic rakes
    if scenario_id == "FREIGHT_HEAVY":
        extra_freight_1 = {
            "freight_id": "FREIGHT-F006",
            "cargo_type": "COAL",
            "origin_region": "Singrauli Coalfields",
            "destination_region": "Ropar Thermal Power Plant",
            "corridor_id": "CORR-01",
            "entry_station": "ET",
            "exit_station": "BINA",
            "direction": "UP",
            "trailing_load_tonnes": 5100,
            "wagon_type": "BOXN-HL",
            "max_speed_kmph": 70,
            "source_type": "SYNTHETIC",
            "holding_capability": True,
            "preferred_hold_stations": ["MDDP", "SUW", "BET"]
        }
        extra_freight_2 = {
            "freight_id": "FREIGHT-F007",
            "cargo_type": "CONTAINERS",
            "origin_region": "Guna Inland Depot",
            "destination_region": "Gwalior Industrial Siding",
            "corridor_id": "CORR-05",
            "entry_station": "GUNA",
            "exit_station": "GWL",
            "direction": "UP",
            "trailing_load_tonnes": 2900,
            "wagon_type": "BLCA",
            "max_speed_kmph": 85,
            "source_type": "SYNTHETIC",
            "holding_capability": True,
            "preferred_hold_stations": ["SVPI", "MOJ"]
        }
        freights.extend([extra_freight_1, extra_freight_2])

    return freights
```

## 4. "demo-reset" Atomic Endpoint Divergence
In `JYOTI_REFERENCE`, state isolation for demo sessions was maintained via the `/blocks/demo-reset` atomic endpoint.
In `SIH26027`, this endpoint was not migrated to `backend/app/main.py` or any router.

### Missing Code: `JYOTI_REFERENCE/backend/app/routers/blocks.py` (Lines 914-941)
```python
@router.post("/blocks/demo-reset")
@router.post("/demo/reset")
def reset_demo_blocks(db: Session = Depends(get_db)):
    """
    Safe Demo Reset:
    Clears temporary block proposals generated during controller demonstration runs.
    Does NOT touch maintenance tasks, faults, network infrastructure, or event logs.
    Restores block count to canonical baseline of 0 and maintenance tasks to PENDING.
    """
    # Reset any task status that was linked to a block back to PENDING
    blocks = db.query(Block).all()
    count = len(blocks)
    for b in blocks:
        if b.task:
            b.task.status = "PENDING"
    db.query(Block).delete()
    db.commit()
    return {
        "status": "SUCCESS",
        "cleared_blocks": count,
        "blocks_deleted": count,
        "message": f"Successfully reset {count} demonstration blocks. Canonical tasks and infrastructure preserved.",
        "baseline": {
            "blocks": 0,
            "maintenance_tasks": 1000
        }
    }
```

## 5. Mock Producers Divergence
In `JYOTI_REFERENCE`, producers generate data by actively parsing `json` topology files via Python data generation scripts. 
In `SIH26027`, data is strictly fetched from a static payload rather than generated dynamically. The file `SIH26027/backend/app/data/producers.py` implements this via a hardcoded `MOCK_PAYLOAD` returned via `generate_mock_fixture()`.

This documents the exact files, endpoints, and line-by-line divergence.
