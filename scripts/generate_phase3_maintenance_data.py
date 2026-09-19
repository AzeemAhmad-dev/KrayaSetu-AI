"""
Phase 3 Controlled Maintenance Dataset Generator for KrayaSetu AI
Smart India Hackathon Problem Statement 26027

Generates exactly 1,000 maintenance tasks and 1,000 corresponding defects.
Dataset Properties:
- Total Tasks: 1000
- Critical: Exactly 1 (TASK-0001, single corridor, single station, single section, single km)
- High: 15 (<= 25)
- Medium: 450 (~45%)
- Low: 534 (remainder)
- Sum: 1 + 15 + 450 + 534 = 1000
- Infrastructure: 100% grounded in existing corridors, sections, tracks, stations
- Reference Catalogs: 100% grounded in existing departments, work_types, equipment
- Source Type: CONTROLLED_SYNTHETIC
"""

import sys
import os
import random
import time
from datetime import datetime, timedelta

# Ensure backend modules are importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database import SessionLocal
from backend.app.models.network import Section, Track, Station, Corridor
from backend.app.models.maintenance import (
    FaultObservation,
    MaintenanceTask,
    Block,
    Department,
    WorkType,
    Equipment,
)

# Realistic Defect & Task Templates by Department & Priority
DEFECT_TEMPLATES = {
    "PWAY": {
        "CRITICAL": [
            {
                "work_type": "RAIL_FRACTURE_REPAIR",
                "title": "Major Transverse Rail Fracture with Gap on Down Main",
                "desc": "Ultrasonic testing and track patrol detected critical transverse fatigue fracture with 4mm gap on rail head at KM {km:.3f}. Immediate derailment hazard for high-speed express traffic. Requires immediate emergency fishplating, speed stop, and rail renewal.",
                "duration": 90,
                "equipment": None,
                "protection": "EMERGENCY_PROTECTION",
                "mode": "FULL_BLOCK",
                "power_iso": False,
                "track_occ": True,
            }
        ],
        "HIGH": [
            {
                "work_type": "RAIL_FRACTURE_REPAIR",
                "title": "Internal Transverse Fatigue Flaw Exceeding IMR Limits",
                "desc": "USFD vehicle detected severe internal transverse crack in 60kg rail web near weld at KM {km:.3f}. Defect categorized as Immediate Removal (IMR). Emergency clamping and rail piece replacement required.",
                "duration": 90,
                "equipment": "USFD_01",
                "protection": "TRAFFIC_BLOCK",
                "mode": "FULL_BLOCK",
                "power_iso": False,
                "track_occ": True,
            },
            {
                "work_type": "TURNOUT_OVERHAUL",
                "title": "Turnout Switch Rail Chipping and Severe Gauge Widening",
                "desc": "Turnout inspection revealed 6mm chipping on switch tongue rail and gauge widening to +8mm at KM {km:.3f}. Risk of wheel flange climbing under heavy freight movements. Turnout packing and parts renewal needed.",
                "duration": 180,
                "equipment": "UNIMAT_01",
                "protection": "TRAFFIC_BLOCK",
                "mode": "FULL_BLOCK",
                "power_iso": False,
                "track_occ": True,
            },
            {
                "work_type": "DEEP_SCREENING",
                "title": "Severe Ballast Cavitation and Slurry Pumping on Transition Curve",
                "desc": "Track geometry car registered recurring vertical acceleration peaks. Visual check shows severe ballast pulverization and mud pumping over 200m at KM {km:.3f}. Deep ballast screening urgently required.",
                "duration": 240,
                "equipment": "BCM_01",
                "protection": "TRAFFIC_BLOCK",
                "mode": "FULL_BLOCK",
                "power_iso": False,
                "track_occ": True,
            },
            {
                "work_type": "RAIL_RENEWAL",
                "title": "Excessive Rail Head Wear on High-Speed Outer Curve",
                "desc": "Head wear on outer high rail has reached 7.8mm approaching safety condemning limits at KM {km:.3f}. Requires planned Through Rail Renewal (TRR) of 500m curve panel.",
                "duration": 180,
                "equipment": None,
                "protection": "TRAFFIC_BLOCK",
                "mode": "FULL_BLOCK",
                "power_iso": False,
                "track_occ": True,
            },
            {
                "work_type": "TAMPER_PACKING",
                "title": "Track Alignment Deviation and Cross-Level Error Post-Monsoon",
                "desc": "Track recording car recorded alignment twist of 3.8mm/m and cross-level variations at KM {km:.3f}. Continuous track tamping required to restore 130 km/h operational fitness.",
                "duration": 150,
                "equipment": "CSM_01",
                "protection": "TRAFFIC_BLOCK",
                "mode": "FULL_BLOCK",
                "power_iso": False,
                "track_occ": True,
            }
        ],
        "MEDIUM": [
            {
                "work_type": "TAMPER_PACKING",
                "title": "Periodic Track Tamping and Ballast Consolidation",
                "desc": "Routine scheduled mechanized packing to maintain track parameters and top-alignment at KM {km:.3f}.",
                "duration": 150,
                "equipment": "CSM_01",
                "protection": "TRAFFIC_BLOCK",
                "mode": "FULL_BLOCK",
                "power_iso": False,
                "track_occ": True,
            },
            {
                "work_type": "USFD_TESTING",
                "title": "Scheduled Periodic Ultrasonic Rail Flaw Inspection",
                "desc": "Quarterly digital ultrasonic flaw detection pass over mainline rails and thermite welds at KM {km:.3f}.",
                "duration": 90,
                "equipment": "USFD_01",
                "protection": "TRAFFIC_CAUTION",
                "mode": "CAUTION_DRIVE",
                "power_iso": False,
                "track_occ": False,
            },
            {
                "work_type": "TURNOUT_OVERHAUL",
                "title": "Points and Crossing Overhaul and Clearance Setting",
                "desc": "Adjustment of check rail clearances, spherical washers replacement, and tongue rail leveling at turnout KM {km:.3f}.",
                "duration": 150,
                "equipment": "UNIMAT_01",
                "protection": "TRAFFIC_BLOCK",
                "mode": "FULL_BLOCK",
                "power_iso": False,
                "track_occ": True,
            },
            {
                "work_type": "RAIL_RENEWAL",
                "title": "Through Rail Renewal of Worn Curve Rail Panel",
                "desc": "Replacement of 60kg 90UTS rail section showing moderate side wear at KM {km:.3f}.",
                "duration": 180,
                "equipment": None,
                "protection": "TRAFFIC_BLOCK",
                "mode": "FULL_BLOCK",
                "power_iso": False,
                "track_occ": True,
            },
            {
                "work_type": "DEEP_SCREENING",
                "title": "Ballast Cleaning and Cushion Renewal",
                "desc": "Mechanized ballast screening to restore clean 300mm ballast cushion at KM {km:.3f}.",
                "duration": 210,
                "equipment": "BCM_01",
                "protection": "TRAFFIC_BLOCK",
                "mode": "FULL_BLOCK",
                "power_iso": False,
                "track_occ": True,
            }
        ],
        "LOW": [
            {
                "work_type": "USFD_TESTING",
                "title": "Routine Periodic USFD Pass on Tangent Track",
                "desc": "Precautionary USFD scan of weld joints on tangent track panel at KM {km:.3f}.",
                "duration": 60,
                "equipment": "USFD_01",
                "protection": "TRAFFIC_CAUTION",
                "mode": "CAUTION_DRIVE",
                "power_iso": False,
                "track_occ": False,
            },
            {
                "work_type": "TAMPER_PACKING",
                "title": "Minor Spot Tamping of Station Loop Line",
                "desc": "Tamping and ballast dressing on station reception line at KM {km:.3f}.",
                "duration": 90,
                "equipment": "CSM_01",
                "protection": "TRAFFIC_BLOCK",
                "mode": "SHADOW_BLOCK",
                "power_iso": False,
                "track_occ": True,
            },
            {
                "work_type": "TURNOUT_OVERHAUL",
                "title": "Turnout Fasteners Inspection and Elastic Rail Clip Renewal",
                "desc": "Routine replacement of missing or fatigued ERC clips and rubber pads at turnout KM {km:.3f}.",
                "duration": 60,
                "equipment": None,
                "protection": "TRAFFIC_CAUTION",
                "mode": "SHADOW_BLOCK",
                "power_iso": False,
                "track_occ": False,
            }
        ]
    },
    "TRD": {
        "CRITICAL": [
            {
                "work_type": "OHE_WIRE_PARTING_EMG",
                "title": "Severe 25kV Catenary Wire Parting with Live Flashover Hazard",
                "desc": "Loco pilot and SCADA telemetry reported 25kV catenary wire snapped and hanging 1.2m above rail head at KM {km:.3f}. Severe electrical arcing and immediate derailment hazard on trunk corridor. Demands emergency power cut and wire splicing.",
                "duration": 120,
                "equipment": "TW_BPL_01",
                "protection": "TRAFFIC_AND_POWER_ISOLATION",
                "mode": "EMERGENCY",
                "power_iso": True,
                "track_occ": True,
            }
        ],
        "HIGH": [
            {
                "work_type": "OHE_WIRE_PARTING_EMG",
                "title": "OHE Catenary Wire Dropper Parting and Extreme Sag",
                "desc": "OHE inspection trolley spotted two snapped droppers and contact wire sagging 120mm below nominal height at KM {km:.3f}. Imminent pantograph entanglement hazard. Urgent emergency isolation and re-tensioning required.",
                "duration": 150,
                "equipment": "TW_BPL_01",
                "protection": "TRAFFIC_AND_POWER_ISOLATION",
                "mode": "FULL_BLOCK",
                "power_iso": True,
                "track_occ": True,
            },
            {
                "work_type": "INSULATOR_REPLACEMENT",
                "title": "Section Insulator Flashover and Glaze Cracking near Substation",
                "desc": "Severe arc flashover recorded at 25kV section insulator at KM {km:.3f}. Carbon tracking across porcelain shells threatens feeder tripping under load. Replacement required.",
                "duration": 90,
                "equipment": "TW_BINA_01",
                "protection": "TRAFFIC_AND_POWER_ISOLATION",
                "mode": "FULL_BLOCK",
                "power_iso": True,
                "track_occ": True,
            },
            {
                "work_type": "OHE_ADJUSTMENT",
                "title": "OHE Stagger and Height Deviation in High-Wind Section",
                "desc": "Contact wire stagger recorded at 280mm (exceeding 200mm permissible limit) at KM {km:.3f}. Severe risk of pantograph slipping outside wire span. Immediate alignment needed.",
                "duration": 120,
                "equipment": "TW_BPL_01",
                "protection": "TRAFFIC_AND_POWER_ISOLATION",
                "mode": "FULL_BLOCK",
                "power_iso": True,
                "track_occ": True,
            }
        ],
        "MEDIUM": [
            {
                "work_type": "OHE_ADJUSTMENT",
                "title": "Quarterly OHE Stagger and Contact Wire Height Profiling",
                "desc": "Verification and calibration of contact wire height, droppers tension, and cantilever registration at KM {km:.3f}.",
                "duration": 90,
                "equipment": "TW_BPL_01",
                "protection": "TRAFFIC_AND_POWER_ISOLATION",
                "mode": "FULL_BLOCK",
                "power_iso": True,
                "track_occ": True,
            },
            {
                "work_type": "INSULATOR_REPLACEMENT",
                "title": "Preventive Replacement of 25kV 9-Tonne Bracket Insulators",
                "desc": "Scheduled change-out of bracket insulators showing signs of pollution deposition at KM {km:.3f}.",
                "duration": 75,
                "equipment": "TW_BINA_01",
                "protection": "TRAFFIC_AND_POWER_ISOLATION",
                "mode": "FULL_BLOCK",
                "power_iso": True,
                "track_occ": True,
            },
            {
                "work_type": "TREE_TRIMMING_OHE",
                "title": "Tree Branch Trimming along 25kV Traction Corridor",
                "desc": "Tree trimming to maintain statutory 4-meter electrical clearance from overhead energized lines at KM {km:.3f}.",
                "duration": 60,
                "equipment": None,
                "protection": "POWER_ISOLATION",
                "mode": "SHADOW_BLOCK",
                "power_iso": True,
                "track_occ": False,
            }
        ],
        "LOW": [
            {
                "work_type": "TREE_TRIMMING_OHE",
                "title": "Pre-Monsoon Foliage Trimming along Right of Way",
                "desc": "Trimming of dry branches outside immediate 4m clearance buffer along embankment at KM {km:.3f}.",
                "duration": 45,
                "equipment": None,
                "protection": "POWER_ISOLATION",
                "mode": "SHADOW_BLOCK",
                "power_iso": True,
                "track_occ": False,
            },
            {
                "work_type": "OHE_ADJUSTMENT",
                "title": "Periodic Visual Check of Auto Tensioning Device (ATD) Weights",
                "desc": "Measurement of 5-pulley ATD weight bobs height against temperature chart at KM {km:.3f}.",
                "duration": 45,
                "equipment": None,
                "protection": "TRAFFIC_CAUTION",
                "mode": "SHADOW_BLOCK",
                "power_iso": False,
                "track_occ": False,
            }
        ]
    },
    "SNT": {
        "CRITICAL": [
            {
                "work_type": "SIGNAL_FAILURE_EMG",
                "title": "Electronic Interlocking Vital Rack Power Supply Failure & Signal Blackout",
                "desc": "Station Master reported complete loss of signal aspects and detection across all junction crossovers at KM {km:.3f}. All signals blanked to red. Immediate route suspension; urgent power card replacement and point correspondence test required.",
                "duration": 90,
                "equipment": None,
                "protection": "EMERGENCY_PROTECTION",
                "mode": "EMERGENCY",
                "power_iso": False,
                "track_occ": True,
            }
        ],
        "HIGH": [
            {
                "work_type": "SIGNAL_FAILURE_EMG",
                "title": "Electronic Interlocking Approach Signal Aspect Red Lock",
                "desc": "Mainline home signal aspect stuck red due to fuse blowing in lamp control card at KM {km:.3f}. Train operation brought to stand. Immediate disconnection, card change, and correspondence test needed.",
                "duration": 60,
                "equipment": None,
                "protection": "TRAFFIC_BLOCK",
                "mode": "DISCONNECTION",
                "power_iso": False,
                "track_occ": True,
            },
            {
                "work_type": "POINT_MACHINE_MAINT",
                "title": "IRS Point Machine Stroke Locking Failure at Crossover",
                "desc": "Facing point machine #104 failed to achieve normal detection during route setting at KM {km:.3f}. Internal lock slide binding. Demands immediate disconnection and friction clutch adjustment.",
                "duration": 60,
                "equipment": None,
                "protection": "TRAFFIC_BLOCK",
                "mode": "DISCONNECTION",
                "power_iso": False,
                "track_occ": True,
            },
            {
                "work_type": "AXLE_COUNTER_TEST",
                "title": "Digital Axle Counter (DAC) Intermittent Section Reset Failure",
                "desc": "High-availability SSDAC wheel detector at KM {km:.3f} showing intermittent count mismatch during high-speed passage. Sensor coil tuning and clamping readjustment required.",
                "duration": 45,
                "equipment": None,
                "protection": "TRAFFIC_CAUTION",
                "mode": "CAUTION_DRIVE",
                "power_iso": False,
                "track_occ": False,
            }
        ],
        "MEDIUM": [
            {
                "work_type": "POINT_MACHINE_MAINT",
                "title": "Bi-Monthly Point Machine Cleaning, Lubrication, and Obstruction Test",
                "desc": "Standard 5mm obstruction test, gear lubrication, and contact wiping of electric point machine at KM {km:.3f}.",
                "duration": 60,
                "equipment": None,
                "protection": "TRAFFIC_BLOCK",
                "mode": "DISCONNECTION",
                "power_iso": False,
                "track_occ": True,
            },
            {
                "work_type": "AXLE_COUNTER_TEST",
                "title": "Scheduled Tuning and Amplitude Verification of Axle Detectors",
                "desc": "Peak-to-peak voltage verification and alignment tuning of trackside electronic wheel sensors at KM {km:.3f}.",
                "duration": 45,
                "equipment": None,
                "protection": "TRAFFIC_CAUTION",
                "mode": "CAUTION_DRIVE",
                "power_iso": False,
                "track_occ": False,
            },
            {
                "work_type": "SIGNAL_CABLE_MEGGERING",
                "title": "Quarterly Signalling Main Cable Insulation Resistance Testing",
                "desc": "Megger testing of underground copper signalling cables between relay room and trackside apparatus at KM {km:.3f}.",
                "duration": 60,
                "equipment": None,
                "protection": "NO_SPECIAL_PROTECTION",
                "mode": "SHADOW_BLOCK",
                "power_iso": False,
                "track_occ": False,
            }
        ],
        "LOW": [
            {
                "work_type": "SIGNAL_CABLE_MEGGERING",
                "title": "Routine Meggering of Location Box Tail Cables",
                "desc": "Insulation resistance check of secondary tail cables to track circuits and signals at KM {km:.3f}.",
                "duration": 45,
                "equipment": None,
                "protection": "NO_SPECIAL_PROTECTION",
                "mode": "SHADOW_BLOCK",
                "power_iso": False,
                "track_occ": False,
            },
            {
                "work_type": "AXLE_COUNTER_TEST",
                "title": "Trackside Axle Counter Housing and Bond Wire Inspection",
                "desc": "Visual tightening of earth bonds and weatherproofing of axle counter junction box at KM {km:.3f}.",
                "duration": 30,
                "equipment": None,
                "protection": "NO_SPECIAL_PROTECTION",
                "mode": "SHADOW_BLOCK",
                "power_iso": False,
                "track_occ": False,
            },
            {
                "work_type": "POINT_MACHINE_MAINT",
                "title": "Routine External Point Mechanism Cleaning and Greasing",
                "desc": "Cleaning of slide chairs and application of graphite grease to switch rails at KM {km:.3f}.",
                "duration": 30,
                "equipment": None,
                "protection": "TRAFFIC_CAUTION",
                "mode": "SHADOW_BLOCK",
                "power_iso": False,
                "track_occ": False,
            }
        ]
    }
}

