"""
Candidate Maintenance Block Generator Service for KrayaSetu AI
Smart India Hackathon Problem Statement 26027

Translates maintenance tasks into feasible candidate maintenance block proposals:
- Maps tasks to physical railway topology
- Evaluates multi-factor geographic & task compatibility
- Generates candidate blocks with explainable bundling justifications
- Prepares candidate blocks for downstream CP-SAT possession scheduling

Does NOT create approved blocks or modify operational possession records.
"""

from typing import Dict, Any, List, Optional, Tuple, Set
from collections import defaultdict
from sqlalchemy.orm import Session
from backend.app.models.maintenance import MaintenanceTask, FaultObservation, WorkType, Equipment, Department
from backend.app.models.network import Section, Track, Station, Corridor

class CandidateBlockGenerator:
    """
    Deterministic Candidate Maintenance Block Generator.
    Evaluates geographic, department, track, and equipment compatibility.
    """
    MAX_POSSESSION_WINDOW_MINS = 240
    MAX_BUNDLING_DISTANCE_KM = 12.0

    def map_task_to_infrastructure(self, task: MaintenanceTask, db: Session) -> Dict[str, Any]:
        """
        Trace task to underlying railway topology and reference catalogs.
        """
        corridor = db.query(Corridor).filter(Corridor.id == task.corridor_id).first()
        section = db.query(Section).filter(Section.id == task.section_id).first()
        work_type = db.query(WorkType).filter(WorkType.id == task.work_type_id).first()
        equipment = db.query(Equipment).filter(Equipment.id == task.equipment_id).first() if task.equipment_id else None
        department = db.query(Department).filter(Department.id == task.department_id).first()

        # Station resolution
        station = None
        if section:
            # Check if task is near from_station or to_station
            from_stn = db.query(Station).filter(Station.code == section.from_station_code).first()
            to_stn = db.query(Station).filter(Station.code == section.to_station_code).first()
            if abs(task.location_km - section.start_km) <= 1.0:
                station = from_stn
            elif abs(task.location_km - section.end_km) <= 1.0:
                station = to_stn
            else:
                station = to_stn or from_stn

        # Location scope classification
        if section and (abs(task.location_km - section.start_km) <= 0.3 or abs(task.location_km - section.end_km) <= 0.3):
            location_scope = "STATION_APPROACH_YARD"
        elif task.location_km is not None:
            location_scope = "EXACT_CHAINAGE_BLOCK_SECTION"
        else:
            location_scope = "BLOCK_SECTION"

        return {
            "task_id": task.id,
            "location_scope": location_scope,
            "corridor": {
                "id": corridor.id if corridor else task.corridor_id,
                "name": corridor.name if corridor else "Unknown Corridor",
                "code": corridor.code if corridor else "",
                "track_configuration": corridor.track_configuration if corridor else "DOUBLE",
                "max_permissible_speed_kmph": corridor.max_permissible_speed_kmph if corridor else 110
            },
            "section": {
                "id": section.id if section else task.section_id,
                "name": section.name if section else "Unknown Section",
                "from_station": section.from_station_code if section else "",
                "to_station": section.to_station_code if section else "",
                "start_km": section.start_km if section else 0.0,
                "end_km": section.end_km if section else 0.0,
                "tracks_count": section.tracks_count if section else 2
            },
            "station": {
                "code": station.code if station else (section.to_station_code if section else ""),
                "name": station.name if station else (section.to_station_code if section else "En-route"),
                "category": station.category if station else "BLOCK_STATION"
            } if (station or section) else None,
            "track": {
                "name": task.track_name or "DOWN_MAIN",
                "chainage_km": task.location_km
            },
            "department": {
                "id": department.id if department else task.department_id,
                "name": department.name if department else task.department_id
            },
            "work_type": {
                "id": work_type.id if work_type else task.work_type_id,
                "name": work_type.name if work_type else task.work_type_id,
                "default_protection": work_type.default_protection if work_type else task.required_protection,
                "typical_duration_mins": work_type.default_duration_mins if work_type else task.duration_mins,
                "requires_power_isolation": work_type.requires_power_isolation if work_type else task.requires_power_isolation,
                "requires_track_occupation": work_type.requires_track_occupation if work_type else task.requires_track_occupation
            },
            "equipment": {
                "id": equipment.id,
                "name": equipment.name,
                "type": equipment.type,
                "base_station": equipment.base_station_code
            } if equipment else None
        }

    def check_task_compatibility(self, task1: MaintenanceTask, task2: MaintenanceTask, db: Session) -> Dict[str, Any]:
        """
        Check if two tasks can be bundled into the same candidate block.
        """
        rejection_reasons = []

        # 1. Corridor Compatibility (Mandatory)
        if task1.corridor_id != task2.corridor_id:
            rejection_reasons.append(f"Corridor mismatch: {task1.corridor_id} vs {task2.corridor_id}")

        # 2. Section & Distance Compatibility
        sec1 = db.query(Section).filter(Section.id == task1.section_id).first()
        sec2 = db.query(Section).filter(Section.id == task2.section_id).first()
        
        same_section = (task1.section_id == task2.section_id)
        adjacent_section = False
        if sec1 and sec2 and not same_section:
            adjacent_section = (
                sec1.to_station_code == sec2.from_station_code or
                sec1.from_station_code == sec2.to_station_code
            )

        if not same_section and not adjacent_section:
            rejection_reasons.append(f"Section incompatibility: {task1.section_id} and {task2.section_id} are not adjacent")

        km_diff = abs(task1.location_km - task2.location_km)
        if km_diff > self.MAX_BUNDLING_DISTANCE_KM:
            rejection_reasons.append(f"Distance {km_diff:.2f} km exceeds maximum bundling threshold ({self.MAX_BUNDLING_DISTANCE_KM} km)")

        # 3. Track Compatibility
        track_compatible = (
            task1.track_name == task2.track_name or
            task1.requires_power_isolation or task2.requires_power_isolation or
            not task1.requires_track_occupation or not task2.requires_track_occupation
        )
        if not track_compatible:
            rejection_reasons.append(f"Track conflict: {task1.track_name} vs {task2.track_name} without power isolation")

        # 4. Equipment Non-Conflict
        if task1.equipment_id and task2.equipment_id and task1.equipment_id == task2.equipment_id:
            rejection_reasons.append(f"Exclusive machine conflict: both require {task1.equipment_id}")

        # 5. Combined Duration
        est_duration = max(task1.duration_mins or 60, task2.duration_mins or 60)
        if task1.department_id != task2.department_id:
            est_duration += 15 # buffer for inter-department safety handover
        if est_duration > self.MAX_POSSESSION_WINDOW_MINS:
            rejection_reasons.append(f"Combined duration {est_duration}m exceeds maximum window ({self.MAX_POSSESSION_WINDOW_MINS}m)")

        is_compatible = len(rejection_reasons) == 0
        return {
            "is_compatible": is_compatible,
            "rejection_reasons": rejection_reasons,
            "estimated_duration": est_duration if is_compatible else None
        }

    def generate_candidate_blocks(self, db: Session, corridor_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate candidate maintenance blocks by grouping compatible tasks.
        Deterministic tie-breakers: (1) priority score desc, (2) location_km asc, (3) task_id asc.
        """
        query = db.query(MaintenanceTask)
        if corridor_id:
            query = query.filter(MaintenanceTask.corridor_id == corridor_id)
        
        all_tasks = query.all()

        # Load sections lookup
        sections_map = {s.id: s for s in db.query(Section).all()}

        # Group tasks by corridor and section
        tasks_by_section = defaultdict(list)
        for t in all_tasks:
            tasks_by_section[t.section_id].append(t)

        candidate_blocks = []
        rejection_stats = defaultdict(int)
        candidate_seq = 1

        prio_weight = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}

        for sec_id, sec_tasks in tasks_by_section.items():
            # Deterministic sorting
            sorted_tasks = sorted(sec_tasks, key=lambda t: (prio_weight.get(t.priority, 4), t.location_km, t.id))
            used_ids: Set[str] = set()

            for i, primary in enumerate(sorted_tasks):
                if primary.id in used_ids:
                    continue

                bundle = [primary]
                used_ids.add(primary.id)

                for candidate_partner in sorted_tasks[i+1:]:
                    if candidate_partner.id in used_ids:
                        continue
                    if len(bundle) >= 3:
                        break

                    compat = self.check_task_compatibility(primary, candidate_partner, db)
                    if compat["is_compatible"]:
                        bundle.append(candidate_partner)
                        used_ids.add(candidate_partner.id)
                    else:
                        for reason in compat["rejection_reasons"]:
                            if "Distance" in reason:
                                cat = "Distance exceeds threshold (>12 km)"
                            elif "Track conflict" in reason:
                                cat = "Track conflict without power isolation"
                            elif "Exclusive machine" in reason:
                                cat = "Exclusive machinery conflict"
                            elif "Corridor mismatch" in reason:
                                cat = "Corridor mismatch"
                            else:
                                cat = reason.split(":")[0]
                            rejection_stats[cat] += 1

                # Formulate candidate block (bundled 2+ tasks, or standalone Critical/High)
                if len(bundle) >= 2 or primary.priority in ["CRITICAL", "HIGH"]:
                    cid = f"CB-{candidate_seq:03d}"
                    candidate_seq += 1

                    task_ids = [t.id for t in bundle]
                    depts = list(dict.fromkeys(t.department_id for t in bundle))
                    eqs = [t.equipment_id for t in bundle if t.equipment_id]
                    tracks = list(dict.fromkeys(t.track_name for t in bundle if t.track_name))
                    
                    # Protection level: Emergency > Traffic & Power > Power > Traffic
                    if any(t.required_protection == "EMERGENCY_PROTECTION" for t in bundle):
                        protection = "EMERGENCY_PROTECTION"
                    elif any(t.requires_power_isolation for t in bundle):
                        protection = "TRAFFIC_AND_POWER_ISOLATION"
                    elif any(t.required_protection == "TRAFFIC_BLOCK" for t in bundle):
                        protection = "TRAFFIC_BLOCK"
                    else:
                        protection = "TRAFFIC_CAUTION"

                    # Duration calculation
                    durations = [t.duration_mins or 60 for t in bundle]
                    base_dur = max(durations)
                    if len(depts) > 1:
                        est_duration = min(self.MAX_POSSESSION_WINDOW_MINS, base_dur + 15)
                    else:
                        est_duration = base_dur

                    min_km = min(t.location_km for t in bundle)
                    max_km = max(t.location_km for t in bundle)
                    sec_obj = sections_map.get(sec_id)
                    sec_name = sec_obj.name if sec_obj else sec_id

                    if len(bundle) > 1:
                        reason = (
                            f"Bundled {len(bundle)} tasks ({', '.join(task_ids)}) on {sec_name} "
                            f"(KM {min_km:.3f} - {max_km:.3f}). "
                            f"Departments: {' + '.join(depts)}. "
                            f"Shared protection: {protection}. "
                            f"Duration: {est_duration} mins."
                        )
                    else:
                        reason = (
                            f"Dedicated high-priority candidate block for {primary.priority} task {primary.id} "
                            f"on {sec_name} at KM {primary.location_km:.3f} ({primary.track_name}). "
                            f"Required protection: {protection}. Duration: {est_duration} mins."
                        )

                    candidate_blocks.append({
                        "candidate_id": cid,
                        "corridor_id": primary.corridor_id,
                        "section_id": sec_id,
                        "section_name": sec_name,
                        "task_ids": task_ids,
                        "tasks_count": len(task_ids),
                        "estimated_duration": est_duration,
                        "required_departments": depts,
                        "required_equipment": eqs,
                        "track_requirements": tracks,
                        "protection_requirements": protection,
                        "location_span": f"KM {min_km:.3f} - {max_km:.3f}" if len(bundle) > 1 else f"KM {min_km:.3f}",
                        "compatibility_status": "COMPATIBLE",
                        "reason": reason
                    })

        bundled_count = sum(1 for cb in candidate_blocks if cb["tasks_count"] > 1)
        single_count = sum(1 for cb in candidate_blocks if cb["tasks_count"] == 1)
        total_tasks_covered = sum(cb["tasks_count"] for cb in candidate_blocks)

        return {
            "status": "SUCCESS",
            "candidate_blocks": candidate_blocks,
            "metrics": {
                "total_candidates": len(candidate_blocks),
                "bundled_candidates_count": bundled_count,
                "single_task_candidates_count": single_count,
                "total_tasks_covered": total_tasks_covered,
                "rejection_statistics": dict(rejection_stats)
            },
            "summary": f"Generated {len(candidate_blocks)} candidate blocks ({bundled_count} bundled groups, {single_count} dedicated high-priority blocks) covering {total_tasks_covered} maintenance tasks."
        }

    def get_candidate_by_id(self, candidate_id: str, db: Session) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific candidate block by ID.
        """
        candidates_data = self.generate_candidate_blocks(db)
        for cb in candidates_data["candidate_blocks"]:
            if cb["candidate_id"].upper() == candidate_id.upper():
                return cb
        return None

candidate_generator = CandidateBlockGenerator()
