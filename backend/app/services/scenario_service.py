from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models.events import Scenario
from backend.app.services.event_logger import log_event

AVAILABLE_SCENARIOS = [
    {
        "id": "NORMAL",
        "name": "Normal Operational Rhythm",
        "description": "Standard timetable execution, minor operational buffers (0-15m), balanced freight flow, routine maintenance windows available."
    },
    {
        "id": "HEAVY_DELAY",
        "name": "Cascading Heavy Delay Scenario",
        "description": "Major delays on key passenger trains (12615 GT Express delayed +3h55m, 12137 Punjab Mail delayed +1h45m), shifting expected paths and overlapping planned maintenance slots."
    },
    {
        "id": "FREIGHT_HEAVY",
        "name": "Freight Surge & Coal Corridor Priority",
        "description": "Additional bulk rakes (Singrauli coal & Western container rakes) introduced into the Bhopal division. Heavy loop holding at Sumer, Bir and Mandideep."
    },
    {
        "id": "MAINTENANCE_DISRUPTION",
        "name": "Urgent P.Way & OHE Defect Escalation",
        "description": "Rail fracture detected between Vidisha and Gulabganj + OHE catenary sag at Mandideep requiring emergency protection blocks."
    },
    {
        "id": "BLOCK_CONFLICT",
        "name": "Overlapping Block Window Stress Test",
        "description": "Simultaneous block requests for CSM tamper and Tower Wagon on adjacent sections testing conflict resolution and CP-SAT re-optimization."
    }
]

def initialize_scenarios(db: Session):
    for s_data in AVAILABLE_SCENARIOS:
        existing = db.query(Scenario).filter(Scenario.id == s_data["id"]).first()
        if not existing:
            sc = Scenario(
                id=s_data["id"],
                name=s_data["name"],
                description=s_data["description"],
                active=(s_data["id"] == "NORMAL")
            )
            db.add(sc)
    db.commit()

def apply_scenario(db: Session, scenario_id: str, actor: str = "Chief Controller - Bhopal") -> Dict[str, Any]:
    alias_map = {
        "SCENARIO_1": "NORMAL",
        "SCENARIO_2": "HEAVY_DELAY",
        "SCENARIO_3": "FREIGHT_HEAVY",
        "SCENARIO_4": "MAINTENANCE_DISRUPTION",
        "SCENARIO_5": "BLOCK_CONFLICT",
    }
    resolved_id = alias_map.get(scenario_id.upper(), scenario_id.upper())

    scenarios = db.query(Scenario).all()
    target = None
    for s in scenarios:
        if s.id.upper() == resolved_id:
            s.active = True
            target = s
        else:
            s.active = False
    db.commit()

    if target:
        log_event(
            db=db,
            actor=actor,
            role="CONTROLLER",
            entity="SCENARIO",
            entity_id=scenario_id,
            action="SCENARIO_SWITCH",
            previous_state="ACTIVE",
            new_state=scenario_id,
            reason=f"Operational scenario shifted to {target.name}",
            provenance="SIMULATED"
        )
        return {"status": "SUCCESS", "scenario": target.id, "name": target.name, "description": target.description}
    return {"status": "ERROR", "message": f"Scenario {scenario_id} not found"}
