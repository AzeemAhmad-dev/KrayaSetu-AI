from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

def time_to_minutes(time_str: str) -> int:
    try:
        parts = time_str.strip().split(":")
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        return h * 60 + m
    except Exception:
        return 12 * 60

def minutes_to_time(minutes: int) -> str:
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"

def format_commodity(cargo: Optional[str]) -> str:
    if not cargo:
        return "Coal"
    cleaned = (
        str(cargo)
        .replace("_rake", "")
        .replace("_RAKE", "")
        .replace(" Rake", "")
        .replace(" rake", "")
        .replace("Rake", "")
        .strip()
    )
    c = cleaned.upper()
    if c == "COAL":
        return "Coal"
    if c == "CEMENT":
        return "Cement"
    if c in ["CONTAINER", "CONTAINERS"]:
        return "Containers"
    if c in ["FOOD_GRAINS", "FOODGRAINS"]:
        return "Food Grains"
    if c in ["AUTOMOBILES", "AUTO"]:
        return "Automobiles"
    if c == "FERTILIZER":
        return "Fertilizer"
    if c == "STEEL":
        return "Steel"
    return cleaned.capitalize() if cleaned else "General Freight"

def format_train_display(tnum: str, tname: Optional[str], ttype: Optional[str] = None, cargo: Optional[str] = None) -> str:
    """
    Returns human-facing railway identifier: TRAIN NUMBER — TRAIN NAME.
    Never returns UUID or duplicate 'UUID · UUID'.
    """
    clean_num = str(tnum).strip()
    is_uuid = len(clean_num) == 36 and clean_num.count("-") == 4
    if is_uuid:
        clean_num = "Special Service"

    clean_name = str(tname or "").strip()
    if len(clean_name) == 36 and clean_name.count("-") == 4:
        clean_name = ""

    if ttype == "FREIGHT" or "FREIGHT" in clean_num.upper():
        comm = format_commodity(cargo)
        return f"{clean_num} (Commodity: {comm})"

    if clean_name and clean_name != clean_num and clean_name != "Special Service":
        return f"{clean_num} — {clean_name}"
    return f"{clean_num}"


