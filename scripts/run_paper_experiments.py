import sys
import os
import json
import time
from datetime import datetime, timedelta

# Ensure backend path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.schemas.contracts import (
    ScheduleRequest, PlanningHorizon, BlockSection, TrainMovement,
    MaintenanceRequest, PriorityInputs, ResourceCapacity, CrewPool, CrewShift, PlantPool, SolverConfig, MLEnrichment
)
from app.solver.greedy_heuristic import greedy_heuristic
from app.solver.cp_sat_core import solve_plan
from app.ml.clustering import cluster_defects_into_blocks
import random

def generate_scenario(num_requests, num_blocks=5, horizon_hours=12):
    start_dt = datetime(2025, 1, 1, 0, 0, 0)
    horizon_minutes = horizon_hours * 60
    
    block_sections = [
        BlockSection(
            block_section_id=f"BS-{i}", name=f"Section {i}", division="DIV", 
            adjacent_section_ids=[], track_type="main"
        )
        for i in range(num_blocks)
    ]
    
    train_movements = []
    # Add some regular trains
    for b in range(num_blocks):
        for h in range(1, horizon_hours, 3):
            train_movements.append(TrainMovement(
                train_id=f"TRN-{b}-{h}",
                block_section_id=f"BS-{b}",
                direction="UP",
                scheduled_entry=(start_dt + timedelta(hours=h)).isoformat(),
                scheduled_exit=(start_dt + timedelta(hours=h, minutes=30)).isoformat(),
                headway_before_minutes=10,
                headway_after_minutes=10,
                flexibility="fixed",
                max_shift_minutes=0,
                train_priority_class="exp"
            ))
            
    requests = []
    raw_defects = []
    for i in range(num_requests):
        bs_id = f"BS-{random.randint(0, num_blocks-1)}"
        chainage = random.uniform(0.0, 10.0)
        start_min = random.randint(0, horizon_minutes - 120)
        dur = random.randint(30, 90)
        prio = random.randint(1, 5)
        
        req = MaintenanceRequest(
            work_id=f"REQ-{i}",
            source_system="SYS",
            defect_type="track",
            job_type="single",
            block_sections_required=[bs_id],
            duration_minutes=dur,
            earliest_start=start_dt.isoformat(),
            latest_start=(start_dt + timedelta(minutes=horizon_minutes)).isoformat(),
            mandatory=False,
            crew_type="track_crew",
            crew_size=1,
            priority_score=float(prio)
        )
        requests.append(req)
        raw_defects.append({
            "id": req.work_id,
            "chainage_km": chainage,
            "block_section_id": bs_id,
            "earliest_start_min": start_min,
            "latest_start_min": horizon_minutes,
            "dur_i": dur,
            "priority_score": prio
        })
        
    # Cluster defects by block section
    for b in range(num_blocks):
        bs_id = f"BS-{b}"
        b_defects = [d for d in raw_defects if d["block_section_id"] == bs_id]
        clusters = cluster_defects_into_blocks(b_defects)
        # Assign cluster_id back to requests
        for cid, cl in enumerate(clusters):
            for jid in cl["job_ids"]:
                req = next(r for r in requests if r.work_id == jid)
                req.ml_enrichment = MLEnrichment(
                    escalation_risk_probability=0.1, escalation_risk_R=0.1, risk_confidence="high", top_risk_factors=[],
                    predicted_duration_minutes=req.duration_minutes, duration_quantile="p80", duration_source="model_p80",
                    cluster_id=f"CL-{bs_id}-{cid}", model_version="1.0"
                )
                
    capacity = ResourceCapacity(
        crew_pools=[CrewPool(crew_type="track_crew", shifts=[CrewShift(start=start_dt.isoformat(), end=(start_dt + timedelta(minutes=horizon_minutes)).isoformat(), capacity=10)])],
        plant_pools=[]
    )
    
    return ScheduleRequest(
        planning_horizon=PlanningHorizon(start_datetime=start_dt.isoformat(), horizon_minutes=horizon_minutes, timezone="UTC"),
        block_sections=block_sections,
        train_movements=train_movements,
        maintenance_requests=requests,
        resource_capacity=capacity,
        solver_config=SolverConfig(max_time_in_seconds=10.0)
    )

def evaluate(request: ScheduleRequest, name: str, is_fcfs=False):
    t0 = time.time()
    if name in ["FCFS", "Priority"]:
        if is_fcfs:
            # Randomize priorities to simulate FCFS ignoring priority
            for r in request.maintenance_requests:
                r.priority_score = 1.0 
        res = greedy_heuristic(request)
        t_ms = int((time.time() - t0) * 1000)
        assigned = len(res["assigned"])
        util = sum((r.get("assigned_end") - r.get("assigned_start")) for r in res["assigned"])
        blocks_used = len(set(tuple(r.get("block_sections_used", [])) for r in res["assigned"]))
        return {"Method": name, "Blocks Used": blocks_used, "Utilization": util, "Completion": assigned, "Runtime": t_ms}
    else:
        res = solve_plan(request)
        assigned = len(res.selected_work_packages)
        util = sum((datetime.fromisoformat(w.assigned_end) - datetime.fromisoformat(w.assigned_start)).total_seconds() / 60 for w in res.selected_work_packages)
        
        # For CP-SAT with bundling, requests sharing a cluster start at same time in a single "block".
        # We can approximate "Blocks Used" by counting unique (block_section, assigned_start).
        blocks_set = set()
        for w in res.selected_work_packages:
            if w.block_sections_used:
                blocks_set.add((w.block_sections_used[0], w.assigned_start))
        
        return {"Method": name, "Blocks Used": len(blocks_set), "Utilization": util, "Completion": assigned, "Runtime": res.solve_time_ms}

def main():
    random.seed(42)
    results = []
    
    for size, n_req in [("Small", 20), ("Medium", 50), ("Large", 100)]:
        req = generate_scenario(n_req)
        
        fcfs = evaluate(req, "FCFS", is_fcfs=True)
        fcfs["Scenario"] = size
        fcfs["Total"] = n_req
        
        prio = evaluate(req, "Priority")
        prio["Scenario"] = size
        prio["Total"] = n_req
        
        prop = evaluate(req, "Proposed CP-SAT")
        prop["Scenario"] = size
        prop["Total"] = n_req
        
        results.extend([fcfs, prio, prop])
        
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