REPORTERS_BY_ROLE = [
    ("Senior Section Engineer (P.Way)", "SSE"),
    ("Junior Engineer (P.Way)", "JE"),
    ("Senior Section Engineer (TRD/OHE)", "SSE"),
    ("Junior Engineer (TRD)", "JE"),
    ("Senior Section Engineer (Signal)", "SSE"),
    ("Junior Engineer (Signal)", "JE"),
    ("Chief Track Inspector", "INSPECTOR"),
    ("Loco Pilot - Freight", "LOCO_PILOT"),
    ("Loco Pilot - Vande Bharat", "LOCO_PILOT"),
    ("Station Master", "STATION_MASTER"),
]

def generate_dataset(db=None, total_count=50, random_seed=None):
    """
    Dynamic Maintenance Dataset Generator for KrayaSetu AI.
    Generates exactly `total_count` (default: 50) randomized maintenance tasks
    grounded across Bhopal Division's 5 corridors and sections.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        if random_seed is not None:
            random.seed(random_seed)
        else:
            random.seed(time.time() + os.getpid())

        print(f"Cleaning existing operational tables before generating {total_count} tasks...")
        cleared_blocks = db.query(Block).delete()
        cleared_tasks = db.query(MaintenanceTask).delete()
        cleared_faults = db.query(FaultObservation).delete()
        db.commit()

        # Load infrastructure catalogs
        sections = db.query(Section).all()
        stations = {s.code: s for s in db.query(Station).all()}
        tracks = db.query(Track).all()
        corridors = {c.id: c for c in db.query(Corridor).all()}
        departments = {d.id: d for d in db.query(Department).all()}
        work_types = {w.id: w for w in db.query(WorkType).all()}
        equipment_map = {e.id: e for e in db.query(Equipment).all()}

        tracks_by_section = {}
        for t in tracks:
            tracks_by_section.setdefault(t.section_id, []).append(t)

        TARGET_TOTAL = total_count
        # Guarantees 1-2 CRITICAL, 4-7 HIGH, 18-24 MEDIUM, and remainder LOW
        COUNT_CRITICAL = random.choice([1, 2])
        COUNT_HIGH = random.randint(4, 7)
        COUNT_MEDIUM = random.randint(18, 24)
        COUNT_LOW = TARGET_TOTAL - COUNT_CRITICAL - COUNT_HIGH - COUNT_MEDIUM
        assert COUNT_CRITICAL + COUNT_HIGH + COUNT_MEDIUM + COUNT_LOW == TARGET_TOTAL

        task_records = []
        fault_records = []
        task_seq = 1

        def generate_task_batch(priority_name, count):
            nonlocal task_seq
            for _ in range(count):
                task_id = f"TASK-{task_seq:04d}"
                fault_id = f"FAULT-{task_seq:04d}"
                task_seq += 1

                # Randomize department with realistic railway distribution
                dept_id = random.choices(["PWAY", "TRD", "SNT"], weights=[0.50, 0.25, 0.25])[0]

                # Select defect template based on department and priority
                dept_templates = DEFECT_TEMPLATES.get(dept_id, {}).get(priority_name, [])
                if not dept_templates:
                    dept_id = "PWAY"
                    dept_templates = DEFECT_TEMPLATES["PWAY"][priority_name]
                tmpl = random.choice(dept_templates)

                # Distribute randomly across all corridors in Bhopal Division
                sec = random.choice(sections)
                corridor_id = sec.corridor_id

                # Pick track within section boundaries
                sec_tracks = tracks_by_section.get(sec.id, [])
                if sec_tracks:
                    chosen_track = random.choice(sec_tracks)
                    track_name = chosen_track.name
                else:
                    track_name = random.choice(["UP_MAIN", "DOWN_MAIN", "SINGLE_LINE", "LOOP_1"])

                # Compute realistic chainage KM within section boundaries
                if sec.end_km > sec.start_km:
                    loc_km = round(random.uniform(sec.start_km + 0.1, sec.end_km - 0.1), 3)
                else:
                    loc_km = round(sec.start_km, 3)

                from_stn = stations.get(sec.from_station_code)
                to_stn = stations.get(sec.to_station_code)
                from_name = from_stn.name if from_stn else sec.from_station_code
                to_name = to_stn.name if to_stn else sec.to_station_code
                loc_desc = f"Between {from_name} and {to_name} (KM {loc_km:.3f})"

                reporter_name, reporter_role = random.choice(REPORTERS_BY_ROLE)
                time_offset_days = random.uniform(0.1, 14.0)
                obs_time = datetime.utcnow() - timedelta(days=time_offset_days)

                urgency_map = {
                    "CRITICAL": "IMMEDIATE",
                    "HIGH": "HIGH",
                    "MEDIUM": "NORMAL",
                    "LOW": "ROUTINE"
                }
                urgency = urgency_map.get(priority_name, "NORMAL")

                # Permissible maintenance windows and modes
                time_windows = [
                    ("00:30", "04:30", "NIGHT_BLOCK"),
                    ("09:30", "12:30", "SHORT_BLOCK"),
                    ("13:00", "16:30", "FULL_BLOCK"),
                    ("22:00", "02:00", "NIGHT_BLOCK"),
                    ("11:00", "14:00", "FULL_BLOCK")
                ]
                chosen_win = random.choice(time_windows)
                maint_mode = "EMERGENCY" if priority_name == "CRITICAL" else chosen_win[2]

                base_duration = tmpl.get("duration", 120)
                duration_jitter = random.choice([-15, 0, 15, 30])
                duration_mins = max(45, base_duration + duration_jitter)

                # Equipment resolution
                eq_id = tmpl.get("equipment")
                if eq_id and eq_id not in equipment_map:
                    eq_id = None

                # Lifecycle status
                if priority_name == "CRITICAL":
                    status = "TASKED"
                elif priority_name == "HIGH":
                    status = random.choice(["TASKED", "PENDING"])
                else:
                    status = random.choice(["PENDING", "TASKED"])

                ai_conf = round(random.uniform(0.82, 0.99), 2)

                # Fault Observation
                fault = FaultObservation(
                    id=fault_id,
                    reporter=reporter_name,
                    reporter_role=reporter_role,
                    timestamp=obs_time,
                    train_reference=None,
                    corridor_id=corridor_id,
                    section_id=sec.id,
                    track_name=track_name,
                    location_km=loc_km,
                    location_description=loc_desc,
                    fault_title=tmpl["title"],
                    description=tmpl["desc"].format(km=loc_km),
                    department_id=dept_id,
                    status="TASKED" if status == "TASKED" else "OBSERVATION",
                    severity=priority_name,
                    ai_assessed=True,
                    ai_confidence=ai_conf,
                    ai_recommended_severity=priority_name,
                    ai_recommended_urgency=urgency,
                    ai_recommended_protection=tmpl["protection"],
                    ai_recommended_mode=maint_mode,
                    ai_explanation=f"Dynamic AI Decision Assessment: {priority_name} priority on {corridor_id}. Recommended protection: {tmpl['protection']}.",
                    human_status="CONFIRMED",
                    human_decision_by="Divisional Operations Manager (DOM) - Bhopal",
                    human_decision_at=obs_time + timedelta(hours=random.randint(1, 6)),
                    human_notes=f"Confirmed priority {priority_name} for dynamic solver scheduling.",
                    source_type="DYNAMIC_DEMO"
                )
                fault_records.append(fault)

                # Maintenance Task
                task = MaintenanceTask(
                    id=task_id,
                    fault_id=fault_id,
                    asset_id=None,
                    department_id=dept_id,
                    work_type_id=tmpl["work_type"],
                    corridor_id=corridor_id,
                    section_id=sec.id,
                    track_name=track_name,
                    location_km=loc_km,
                    severity=priority_name,
                    priority=priority_name,
                    duration_mins=duration_mins,
                    assigned_crew=f"{dept_id} Maintenance Squad #{random.randint(1, 6)}",
                    equipment_id=eq_id,
                    operational_impact="FULL_BLOCK" if tmpl["track_occ"] else "SPEED_RESTRICTION",
                    required_protection=tmpl["protection"],
                    maintenance_mode=maint_mode,
                    requires_power_isolation=tmpl["power_iso"],
                    requires_track_occupation=tmpl["track_occ"],
                    compatible_with_train_movement=not tmpl["track_occ"],
                    status=status,
                    source_type="DYNAMIC_DEMO",
                    crew_id=None
                )
                task_records.append(task)

        print(f"Generating {COUNT_CRITICAL} CRITICAL tasks...")
        generate_task_batch("CRITICAL", COUNT_CRITICAL)

        print(f"Generating {COUNT_HIGH} HIGH priority tasks...")
        generate_task_batch("HIGH", COUNT_HIGH)

        print(f"Generating {COUNT_MEDIUM} MEDIUM priority tasks...")
        generate_task_batch("MEDIUM", COUNT_MEDIUM)

        print(f"Generating {COUNT_LOW} LOW priority tasks...")
        generate_task_batch("LOW", COUNT_LOW)

        assert len(task_records) == TARGET_TOTAL
        assert len(fault_records) == TARGET_TOTAL

        print(f"Bulk saving {len(fault_records)} faults and {len(task_records)} tasks to database...")
        db.bulk_save_objects(fault_records)
        db.commit()

        db.bulk_save_objects(task_records)
        db.commit()

        print("Dynamic task generation complete.")
        return {
            "cleared_blocks": cleared_blocks,
            "total_tasks": len(task_records),
            "priority_distribution": {
                "CRITICAL": COUNT_CRITICAL,
                "HIGH": COUNT_HIGH,
                "MEDIUM": COUNT_MEDIUM,
                "LOW": COUNT_LOW
            }
        }
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    generate_dataset()
