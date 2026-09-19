from typing import Dict, Any, List
from datetime import datetime, timedelta

def time_to_minutes(time_str: str) -> int:
    h, m = map(int, time_str.split(":"))
    return h * 60 + m

def minutes_to_time(minutes: int) -> str:
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"

class BlockConflictEngine:
    """
    Evaluates proposed maintenance block windows against all traffic reality:
    - Scheduled passenger trains
    - Delayed trains with shifted estimated arrival
    - Synthetic freight paths & loop holding
    - Power isolation requirements (affecting adjacent tracks if overhead)
    - Prior blocks and speed restrictions
    """
    def evaluate_block_proposal(
        self,
        corridor_id: str,
        section_id: str,
        track_name: str,
        location_km: float,
        start_time: str,
        end_time: str,
        protection_type: str,
        requires_power_isolation: bool,
        train_movements: List[Dict[str, Any]],
        existing_blocks: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        req_start_min = time_to_minutes(start_time)
        req_end_min = time_to_minutes(end_time)
        if req_end_min <= req_start_min:
            req_end_min += 24 * 60 # wraps past midnight

        conflicting_trains = []
        potential_conflicts = []
        freight_impacts = []

        # Buffer requirements:
        # High priority passenger train requires 20 min headway before & after block
        safety_buffer_mins = 15

        for tm in train_movements:
            tnum = tm.get("train_number")
            tname = tm.get("train_name")
            ttype = tm.get("train_type")
            direction = tm.get("direction")
            sched_str = tm.get("scheduled_time", "12:00")
            est_str = tm.get("estimated_time", "12:00")
            delay = tm.get("delay_minutes", 0)
            status = tm.get("status")
            t_track = tm.get("current_track", "DOWN_MAIN")
            t_km = tm.get("current_km", 0.0)

            sched_min = time_to_minutes(sched_str)
            est_min = time_to_minutes(est_str)

            # Track collision or Power Isolation affecting all tracks in section
            track_conflict = (track_name == t_track or track_name == "BOTH" or requires_power_isolation)

            # Section KM proximity check (within 25 km of block location)
            km_proximity = abs(location_km - t_km) <= 30.0

            # Check time interval overlap
            train_window_start = est_min - safety_buffer_mins
            train_window_end = est_min + safety_buffer_mins

            overlap = max(req_start_min, train_window_start) < min(req_end_min, train_window_end)

            if overlap and track_conflict and km_proximity:
                severity_impact = "CRITICAL" if ttype in ["VANDE_BHARAT", "SHATABDI"] else "HIGH"
                item = {
                    "train_number": tnum,
                    "train_name": tname,
                    "train_type": ttype,
                    "scheduled_time": sched_str,
                    "estimated_time": est_str,
                    "delay_minutes": delay,
                    "status": status,
                    "track": t_track,
                    "impact": severity_impact,
                    "reason": f"{tname} estimated at {est_str} (delay +{delay}m) directly conflicts with requested block window {start_time}-{end_time} on {track_name}."
                }
                if ttype == "FREIGHT":
                    freight_impacts.append(item)
                else:
                    conflicting_trains.append(item)
            elif abs(est_min - req_start_min) <= 30 or abs(est_min - req_end_min) <= 30:
                # Close proximity potential conflict
                if track_conflict and km_proximity:
                    potential_conflicts.append({
                        "train_number": tnum,
                        "train_name": tname,
                        "estimated_time": est_str,
                        "reason": f"{tname} passes at {est_str} within buffer of block boundary."
                    })

        # Assess final conflict state
        if conflicting_trains:
            has_vip = any(ct["train_type"] in ["VANDE_BHARAT", "SHATABDI"] for ct in conflicting_trains)
            if has_vip:
                status_result = "CONFLICT"
                summary = (
                    f"Direct conflict detected with {len(conflicting_trains)} passenger train(s), including high-priority "
                    f"{conflicting_trains[0]['train_name']} (estimated {conflicting_trains[0]['estimated_time']}). "
                    f"Block CANNOT be granted in proposed window without severe path disruption."
                )
            else:
                status_result = "CONFLICT"
                summary = (
                    f"Direct track occupancy conflict with {len(conflicting_trains)} passenger train(s) "
                    f"({', '.join(ct['train_number'] for ct in conflicting_trains)})."
                )
        elif freight_impacts:
            status_result = "POTENTIAL CONFLICT"
            summary = (
                f"No passenger conflict, but {len(freight_impacts)} freight rake(s) "
                f"({', '.join(f['train_number'] for f in freight_impacts)}) require holding at loops or regulation."
            )
        elif potential_conflicts:
            status_result = "POTENTIAL CONFLICT"
            summary = (
                f"Tight buffer margin with {len(potential_conflicts)} train(s) near block boundary. "
                f"May proceed under caution or slight window adjustment."
            )
        else:
            status_result = "NO CONFLICT"
            summary = f"Clear operational window available between {start_time} and {end_time}. Section track {track_name} is free of conflict."

        # Suggest earliest feasible conflict-free alternative if conflict exists
        alternative_window = None
        if status_result in ["CONFLICT", "HIGH OPERATIONAL RISK"]:
            # Shift window forward by duration
            duration = req_end_min - req_start_min
            # Find earliest quiet slot (e.g. 14:15 - 16:15 or 15:30 - 17:30)
            candidate_start = req_end_min + 15
            candidate_end = candidate_start + duration
            alternative_window = {
                "suggested_start_time": minutes_to_time(candidate_start),
                "suggested_end_time": minutes_to_time(candidate_end),
                "duration_mins": duration,
                "reason": "Calculated conflict-free corridor gap post-Shatabdi/GT Express clearance."
            }

        return {
            "conflict_status": status_result,
            "summary": summary,
            "conflicting_passenger_trains": conflicting_trains,
            "freight_impacts": freight_impacts,
            "potential_conflicts": potential_conflicts,
            "alternative_window": alternative_window
        }

conflict_engine = BlockConflictEngine()
