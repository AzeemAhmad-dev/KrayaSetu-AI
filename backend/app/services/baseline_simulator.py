"""
Independent Department Baseline Simulator for KrayaSetu AI
Smart India Hackathon Problem Statement 26027

Computes what maintenance scheduling would look like WITHOUT multi-department coordination:
- P.Way (Civil Engineering), TRD (25kV Electrical OHE), and S&T (Signalling & Telecom)
  each independently schedule separate track possession windows for their own tasks.
- No co-location, no shared power-isolation bundling, no inter-department synergy.
- Simulates independent closure hours, separate possession windows, and resulting train delays.
- Compares directly against the optimizer's co-located plan to compute:
  * Asset Downtime Saved (hours)
  * Percentage Reduction (%)
  * Train Path Conflicts / Delays Averted
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from collections import defaultdict

from backend.app.models.maintenance import MaintenanceTask, Block, Department
from backend.app.models.network import Section, Corridor
from backend.app.models.trains import TrainMovement, Train
from backend.app.data.conflict_test_trains import SEEDED_BHOPAL_CONFLICT_TRAINS
from backend.app.services.conflict_engine import conflict_engine, time_to_minutes, minutes_to_time
from backend.app.services.dataset_identity import compute_dataset_fingerprint


class BaselineSimulator:
    """
    Simulates uncoordinated department-by-department scheduling vs KrayaSetu AI co-located plan.
    """

    def simulate_baseline_comparison(
        self,
        db: Session,
        corridor_id: Optional[str] = None,
        week_start: Optional[str] = None
    ) -> Dict[str, Any]:
        # 1. Fetch active tasks
        task_query = db.query(MaintenanceTask)
        if corridor_id and corridor_id.upper() not in ["ALL", "NONE", ""]:
            task_query = task_query.filter(MaintenanceTask.corridor_id == corridor_id.upper())
        all_tasks = task_query.all()

        # 2. Fetch active blocks (optimized plan)
        block_query = db.query(Block)
        if corridor_id and corridor_id.upper() not in ["ALL", "NONE", ""]:
            block_query = block_query.filter(Block.corridor_id == corridor_id.upper())
        all_blocks = block_query.all()

        # Load section and corridor metadata maps
        sections_map = {s.id: s for s in db.query(Section).all()}
        corridors_map = {c.id: c for c in db.query(Corridor).all()}

        # 3. Gather candidate train movements for conflict simulation
        movements_data = list(SEEDED_BHOPAL_CONFLICT_TRAINS)
        known_nums = {t["train_number"] for t in SEEDED_BHOPAL_CONFLICT_TRAINS}
        for m in db.query(TrainMovement).all():
            if len(m.train_number) == 36 and m.train_number.count("-") == 4:
                continue
            if m.train_number not in known_nums:
                movements_data.append({
                    "train_number": m.train_number,
                    "train_name": m.train.train_name if m.train else m.train_number,
                    "train_type": m.train.train_type if m.train else "PASSENGER",
                    "direction": m.direction,
                    "corridor_id": m.train.corridor_id if m.train else "CORR-01",
                    "section_id": m.current_section_id,
                    "current_track": m.current_track,
                    "track_name": m.current_track,
                    "current_km": m.current_km,
                    "scheduled_time": m.scheduled_time,
                    "estimated_time": m.estimated_time,
                    "delay_minutes": m.delay_minutes,
                    "status": m.status,
                    "priority": m.train.priority if m.train else 3
                })

        # ---------------------------------------------------------
        # PART A: OPTIMIZED CO-LOCATED PLAN (Actual DB State)
        # ---------------------------------------------------------
        opt_duration_mins = sum(b.duration_mins or 120 for b in all_blocks)
        opt_total_hours = round(opt_duration_mins / 60.0, 2)
        opt_windows_count = len(all_blocks)

        # Department attribution in optimized plan
        opt_dept_mins = defaultdict(int)
        for b in all_blocks:
            # Check departments attached to this block
            depts = set()
            if b.task and b.task.department_id:
                depts.add(b.task.department_id)
            linked_tasks = db.query(MaintenanceTask).filter(MaintenanceTask.block_id == b.id).all()
            for lt in linked_tasks:
                if lt.department_id:
                    depts.add(lt.department_id)
            if not depts:
                depts.add("PWAY")

            # In shared/shadow blocks, the possession window is shared simultaneously
            # so each department shares the single window time
            share_dur = (b.duration_mins or 120) / len(depts)
            for d in depts:
                opt_dept_mins[d] += share_dur

        # Optimized train conflict evaluation
        opt_delayed_trains = set()
        opt_total_delay_minutes = 0
        for b in all_blocks:
            eval_res = conflict_engine.evaluate_block_proposal(
                corridor_id=b.corridor_id,
                section_id=b.section_id or "SEC-MAIN",
                track_name=b.track_name or "DOWN_MAIN",
                location_km=b.location_km or 0.0,
                start_time=b.requested_start_time or "01:00",
                end_time=b.requested_end_time or "03:00",
                protection_type=b.protection_type or "TRAFFIC_BLOCK",
                requires_power_isolation=bool(b.power_isolation_required),
                train_movements=movements_data
            )
            for ct in eval_res.get("conflicting_trains", []):
                opt_delayed_trains.add(ct.get("train_number"))
                opt_total_delay_minutes += ct.get("delay_minutes", 15) or 15
            for ft in eval_res.get("freight_impacts", []):
                opt_delayed_trains.add(ft.get("train_number"))
                opt_total_delay_minutes += 20  # regulation hold

        # ---------------------------------------------------------
        # PART B: INDEPENDENT DEPARTMENT BASELINE (Uncoordinated)
        # ---------------------------------------------------------
        # In the uncoordinated baseline, each department schedules its tasks independently.
        # Without multi-department co-location, every task is a separate possession window.
        indep_dept_mins = defaultdict(int)
        indep_windows_count = len(all_tasks)
        indep_duration_mins = 0

        # Disperse independent department windows across the day to simulate independent booking
        # P.Way requests morning windows (09:00 - 13:00)
        # TRD requests afternoon power isolation windows (13:00 - 17:00)
        # S&T requests evening/inter-peak signal windows (17:00 - 20:00)
        dept_time_slots = {
            "PWAY": ("09:00", 9 * 60),
            "TRD": ("13:00", 13 * 60),
            "SNT": ("17:00", 17 * 60)
        }

        indep_delayed_trains = set()
        indep_total_delay_minutes = 0

        # Track task hours by department
        for t in all_tasks:
            dept = t.department_id or "PWAY"
            dur = t.duration_mins or 120
            indep_dept_mins[dept] += dur
            indep_duration_mins += dur

            # Simulate independent conflict: each department takes its own window
            base_slot_start = dept_time_slots.get(dept, ("10:00", 10 * 60))[1]
            task_offset = (hash(t.id) % 180)  # staggered throughout shift
            t_start_min = (base_slot_start + task_offset) % (24 * 60)
            t_end_min = t_start_min + dur

            sim_eval = conflict_engine.evaluate_block_proposal(
                corridor_id=t.corridor_id,
                section_id=t.section_id or "SEC-MAIN",
                track_name=t.track_name or "DOWN_MAIN",
                location_km=t.location_km or 0.0,
                start_time=minutes_to_time(t_start_min),
                end_time=minutes_to_time(t_end_min),
                protection_type=t.required_protection or "TRAFFIC_BLOCK",
                requires_power_isolation=bool(t.requires_power_isolation or dept == "TRD"),
                train_movements=movements_data
            )

            for ct in sim_eval.get("conflicting_trains", []):
                indep_delayed_trains.add(ct.get("train_number"))
                indep_total_delay_minutes += ct.get("delay_minutes", 20) or 20
            for ft in sim_eval.get("freight_impacts", []):
                indep_delayed_trains.add(ft.get("train_number"))
                indep_total_delay_minutes += 30  # independent holding loop

        indep_total_hours = round(indep_duration_mins / 60.0, 2)

        # ---------------------------------------------------------
        # PART C: SECTION-BY-SECTION COMPARISON
        # ---------------------------------------------------------
        # Group tasks and blocks by section to show granular side-by-side impact
        tasks_by_section = defaultdict(list)
        for t in all_tasks:
            tasks_by_section[t.section_id].append(t)

        blocks_by_section = defaultdict(list)
        for b in all_blocks:
            blocks_by_section[b.section_id].append(b)

        section_comparisons = []
        all_section_ids = set(tasks_by_section.keys()).union(blocks_by_section.keys())

        for sec_id in sorted(all_section_ids, key=lambda s: s or ""):
            if not sec_id:
                continue
            sec_tasks = tasks_by_section.get(sec_id, [])
            sec_blocks = blocks_by_section.get(sec_id, [])

            sec_depts = list(dict.fromkeys(t.department_id for t in sec_tasks if t.department_id))
            sec_obj = sections_map.get(sec_id)
            sec_name = sec_obj.name if sec_obj else sec_id
            corr_id = sec_obj.corridor_id if sec_obj else (sec_tasks[0].corridor_id if sec_tasks else "CORR-01")

            # Independent baseline for section: sum of tasks duration
            sec_indep_mins = sum(t.duration_mins or 120 for t in sec_tasks)
            sec_indep_hours = round(sec_indep_mins / 60.0, 2)
            sec_indep_windows = len(sec_tasks)

            # Optimized plan for section: sum of block durations
            sec_opt_mins = sum(b.duration_mins or 120 for b in sec_blocks)
            sec_opt_hours = round(sec_opt_mins / 60.0, 2)
            sec_opt_windows = len(sec_blocks)

            hours_saved = max(0.0, round(sec_indep_hours - sec_opt_hours, 2))
            is_colocated = len(sec_depts) > 1 or any(b.block_type == "SHADOW" for b in sec_blocks)
            reduction_pct = round((hours_saved / sec_indep_hours * 100), 1) if sec_indep_hours > 0 else 0.0

            section_comparisons.append({
                "section_id": sec_id,
                "section_name": sec_name,
                "corridor_id": corr_id,
                "departments_involved": sec_depts if sec_depts else ["PWAY"],
                "departments": sec_depts if sec_depts else ["PWAY"],
                "tasks_count": len(sec_tasks),
                "is_colocated": is_colocated,
                "independent": {
                    "closure_hours": sec_indep_hours,
                    "closure_minutes": sec_indep_mins,
                    "windows_count": sec_indep_windows,
                },
                "optimized": {
                    "closure_hours": sec_opt_hours,
                    "closure_minutes": sec_opt_mins,
                    "windows_count": sec_opt_windows,
                    "block_types": list(dict.fromkeys(b.block_type for b in sec_blocks))
                },
                "savings": {
                    "hours_saved": hours_saved,
                    "reduction_pct": reduction_pct
                },
                "hours_saved": hours_saved,
                "reduction_pct": reduction_pct
            })

        # Sort comparisons: co-located and highest savings first
        section_comparisons.sort(key=lambda x: (not x["is_colocated"], -x["savings"]["hours_saved"]))

        # ---------------------------------------------------------
        # PART D: AGGREGATE DELTAS & RETURN PAYLOAD
        # ---------------------------------------------------------
        downtime_hours_saved = max(0.0, round(indep_total_hours - opt_total_hours, 2))
        downtime_reduction_pct = (
            round((downtime_hours_saved / indep_total_hours) * 100.0, 1)
            if indep_total_hours > 0 else 0.0
        )
        windows_eliminated = max(0, indep_windows_count - opt_windows_count)

        indep_trains_delayed_count = len(indep_delayed_trains)
        opt_trains_delayed_count = len(opt_delayed_trains)
        trains_saved_from_delay = max(0, indep_trains_delayed_count - opt_trains_delayed_count)
        delay_minutes_saved = max(0, indep_total_delay_minutes - opt_total_delay_minutes)

        # Shadow / co-located sections aggregate savings
        colocated_sections = [s for s in section_comparisons if s["is_colocated"]]
        shadow_indep_hours = sum(s["independent"]["closure_hours"] for s in colocated_sections)
        shadow_opt_hours = sum(s["optimized"]["closure_hours"] for s in colocated_sections)
        shadow_saved_hours = round(max(0.0, shadow_indep_hours - shadow_opt_hours), 2)
        shadow_reduction_pct = round((shadow_saved_hours / shadow_indep_hours * 100.0), 1) if shadow_indep_hours > 0 else 0.0

        dept_summary = {
            "PWAY": {
                "hours": round(indep_dept_mins["PWAY"] / 60.0, 2),
                "tasks": sum(1 for t in all_tasks if t.department_id == "PWAY"),
                "optimized_hours": round(opt_dept_mins["PWAY"] / 60.0, 2),
            },
            "TRD": {
                "hours": round(indep_dept_mins["TRD"] / 60.0, 2),
                "tasks": sum(1 for t in all_tasks if t.department_id == "TRD"),
                "optimized_hours": round(opt_dept_mins["TRD"] / 60.0, 2),
            },
            "SNT": {
                "hours": round(indep_dept_mins["SNT"] / 60.0, 2),
                "tasks": sum(1 for t in all_tasks if t.department_id == "SNT"),
                "optimized_hours": round(opt_dept_mins["SNT"] / 60.0, 2),
            },
        }

        savings_dict = {
            "downtime_hours_saved": downtime_hours_saved,
            "downtime_reduction_pct": downtime_reduction_pct,
            "hours_saved": downtime_hours_saved,
            "percentage_reduction": downtime_reduction_pct,
            "minutes_saved": round(downtime_hours_saved * 60),
            "windows_eliminated": windows_eliminated,
            "windows_reduction_pct": round((windows_eliminated / indep_windows_count * 100), 1) if indep_windows_count else 0.0,
            "trains_saved_from_delay": trains_saved_from_delay,
            "train_conflicts_prevented": trains_saved_from_delay,
            "train_delay_minutes_saved": delay_minutes_saved,
            "train_delay_minutes_prevented": delay_minutes_saved,
            "shadow_sections_savings": {
                "hours_saved": shadow_saved_hours,
                "percentage_reduction": shadow_reduction_pct,
                "colocated_sections_count": len(colocated_sections)
            }
        }

        indep_dict = {
            "total_closure_hours": indep_total_hours,
            "total_closure_minutes": indep_duration_mins,
            "possession_windows_count": indep_windows_count,
            "total_hours": indep_total_hours,
            "total_windows": indep_windows_count,
            "closure_hours_by_department": {
                "PWAY": round(indep_dept_mins["PWAY"] / 60.0, 2),
                "TRD": round(indep_dept_mins["TRD"] / 60.0, 2),
                "SNT": round(indep_dept_mins["SNT"] / 60.0, 2)
            },
            "department_breakdown": dept_summary,
            "trains_delayed": indep_trains_delayed_count,
            "total_train_delay_minutes": indep_total_delay_minutes,
            "strategy": "Uncoordinated departmental silos: P.Way, TRD, and S&T book separate, non-overlapping track and power blocks."
        }

        opt_dict = {
            "total_closure_hours": opt_total_hours,
            "total_closure_minutes": opt_duration_mins,
            "possession_windows_count": opt_windows_count,
            "total_hours": opt_total_hours,
            "total_blocks": opt_windows_count,
            "closure_hours_by_department": {
                "PWAY": round(opt_dept_mins["PWAY"] / 60.0, 2),
                "TRD": round(opt_dept_mins["TRD"] / 60.0, 2),
                "SNT": round(opt_dept_mins["SNT"] / 60.0, 2)
            },
            "department_breakdown": {
                "PWAY": {"hours": round(opt_dept_mins["PWAY"] / 60.0, 2)},
                "TRD": {"hours": round(opt_dept_mins["TRD"] / 60.0, 2)},
                "SNT": {"hours": round(opt_dept_mins["SNT"] / 60.0, 2)},
            },
            "trains_delayed": opt_trains_delayed_count,
            "total_train_delay_minutes": opt_total_delay_minutes,
            "strategy": "KrayaSetu AI Co-location: Groups compatible P.Way, TRD, and S&T tasks into shared traffic and 25kV power possessions."
        }

        dataset_fp = compute_dataset_fingerprint(db)

        return {
            "status": "SUCCESS",
            "dataset_fingerprint": dataset_fp,
            "filter": {
                "corridor_id": corridor_id or "ALL",
                "week_start": week_start or "2026-09-25",
            },
            "scope": {
                "corridor_id": corridor_id or "ALL_CORRIDORS",
                "corridor_name": corridors_map.get(corridor_id).name if (corridor_id and corridor_id in corridors_map) else "All Bhopal Division Corridors",
                "week_start": week_start or "2026-09-25",
                "total_tasks_evaluated": len(all_tasks),
                "total_blocks_analyzed": len(all_blocks)
            },
            "summary_headline": (
                f"{downtime_hours_saved} hours of track asset downtime saved ({downtime_reduction_pct}% reduction) "
                f"by consolidating {indep_windows_count} uncoordinated departmental requests into {opt_windows_count} co-located possession windows."
            ),
            "savings": savings_dict,
            "impact": savings_dict,
            "independent_baseline": indep_dict,
            "optimized_colocated": opt_dict,
            "optimized_plan": opt_dict,
            "department_breakdown": [
                {
                    "department_id": "PWAY",
                    "department_name": "Civil Engineering (P.Way)",
                    "tasks_count": sum(1 for t in all_tasks if t.department_id == "PWAY"),
                    "independent_hours": round(indep_dept_mins["PWAY"] / 60.0, 2),
                    "optimized_hours": round(opt_dept_mins["PWAY"] / 60.0, 2),
                    "downtime_hours_saved": max(0.0, round((indep_dept_mins["PWAY"] - opt_dept_mins["PWAY"]) / 60.0, 2)),
                    "reduction_pct": round(((indep_dept_mins["PWAY"] - opt_dept_mins["PWAY"]) / indep_dept_mins["PWAY"] * 100), 1) if indep_dept_mins["PWAY"] else 0.0
                },
                {
                    "department_id": "TRD",
                    "department_name": "Traction Distribution (TRD / 25kV OHE)",
                    "tasks_count": sum(1 for t in all_tasks if t.department_id == "TRD"),
                    "independent_hours": round(indep_dept_mins["TRD"] / 60.0, 2),
                    "optimized_hours": round(opt_dept_mins["TRD"] / 60.0, 2),
                    "downtime_hours_saved": max(0.0, round((indep_dept_mins["TRD"] - opt_dept_mins["TRD"]) / 60.0, 2)),
                    "reduction_pct": round(((indep_dept_mins["TRD"] - opt_dept_mins["TRD"]) / indep_dept_mins["TRD"] * 100), 1) if indep_dept_mins["TRD"] else 0.0
                },
                {
                    "department_id": "SNT",
                    "department_name": "Signalling & Telecom (S&T)",
                    "tasks_count": sum(1 for t in all_tasks if t.department_id == "SNT"),
                    "independent_hours": round(indep_dept_mins["SNT"] / 60.0, 2),
                    "optimized_hours": round(opt_dept_mins["SNT"] / 60.0, 2),
                    "downtime_hours_saved": max(0.0, round((indep_dept_mins["SNT"] - opt_dept_mins["SNT"]) / 60.0, 2)),
                    "reduction_pct": round(((indep_dept_mins["SNT"] - opt_dept_mins["SNT"]) / indep_dept_mins["SNT"] * 100), 1) if indep_dept_mins["SNT"] else 0.0
                }
            ],
            "section_comparisons": section_comparisons,
            "sections_comparison": section_comparisons,
        }


baseline_simulator = BaselineSimulator()