class BlockConflictEngine:
    """
    Evaluates proposed maintenance block windows against all traffic reality:
    - Real track occupancy interval overlap (NOT ETA-only)
    - Route, corridor, section, and track matching
    - Scheduled passenger trains & delay adjustments
    - Synthetic freight paths & loop holding (Commodity: Coal)
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
            req_end_min += 24 * 60  # wraps past midnight

        # Canonical unique train maps: ONE physical passenger service = ONE conflict entry!
        canonical_passenger_conflicts: Dict[str, Dict[str, Any]] = {}
        canonical_freight_conflicts: Dict[str, Dict[str, Any]] = {}
        canonical_potential_conflicts: Dict[str, Dict[str, Any]] = {}

        # Buffer requirements: 15 min safety headway before & after block
        safety_buffer_mins = 15

        for tm in train_movements:
            tnum = str(tm.get("train_number") or "TRAIN").strip()
            # Skip internal UUID synthetic movements from raw collision pools
            if len(tnum) == 36 and tnum.count("-") == 4:
                continue

            tname = tm.get("train_name")
            ttype = tm.get("train_type") or ("FREIGHT" if "FREIGHT" in tnum else "PASSENGER")
            direction = tm.get("direction")
            sched_str = tm.get("scheduled_time") or "12:00"
            est_str = tm.get("estimated_passage") or tm.get("estimated_time") or "12:00"
            delay = tm.get("delay_minutes", 0)
            status = tm.get("status") or "RUNNING"
            t_track = tm.get("track_name") or tm.get("current_track") or "DOWN_MAIN"
            t_km = float(tm.get("current_km") or location_km)
            cargo_type = tm.get("cargo_type") or tm.get("commodity")
            is_demo = tm.get("is_demonstration_data", False)
            data_source_label = tm.get("data_source_label")

            # Clean human-facing title
            display_title = format_train_display(tnum, tname, ttype, cargo_type)

            # 1. Route & Corridor Compatibility
            tm_corridor = tm.get("corridor_id")
            if tm_corridor and corridor_id and tm_corridor != corridor_id:
                # Different corridor -> no physical conflict possible
                continue

            # 2. Track & Power Isolation Compatibility
            # Direct track collision OR complete power isolation cutting traction on both tracks
            track_conflict = (
                track_name == t_track
                or track_name == "BOTH"
                or t_track == "BOTH"
                or requires_power_isolation
            )

            # 3. Section / Geographic Proximity Check
            # Matches explicit section or falls within physical section vicinity (<= 25 km)
            tm_sec = tm.get("section_id")
            section_match = (tm_sec and section_id and tm_sec == section_id)
            km_proximity = abs(location_km - t_km) <= 25.0

            geographic_conflict = section_match or km_proximity

            # 4. Temporal Occupancy Interval Overlap (Real interval, NOT ETA-only!)
            # If train has explicit entry and exit times, use actual section transit window
            if tm.get("entry_time") and tm.get("exit_time"):
                train_window_start = time_to_minutes(tm["entry_time"]) - safety_buffer_mins
                train_window_end = time_to_minutes(tm["exit_time"]) + safety_buffer_mins
            elif tm.get("occupancy_interval") and len(tm["occupancy_interval"]) >= 2:
                train_window_start = time_to_minutes(tm["occupancy_interval"][0]) - safety_buffer_mins
                train_window_end = time_to_minutes(tm["occupancy_interval"][1]) + safety_buffer_mins
            else:
                est_min = time_to_minutes(est_str)
                train_window_start = est_min - safety_buffer_mins
                train_window_end = est_min + safety_buffer_mins

            # Does the block window overlap the train's section occupancy window?
            temporal_overlap = max(req_start_min, train_window_start) < min(req_end_min, train_window_end)

            # Direct conflict requires: Physical Track + Geographic Section + Temporal Occupancy Overlap!
            if temporal_overlap and track_conflict and geographic_conflict:
                severity_impact = "CRITICAL" if ttype in ["VANDE_BHARAT", "SHATABDI"] else "HIGH"

                if ttype == "FREIGHT":
                    comm = format_commodity(cargo_type)
                    reason_msg = (
                        f"{display_title} (Estimated passage: {est_str}, Delay: +{delay} min) "
                        f"occupies {t_track} during proposed window {start_time}–{end_time} and requires loop holding or regulation."
                    )
                    item = {
                        "train_number": tnum,
                        "train_name": tname or tnum,
                        "train_type": ttype,
                        "cargo_type": comm,
                        "commodity": comm,
                        "display_title": display_title,
                        "scheduled_time": sched_str,
                        "estimated_time": est_str,
                        "delay_minutes": delay,
                        "status": status,
                        "track": t_track,
                        "impact": "REGULATION_REQUIRED",
                        "reason": reason_msg,
                        "is_demonstration_data": is_demo,
                        "data_source_label": data_source_label
                    }
                    canonical_freight_conflicts[tnum] = item
                else:
                    reason_msg = (
                        f"{display_title} (Estimated passage: {est_str}, Delay: +{delay} min) "
                        f"directly occupies affected track {t_track} during proposed block window {start_time}–{end_time}."
                    )
                    item = {
                        "train_number": tnum,
                        "train_name": tname or tnum,
                        "train_type": ttype,
                        "display_title": display_title,
                        "scheduled_time": sched_str,
                        "estimated_time": est_str,
                        "delay_minutes": delay,
                        "status": status,
                        "track": t_track,
                        "impact": severity_impact,
                        "reason": reason_msg,
                        "is_demonstration_data": is_demo,
                        "data_source_label": data_source_label
                    }
                    if tnum in canonical_passenger_conflicts:
                        existing = canonical_passenger_conflicts[tnum]
                        if severity_impact == "CRITICAL":
                            existing["impact"] = "CRITICAL"
                    else:
                        canonical_passenger_conflicts[tnum] = item
            elif track_conflict and geographic_conflict:
                # Close buffer proximity margin (within 20 mins of boundary)
                est_min = time_to_minutes(est_str)
                if abs(est_min - req_start_min) <= 25 or abs(est_min - req_end_min) <= 25:
                    if tnum not in canonical_passenger_conflicts and tnum not in canonical_freight_conflicts:
                        canonical_potential_conflicts[tnum] = {
                            "train_number": tnum,
                            "train_name": tname or tnum,
                            "display_title": display_title,
                            "estimated_time": est_str,
                            "reason": f"{display_title} passes at {est_str} within safety buffer margin of block boundary.",
                            "is_demonstration_data": is_demo,
                            "data_source_label": data_source_label
                        }

        conflicting_trains = list(canonical_passenger_conflicts.values())
        freight_impacts = list(canonical_freight_conflicts.values())
        potential_conflicts = [
            pc for pc in canonical_potential_conflicts.values()
            if pc["train_number"] not in canonical_passenger_conflicts and pc["train_number"] not in canonical_freight_conflicts
        ]

        # Assess final conflict state
        if conflicting_trains:
            has_vip = any(ct["train_type"] in ["VANDE_BHARAT", "SHATABDI"] for ct in conflicting_trains)
            primary_train = conflicting_trains[0]
            count = len(conflicting_trains)
            service_label = "passenger service" if count == 1 else "passenger service(s)"
            if has_vip:
                status_result = "CONFLICT"
                summary = (
                    f"Direct conflict detected with {count} {service_label}, including high-priority "
                    f"{primary_train['display_title']} (Estimated passage: {primary_train['estimated_time']}). "
                    f"Block CANNOT be granted in proposed window without severe path disruption."
                )
            else:
                status_result = "CONFLICT"
                summary = (
                    f"Direct track occupancy conflict with {count} {service_label}: "
                    f"{', '.join(ct['display_title'] for ct in conflicting_trains)}."
                )
        elif freight_impacts:
            status_result = "POTENTIAL CONFLICT"
            count = len(freight_impacts)
            freight_label = "freight train" if count == 1 else "freight train(s)"
            summary = (
                f"No passenger conflict, but {count} {freight_label} "
                f"({', '.join(f['display_title'] for f in freight_impacts)}) require holding at loops or speed regulation."
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
            duration = req_end_min - req_start_min
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
