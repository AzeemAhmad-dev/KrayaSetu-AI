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
