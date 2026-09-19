import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app

def run_first_demo():
    client = TestClient(app)
    print("=" * 70)
    print("KRAYASETU AI · AUTOMATED END-TO-END DEMO WORKFLOW VERIFICATION")
    print("=" * 70)

    # 1. Health & Division Verification
    print("\n[STEP 1] Login & Division Overview")
    res = client.get("/api/health")
    assert res.status_code == 200
    print(f" -> System Health: {res.json()['status']}")
    print(f" -> Division: {res.json()['division']} ({res.json()['zone']})")

    res = client.get("/api/summary")
    assert res.status_code == 200
    summary = res.json()
    print(f" -> Total Corridors: {summary['statistics']['total_corridors']}")
    print(f" -> Total Researched Locations: {summary['statistics']['total_researched_locations']}")
    print(f" -> Major Stations Count: {summary['statistics']['major_stations_count']}")

    # 2. Corridors & Major Station Network
    print("\n[STEP 2] Corridors & Major Station Network")
    res = client.get("/api/corridors")
    assert res.status_code == 200
    corridors = res.json()
    for c in corridors:
        print(f" -> {c['id']}: {c['name']} ({c['track_configuration']}, {c['total_distance_km']} km, {c['total_locations']} locations)")

    # 3. Train Movements: Delayed passenger & Synthetic Freight Holding
    print("\n[STEP 3] Train Movements & Synthetic Freight Holding")
    res = client.get("/api/train-movements")
    assert res.status_code == 200
    movements = res.json()
    shatabdi = next((m for m in movements if m["train_number"] == "12002"), None)
    freight_hold = next((m for m in movements if m["status"] == "HELD"), None)

    assert shatabdi is not None, "12002 Shatabdi not found"
    assert freight_hold is not None, "Held freight train not found"

    print(f" -> Passenger Movement: {shatabdi['train_number']} {shatabdi['train_name']}")
    print(f"    Location: {shatabdi['current_location']} | ETA: {shatabdi['estimated_time']} | Delay: +{shatabdi['delay_minutes']}m ({shatabdi['delay_category']})")
    print(f" -> Synthetic Freight Holding: {freight_hold['train_number']} ({freight_hold['cargo_type']} Rake)")
    print(f"    Location: {freight_hold['hold_location']} | Reason: {freight_hold['hold_reason']}")

    # 4. Maintenance Fault & AI Priority & Required Protection
    print("\n[STEP 4] Maintenance Fault & AI Decision Support")
    # Log observation
    create_payload = {
        "reporter": "Loco Pilot - 12002",
        "reporter_role": "LOCO_PILOT",
        "corridor_id": "CORR-01",
        "track_name": "DOWN_MAIN",
        "location_km": 152.2,
        "location_description": "Between Vidisha and Sorai (KM 152/8)",
        "fault_title": "OHE contact wire droop and pantograph arching",
        "description": "OHE wire sagging 90mm below permissible height near cantilever mast #152/12. Risk of wire entanglement at speed.",
        "department_id": "TRD",
        "severity": "HIGH"
    }
    res = client.post("/api/maintenance/faults", json=create_payload)
    assert res.status_code == 200
    fault_id = res.json()["fault_id"]
    print(f" -> Field Observation Logged: {fault_id}")

    # Trigger AI assessment
    res = client.post("/api/maintenance/assess", json={"fault_id": fault_id})
    assert res.status_code == 200
    ai_eval = res.json()["assessment"]
    print(f" -> AI Recommended Severity: {ai_eval['severity']}")
    print(f" -> AI Required Protection: {ai_eval['required_protection']}")
    print(f" -> AI Maintenance Mode: {ai_eval['maintenance_mode']}")
    print(f" -> AI Confidence: {ai_eval['confidence'] * 100}%")
    print(f" -> AI Action Rationale: {ai_eval['recommended_action']}")

    # 5. Block Proposal & Conflict Detection
    print("\n[STEP 5] Proposed Block & Train Conflict Engine")
    proposal = {
        "corridor_id": "CORR-01",
        "section_id": "SEC-CORR-01-BHS-SOI",
        "track_name": "DOWN_MAIN",
        "location_km": 152.2,
        "requested_start_time": "12:00",
        "requested_end_time": "14:00",
        "duration_mins": 120,
        "protection_type": "POWER_ISOLATION",
        "power_isolation_required": True,
        "proposed_by": "Divisional Electrical Engineer (TRD)"
    }
    res = client.post("/api/blocks/propose", json=proposal)
    assert res.status_code == 200
    block_prop = res.json()
    print(f" -> Proposed Block ID: {block_prop['block_id']}")
    print(f" -> Conflict Status: {block_prop['conflict_status']}")
    print(f" -> Conflict Reason: {block_prop['summary']}")
    alt = block_prop.get("alternative_window")
    assert alt is not None, "Expected CP-SAT alternative window"
    print(f" -> Alternative Conflict-Free Window: {alt['suggested_start_time']} – {alt['suggested_end_time']} ({alt['duration_mins']} mins)")
    print(f"    Alternative Reason: {alt['reason']}")

    # 6. Human Controller Approval
    print("\n[STEP 6] Human Controller Approval")
    approve_res = client.post("/api/blocks/approve", json={
        "block_id": block_prop["block_id"],
        "action": "APPROVE",
        "approved_by": "Chief Section Controller - Bhopal",
        "notes": "Approved for execution with TRD Tower Wagon TW_BPL_01."
    })
    assert approve_res.status_code == 200
    print(f" -> Block {block_prop['block_id']} Status: {approve_res.json()['new_status']}")

    # 7. Station Master View
    print("\n[STEP 7] Station Master Console (Bhopal Jn - BPL)")
    res = client.get("/api/stations/BPL")
    assert res.status_code == 200
    bpl = res.json()
    print(f" -> Station: {bpl['station']['name']} ({bpl['station']['code']})")
    print(f" -> Verified Platforms: {len(bpl['platforms_layout'])} platforms")
    print(f" -> Verified Loop Lines: {len(bpl['loop_lines_layout'])} loop lines")
    print(f" -> Approaching Trains: {len(bpl['incoming_trains'])} trains within 35 km")

    # 8. Scenario Analysis: Heavy Delay Scenario
    print("\n[STEP 8] Scenario Analysis & Heavy Delay Recalculation")
    res = client.post("/api/scenarios/apply", json={"scenario_id": "HEAVY_DELAY"})
    assert res.status_code == 200
    sc_res = res.json()
    print(f" -> Applied Scenario: {sc_res['applied_scenario']}")
    print(f" -> Updated Train Movements: {sc_res['train_movements_updated']}")
    print(f" -> Recalculated Blocks: {len(sc_res['recalculated_blocks'])}")

    # Verify GT Express received heavy delay in telemetry
    res = client.get("/api/train-movements")
    gt = next((m for m in res.json() if m["train_number"] == "12615"), None)
    assert gt is not None
    print(f" -> GT Express (12615) Shifted Delay: +{gt['delay_minutes']}m ({gt['delay_category']})")
    print(f"    Estimated Arrival shifted to: {gt['estimated_time']}")

    # 9. Audit Event History
    print("\n[STEP 9] Immutable Event Audit Ledger")
    res = client.get("/api/events?limit=10")
    assert res.status_code == 200
    events = res.json()
    print(f" -> Retrieved {len(events)} recent operational audit events:")
    for ev in events[:5]:
        print(f"    [{ev['timestamp'][:19]}] {ev['actor']} ({ev['role']}) -> {ev['action']} on {ev['entity']}:{ev['entity_id']} [{ev['provenance']}]")

    print("\n" + "=" * 70)
    print("ALL 9 REQUIRED DEMO MILESTONES VERIFIED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_first_demo()
