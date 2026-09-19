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
        import uuid
        movements = []
        for i, f in enumerate(freight_templates):
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

            unique_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"{fid}_{scenario_id}_{i}"))

            movements.append({
                "train_number": unique_id,
                "train_id": unique_id,
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
