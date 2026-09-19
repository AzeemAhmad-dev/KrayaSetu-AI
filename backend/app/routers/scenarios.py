import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from backend.app.database import get_db
from backend.app.models.events import Scenario
from backend.app.models.trains import Train, TrainMovement
from backend.app.models.maintenance import Block
from backend.app.schemas.api_schemas import ScenarioApplyRequest
from backend.app.services.scenario_service import apply_scenario
from backend.app.services.movement_engine import MovementEngine
from backend.app.services.freight_generator import get_freight_trains
from backend.app.services.conflict_engine import conflict_engine

router = APIRouter(tags=["Scenarios"])

@router.get("/scenarios")
def get_scenarios(db: Session = Depends(get_db)):
    scenarios = db.query(Scenario).all()
    active_scenario = next((s for s in scenarios if s.active), None)

    return {
        "active_scenario_id": active_scenario.id if active_scenario else "NORMAL",
        "active_scenario_name": active_scenario.name if active_scenario else "Normal Operational Rhythm",
        "scenarios": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "active": s.active
            }
            for s in scenarios
        ],
        "provenance": "SIMULATED_SCENARIOS"
    }

@router.post("/scenarios/apply")
def switch_scenario(req: ScenarioApplyRequest, db: Session = Depends(get_db)):
    res = apply_scenario(db=db, scenario_id=req.scenario_id)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res.get("message"))

    # Recompute train movements under the new scenario
    tt_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "timetables.json")
    with open(tt_path, "r", encoding="utf-8") as f:
        tt_data = json.load(f)

    movement_engine = MovementEngine()
    pass_movements = movement_engine.simulate_passenger_movements(tt_data["passenger_trains"], scenario_id=req.scenario_id)

    freight_trains_data = get_freight_trains(scenario_id=req.scenario_id)
    freight_movements = movement_engine.simulate_freight_movements(freight_trains_data, scenario_id=req.scenario_id)

    all_movements = pass_movements + freight_movements

    # Update database records
    for m in all_movements:
        tnum = m["train_number"]
        tm = db.query(TrainMovement).filter(TrainMovement.train_number == tnum).first()
        if tm:
            tm.current_location = m["current_location"]
            tm.current_track = m["current_track"]
            tm.current_km = m["current_km"]
            tm.speed_kmph = m["speed_kmph"]
            tm.scheduled_time = m["scheduled_time"]
            tm.estimated_time = m["estimated_time"]
            tm.delay_minutes = m["delay_minutes"]
            tm.delay_category = m["delay_category"]
            tm.status = m["status"]
            tm.hold_location = m.get("hold_location")
            tm.hold_reason = m.get("hold_reason")
            tm.updated_at = datetime.utcnow()
        else:
            # New synthetic train in heavy freight
            new_tm = TrainMovement(
                id=f"MOV-{tnum}",
                train_number=tnum,
                current_location=m["current_location"],
                current_track=m["current_track"],
                current_km=m["current_km"],
                speed_kmph=m["speed_kmph"],
                scheduled_time=m["scheduled_time"],
                estimated_time=m["estimated_time"],
                delay_minutes=m["delay_minutes"],
                delay_category=m["delay_category"],
                status=m["status"],
                hold_location=m.get("hold_location"),
                hold_reason=m.get("hold_reason"),
                source_type="SYNTHETIC",
                updated_at=datetime.utcnow()
            )
            db.add(new_tm)

    # Re-evaluate all planned blocks
    blocks = db.query(Block).filter(Block.status == "PLANNED").all()
    mov_dicts = [
        {
            "train_number": m["train_number"],
            "train_name": m["train_name"],
            "train_type": m["train_type"],
            "current_track": m["current_track"],
            "current_km": m["current_km"],
            "scheduled_time": m["scheduled_time"],
            "estimated_time": m["estimated_time"],
            "delay_minutes": m["delay_minutes"],
            "status": m["status"],
            "priority": m["priority"]
        }
        for m in all_movements
    ]

    recalculated_blocks = []
    for b in blocks:
        eval_res = conflict_engine.evaluate_block_proposal(
            corridor_id=b.corridor_id,
            section_id=b.section_id,
            track_name=b.track_name,
            location_km=b.location_km,
            start_time=b.requested_start_time,
            end_time=b.requested_end_time,
            protection_type=b.protection_type,
            requires_power_isolation=b.power_isolation_required,
            train_movements=mov_dicts
        )
        b.conflict_status = eval_res["conflict_status"]
        b.conflict_summary = eval_res["summary"]
        b.conflicting_trains = json.dumps(eval_res["conflicting_passenger_trains"])
        recalculated_blocks.append({
            "block_id": b.id,
            "conflict_status": b.conflict_status,
            "summary": b.conflict_summary,
            "alternative_window": eval_res.get("alternative_window")
        })

    db.commit()

    return {
        "status": "SUCCESS",
        "applied_scenario": req.scenario_id,
        "train_movements_updated": len(all_movements),
        "recalculated_blocks": recalculated_blocks
    }
