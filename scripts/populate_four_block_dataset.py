"""
Populate Four Block Types & Proposed Block Dataset for KrayaSetu AI
Smart India Hackathon Problem Statement 26027 | WCR — Bhopal Division

Generates exactly 50 proposed blocks representing four real-world railway block-planning types:
1. Ruling Block (3 blocks): Long-term Annual Maintenance Programme 2026, planned months ago, future execution.
2. Planned Block (33 blocks): Near-term maintenance, diversified across all 5 active Bhopal Division corridors and planning cadences (Daily / Weekly / Monthly).
3. Emergent Block (5 blocks): Critical/urgent defects requiring immediate emergency intervention today (1 on each of the 5 active corridors).
4. Shadow Block (9 blocks): Multi-department coordinated possessions (5 tri-dept PWAY+TRD+SNT, 4 dual-dept) with 23 underlying tasks & faults with task.block_id = block.id.

Corridor Invariants:
- Exactly 5 Active Bhopal Division Corridors:
  1. CORR-01: Itarsi–Bhopal
  2. CORR-02: Bhopal–Bina
  3. CORR-03: Khandwa–Itarsi
  4. CORR-04: Bina–Guna
  5. CORR-05: Guna–Gwalior
- Ruthiyai–Maksi remains strictly excluded.
- Total blocks: exactly 50.
- Total tasks: 3 (ruling) + 33 (planned) + 5 (emergent) + 23 (shadow) = 64 tasks.
- All tasks have corresponding fault_observations.
- Zero orphan tasks, zero orphan blocks, 100% foreign key validity.
"""

import sys
import os
import json
import time
import hashlib
from datetime import datetime, timedelta, date
import random

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
from backend.app.services.time_validation import validate_or_recalculate_future_window, get_canonical_now


# ----- Active Bhopal Division Corridors & Canonical Railway Sections -----
CORRIDOR_SECTIONS = {
    "CORR-01": [
        ("SEC-CORR-01-ET-PRKD", 0.0, 10.8, "Itarsi Junction – Powarkheda"),
        ("SEC-CORR-01-PRKD-NDPM", 10.8, 18.0, "Powarkheda – Narmadapuram"),
        ("SEC-CORR-01-NDPM-BNI", 18.0, 25.4, "Narmadapuram – Budhni"),
        ("SEC-CORR-01-BNI-MDG", 25.4, 34.0, "Budhni – Midghat"),
        ("SEC-CORR-01-MDG-CKA", 34.0, 41.2, "Midghat – Choka"),
        ("SEC-CORR-01-CKA-BKA", 41.2, 50.1, "Choka – Barkhera"),
        ("SEC-CORR-01-BKA-ODG", 50.1, 60.5, "Barkhera – Obaidulla Ganj"),
        ("SEC-CORR-01-ODG-MDDP", 60.5, 75.3, "Obaidulla Ganj – Mandideep"),
        ("SEC-CORR-01-MDDP-MSD", 75.3, 82.0, "Mandideep – Misrod"),
        ("SEC-CORR-01-MSD-RKMP", 82.0, 86.0, "Misrod – Rani Kamalapati"),
        ("SEC-CORR-01-RKMP-BPL", 86.0, 92.0, "Rani Kamalapati – Bhopal Junction"),
    ],
    "CORR-02": [
        ("SEC-CORR-02-BPL-SUW", 0.0, 13.0, "Bhopal Junction – Sukhi Sewaniya"),
        ("SEC-CORR-02-SUW-BVB", 13.0, 21.0, "Sukhi Sewaniya – Bhadbhada Ghat"),
        ("SEC-CORR-02-BVB-DWG", 21.0, 30.0, "Bhadbhada Ghat – Dewanganj"),
        ("SEC-CORR-02-DWG-SMT", 30.0, 38.0, "Dewanganj – Salamatpur"),
        ("SEC-CORR-02-SMT-SCI", 38.0, 44.0, "Salamatpur – Sanchi"),
        ("SEC-CORR-02-SCI-BHS", 44.0, 54.0, "Sanchi – Vidisha"),
        ("SEC-CORR-02-BHS-SOI", 54.0, 63.0, "Vidisha – Sorai"),
        ("SEC-CORR-02-SOI-GLG", 63.0, 74.0, "Sorai – Gulabganj"),
        ("SEC-CORR-02-GLG-SUMR", 74.0, 84.0, "Gulabganj – Sumer"),
        ("SEC-CORR-02-SUMR-PBI", 84.0, 90.0, "Sumer – Pabai"),
        ("SEC-CORR-02-PBI-BAQ", 90.0, 94.0, "Pabai – Ganj Basoda"),
        ("SEC-CORR-02-BAQ-BET", 94.0, 104.0, "Ganj Basoda – Bareth"),
        ("SEC-CORR-02-BET-KAH", 104.0, 111.0, "Bareth – Kalhar"),
        ("SEC-CORR-02-KAH-MABA", 111.0, 126.0, "Kalhar – Mandi Bamora"),
        ("SEC-CORR-02-MABA-KIKA", 126.0, 135.0, "Mandi Bamora – Kurwai Kethora"),
        ("SEC-CORR-02-KIKA-BINA", 135.0, 143.0, "Kurwai Kethora – Bina Junction"),
    ],
    "CORR-03": [
        ("SEC-CORR-03-KNW-MTA", 0.0, 10.0, "Khandwa Junction – Mathela"),
        ("SEC-CORR-03-MTA-TLV", 10.0, 17.0, "Mathela – Talvadiya Junction"),
        ("SEC-CORR-03-TLV-SGBJ", 17.0, 27.0, "Talvadiya Junction – Surgaon Banjari"),
        ("SEC-CORR-03-SGBJ-KHA", 27.0, 35.0, "Surgaon Banjari – Khaigaon"),
        ("SEC-CORR-03-KHA-BIR", 35.0, 42.0, "Khaigaon – Bir"),
        ("SEC-CORR-03-BIR-CAER", 42.0, 49.0, "Bir – Chhanera"),
        ("SEC-CORR-03-CAER-BRUD", 49.0, 59.0, "Chhanera – Barud"),
        ("SEC-CORR-03-BRUD-DKI", 59.0, 67.0, "Barud – Dagarkhedi"),
        ("SEC-CORR-03-DKI-KKN", 67.0, 75.0, "Dagarkhedi – Khirkiya"),
        ("SEC-CORR-03-KKN-CKKD", 75.0, 88.0, "Khirkiya – Charkheda Khurd"),
        ("SEC-CORR-03-CKKD-CRK", 88.0, 99.0, "Charkheda Khurd – Charkheda"),
        ("SEC-CORR-03-CRK-TBN", 99.0, 109.0, "Charkheda – Timarni"),
        ("SEC-CORR-03-TBN-PGL", 109.0, 116.0, "Timarni – Pagdhal"),
        ("SEC-CORR-03-PGL-HD", 116.0, 124.0, "Pagdhal – Harda"),
        ("SEC-CORR-03-HD-MSO", 124.0, 138.0, "Harda – Masangaon"),
        ("SEC-CORR-03-MSO-BPUR", 138.0, 148.0, "Masangaon – Bhairopur"),
        ("SEC-CORR-03-BPUR-BPF", 148.0, 156.0, "Bhairopur – Banapura"),
        ("SEC-CORR-03-BPF-BHV", 156.0, 165.0, "Banapura – Bhirangi"),
        ("SEC-CORR-03-BHV-DRA", 165.0, 171.0, "Bhirangi – Dharamkundi"),
        ("SEC-CORR-03-DRA-DQL", 171.0, 178.0, "Dharamkundi – Dolariya"),
        ("SEC-CORR-03-DQL-ET", 178.0, 184.0, "Dolariya – Itarsi Junction"),
    ],
    "CORR-04": [
        ("SEC-CORR-04-BINA-MDVK", 0.0, 8.0, "Bina Junction – Mahadev Khedi"),
        ("SEC-CORR-04-MDVK-SMDK", 8.0, 16.0, "Mahadev Khedi – Semarkhedi"),
        ("SEC-CORR-04-SMDK-KNJ", 16.0, 24.0, "Semarkhedi – Kanjia"),
        ("SEC-CORR-04-KNJ-MNV", 24.0, 32.0, "Kanjia – Mungaoli"),
        ("SEC-CORR-04-MNV-GVB", 32.0, 42.0, "Mungaoli – Guneru Bamori"),
        ("SEC-CORR-04-GVB-PIA", 42.0, 53.0, "Guneru Bamori – Pipraigaon"),
        ("SEC-CORR-04-PIA-ORR", 53.0, 61.0, "Pipraigaon – Orr"),
        ("SEC-CORR-04-ORR-HPK", 61.0, 69.0, "Orr – Hinotia Pipalkhera"),
        ("SEC-CORR-04-HPK-ASKN", 69.0, 77.0, "Hinotia Pipalkhera – Ashoknagar"),
        ("SEC-CORR-04-ASKN-RTAH", 77.0, 88.0, "Ashoknagar – Ratikheda"),
        ("SEC-CORR-04-RTAH-SHDR", 88.0, 98.0, "Ratikheda – Shadhoragaon"),
        ("SEC-CORR-04-SHDR-PGI", 98.0, 108.0, "Shadhoragaon – Pilighat"),
        ("SEC-CORR-04-PGI-GUNA", 108.0, 119.0, "Pilighat – Guna Junction"),
    ],
    "CORR-05": [
        ("SEC-CORR-05-GUNA-TRVT", 0.0, 12.0, "Guna Junction – Taravata"),
        ("SEC-CORR-05-TRVT-MYN", 12.0, 26.0, "Taravata – Miyana"),
        ("SEC-CORR-05-MYN-BDWS", 26.0, 48.0, "Miyana – Badarwas"),
        ("SEC-CORR-05-BDWS-KLRS", 48.0, 74.0, "Badarwas – Kolaras"),
        ("SEC-CORR-05-KLRS-SVPI", 74.0, 102.0, "Kolaras – Shivpuri"),
        ("SEC-CORR-05-SVPI-KNK", 102.0, 125.0, "Shivpuri – Khonker"),
        ("SEC-CORR-05-KNK-MOJ", 125.0, 152.0, "Khonker – Mohana"),
        ("SEC-CORR-05-MOJ-GHT", 152.0, 185.0, "Mohana – Ghatigaon"),
        ("SEC-CORR-05-GHT-PNHR", 185.0, 208.0, "Ghatigaon – Panihar"),
        ("SEC-CORR-05-PNHR-GWL", 208.0, 227.0, "Panihar – Gwalior Junction"),
    ],
}


# ----- S-R-C-A-O Factor Ranges by Block Type -----
SRCAO_RANGES = {
    "EMERGENT": {"sev": (85, 95), "risk": (80, 94), "crit": (82, 95), "age": (70, 92), "opp": (70, 90)},
    "RULING":   {"sev": (70, 90),  "risk": (65, 85), "crit": (72, 92), "age": (60, 82), "opp": (55, 78)},
    "PLANNED":  {"sev": (35, 75),  "risk": (30, 70), "crit": (40, 78), "age": (30, 65), "opp": (45, 80)},
    "SHADOW":   {"sev": (55, 82),  "risk": (50, 80), "crit": (58, 85), "age": (45, 75), "opp": (55, 85)},
}

# Defect-type bias adjustments (added to base random value, then clamped)
DEFECT_BIAS = {
    "RAIL_FRACTURE_REPAIR":       {"sev": (2, 5), "risk": (2, 5)},
    "OHE_WIRE_PARTING_EMG":       {"crit": (2, 5), "risk": (2, 5)},
    "POINT_MACHINE_MAINT":        {"crit": (2, 4)},
    "SIGNAL_FAILURE_EMG":         {"crit": (2, 5), "risk": (2, 4)},
    "SIGNAL_INTERLOCKING_TEST":   {"crit": (1, 4)},
    "TAMPING_PLAIN_TRACK":        {"sev": (-8, -3)},
    "DEEP_SCREENING":             {"risk": (-6, -2)},
    "TURNOUT_OVERHAUL":           {"crit": (2, 5)},
    "OHE_ADJUSTMENT":             {"crit": (2, 5), "risk": (1, 4)},
    "OHE_INSPECTION_ROUTINE":     {"sev": (-4, -1)},
}


def generate_srcao_factors(rng: random.Random, block_type: str, work_type_id: str) -> dict:
    """Generate randomized but realistic S-R-C-A-O numeric scores for a task.
    Uses bounded ranges per block_type with defect-type bias adjustments."""
    ranges = SRCAO_RANGES.get(block_type, SRCAO_RANGES["PLANNED"])
    bias = DEFECT_BIAS.get(work_type_id, {})

    def gen(key):
        lo, hi = ranges[key]
        base = rng.uniform(lo, hi)
        if key in bias:
            blo, bhi = bias[key]
            base += rng.uniform(blo, bhi)
        return round(max(0.0, min(100.0, base)), 1)

    return {
        "sev_score": gen("sev"),
        "risk_score": gen("risk"),
        "crit_score": gen("crit"),
        "age_score": gen("age"),
        "opp_score": gen("opp"),
    }


def generate_candidate_dataset(db=None, rng=None, demo_seed=None):
    """
    Step 1 of Pipeline: GENERATE candidate dataset in-memory.
    Does NOT modify the database.
    Returns: (faults, tasks, blocks, demo_seed)
    """
    if demo_seed is None:
        demo_seed = int(time.time() * 100_000) % 1_000_000
    if rng is None:
        rng = random.Random(demo_seed)
    print(f"[DATASET GENERATE] Demo Seed: {demo_seed}")

    faults = []
    tasks = []
    blocks = []

    now = get_canonical_now()
    today = now.date()
    today_str = today.strftime("%Y-%m-%d")

    # Calendar window calculations for current week (Monday-Sunday) and current month
    weekday = today.weekday()  # 0 = Monday, 6 = Sunday
    mon = today - timedelta(days=weekday)
    sun = mon + timedelta(days=6)
    month_prefix = today.strftime("%Y-%m")

    # Calculate days in current month
    year, month = today.year, today.month
    if month in (1, 3, 5, 7, 8, 10, 12):
        num_days = 31
    elif month in (4, 6, 9, 11):
        num_days = 30
    else:
        num_days = 29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28

    all_month_days = [date(year, month, d) for d in range(1, num_days + 1)]

    # Future days within current week (if today is Sunday, pick days within current week)
    future_week_days = [today + timedelta(days=i) for i in range(1, (sun - today).days + 1)]
    if not future_week_days:
        future_week_days = [mon + timedelta(days=i) for i in range(7)]

    # Days in current month outside the current week (for monthly planning horizon)
    month_days_outside_week = [d for d in all_month_days if d < mon or d > sun]
    if not month_days_outside_week:
        month_days_outside_week = all_month_days

    # Prefer future days in current month if available
    future_month_days = [d for d in month_days_outside_week if d > sun]
    if not future_month_days:
        future_month_days = month_days_outside_week

    try:
        # -------------------------------------------------------------
        # 1. RULING BLOCKS (Exactly 3 blocks across 3 distinct corridors)
        # -------------------------------------------------------------
        # Long-term pre-sanctioned blocks under Annual Maintenance Programme 2026.
        # Distributed across major trunk routes (CORR-01, CORR-02, CORR-03).
        ruling_specs = [
            {
                "id": "BLOCK-RUL-001",
                "title": "Bhopal Junction Yard Platform 1 & 2 Turnout Renewal (CTR-P)",
                "desc": "Long-term planned Complete Track Renewal (CTR-P) of 1:12 curved turnout #24B on Down Main at Bhopal Jn yard. Decided under Annual Track Renewal Programme 2026. S&T point lock adjustment and track slew required.",
                "corridor_id": "CORR-01",
                "section_id": "SEC-CORR-01-RKMP-BPL",
                "station_code": "BPL",
                "track_name": "DOWN_MAIN",
                "km": 89.2,
                "work_type": "TURNOUT_OVERHAUL",
                "dept": "PWAY",
                "machine": "UNIMAT_01",
                "planning_date": "2026-05-15",
                "execution_date": rng.choice(future_month_days).strftime("%Y-%m-%d"),
                "start_time": "00:30",
                "end_time": "04:30",
                "duration": 240,
                "power_iso": False,
                "protection": "TRAFFIC_BLOCK"
            },
            {
                "id": "BLOCK-RUL-002",
                "title": "Bina Jn South Approach Deep Ballast Screening & Track Lifting",
                "desc": "Annual mechanised deep ballast screening (BCM) between KM 138.0 and 141.0 on Kurwai Kethora-Bina section. Programmed in WCR 2026 Annual Track Machine Deployment Chart.",
                "corridor_id": "CORR-02",
                "section_id": "SEC-CORR-02-KIKA-BINA",
                "station_code": "BINA",
                "track_name": "DOWN_MAIN",
                "km": 139.5,
                "work_type": "DEEP_SCREENING",
                "dept": "PWAY",
                "machine": "BCM_01",
                "planning_date": "2026-06-10",
                "execution_date": (today + timedelta(days=28)).strftime("%Y-%m-%d"),
                "start_time": "11:00",
                "end_time": "15:00",
                "duration": 240,
                "power_iso": False,
                "protection": "TRAFFIC_BLOCK"
            },
            {
                "id": "BLOCK-RUL-003",
                "title": "Itarsi Junction North Approach Diamond Crossover Rehabilitation",
                "desc": "Annual programmed rehabilitation of heavy-wear diamond crossing #41A on Up Main at Itarsi North Cabin approach. Programmed for Q3 2026 annual possession quota.",
                "corridor_id": "CORR-03",
                "section_id": "SEC-CORR-03-DQL-ET",
                "station_code": "ET",
                "track_name": "UP_MAIN",
                "km": 181.5,
                "work_type": "TURNOUT_OVERHAUL",
                "dept": "PWAY",
                "machine": "CSM_TAMPER_01",
                "planning_date": "2026-07-01",
                "execution_date": (today + timedelta(days=42)).strftime("%Y-%m-%d"),
                "start_time": "01:00",
                "end_time": "05:00",
                "duration": 240,
                "power_iso": False,
                "protection": "TRAFFIC_BLOCK"
            }
        ]

        print(f"Creating {len(ruling_specs)} RULING blocks...")
        for idx, spec in enumerate(ruling_specs, 1):
            fid = f"FAULT-RUL-{idx:03d}"
            tid = f"TASK-RUL-{idx:03d}"
            bid = spec["id"]

            fault = FaultObservation(
                id=fid,
                reporter="Divisional Track Maintenance Engineer (Sr.DEN / Central)",
                reporter_role="TRACK_MAN",
                timestamp=datetime.strptime(spec["planning_date"], "%Y-%m-%d"),
                corridor_id=spec["corridor_id"],
                section_id=spec["section_id"],
                track_name=spec["track_name"],
                location_km=spec["km"],
                location_description=f"{spec['title']} at KM {spec['km']:.2f}",
                fault_title=spec["title"],
                description=spec["desc"],
                department_id=spec["dept"],
                severity="HIGH",
                status="CONFIRMED",
                human_status="CONFIRMED",
                human_decision_by="Divisional Railway Manager (DRM / Bhopal)",
                source_type="ANNUAL_PROGRAMME"
            )
            faults.append(fault)

            srcao = generate_srcao_factors(rng, "RULING", spec["work_type"])
            task = MaintenanceTask(
                id=tid,
                fault_id=fid,
                block_id=bid,
                department_id=spec["dept"],
                work_type_id=spec["work_type"],
                corridor_id=spec["corridor_id"],
                section_id=spec["section_id"],
                track_name=spec["track_name"],
                location_km=spec["km"],
                severity="HIGH",
                priority="HIGH",
                duration_mins=spec["duration"],
                assigned_crew=f"{spec['dept']} Heavy Maintenance Gang #{idx}",
                equipment_id=spec["machine"],
                operational_impact="FULL_BLOCK",
                required_protection=spec["protection"],
                maintenance_mode="FULL_BLOCK",
                requires_power_isolation=spec["power_iso"],
                requires_track_occupation=True,
                compatible_with_train_movement=False,
                status="PENDING",
                source_type="ANNUAL_PROGRAMME",
                sev_score=srcao["sev_score"],
                risk_score=srcao["risk_score"],
                crit_score=srcao["crit_score"],
                age_score=srcao["age_score"],
                opp_score=srcao["opp_score"],
            )
            tasks.append(task)

            block = Block(
                id=bid,
                task_id=tid,
                block_type="RULING",
                planning_origin="ANNUAL_MAINTENANCE_PROGRAMME_2026",
                planning_date=spec["planning_date"],
                execution_date=spec["execution_date"],
                corridor_id=spec["corridor_id"],
                section_id=spec["section_id"],
                track_name=spec["track_name"],
                location_km=spec["km"],
                requested_start_time=spec["start_time"],
                requested_end_time=spec["end_time"],
                duration_mins=spec["duration"],
                status="PLANNED",
                conflict_status="NO CONFLICT",
                conflict_summary=f"Ruling Programmed Block: Pre-sanctioned under Annual Maintenance Programme 2026. Scheduled execution on {spec['execution_date']}.",
                protection_type=spec["protection"],
                power_isolation_required=spec["power_iso"],
                assigned_machine=spec["machine"],
                proposed_by="Chief Engineer (Track) / West Central Railway",
                approval_status="DRAFT",
                approval_notes=json.dumps({
                    "block_type": "RULING",
                    "planning_origin": "ANNUAL_MAINTENANCE_PROGRAMME_2026",
                    "planning_date": spec["planning_date"],
                    "execution_date": spec["execution_date"],
                    "departments": [spec["dept"]],
                    "bundled_tasks": [tid]
                }),
                created_at=datetime.strptime(spec["planning_date"], "%Y-%m-%d")
            )
            blocks.append(block)

        # -------------------------------------------------------------
        # 2. EMERGENT BLOCKS (Exactly 5 blocks — Exactly 1 per corridor)
        # -------------------------------------------------------------
        # All 5 corridors receive an immediate, urgent intervention scheduled for TODAY.
        # This guarantees non-zero Daily representation across all 5 corridors immediately.
        emergent_specs = [
            {
                "id": "BLOCK-EMG-001",
                "title": "IMR Transverse Rail Fracture with 4mm Gap in Ghat Section",
                "desc": "URGENT SAFETY ALERT: Visual patrol and USFD tester detected severe transverse fatigue crack with 4mm gap on rail head in Budhni-Midghat ghat section. Immediate derailment risk. Emergency fishplating and rail renewal required today.",
                "corridor_id": "CORR-01",
                "section_id": "SEC-CORR-01-BNI-MDG",
                "track_name": "DOWN_MAIN",
                "km": 28.4,
                "work_type": "RAIL_FRACTURE_REPAIR",
                "dept": "PWAY",
                "machine": "USFD_01",
                "start_time": "14:00",
                "end_time": "15:30",
                "duration": 90,
                "power_iso": False,
                "protection": "EMERGENCY_PROTECTION"
            },
            {
                "id": "BLOCK-EMG-002",
                "title": "25kV Catenary Wire Parting & Dropper Entanglement",
                "desc": "CRITICAL OHE INCIDENT: Loco Pilot reported catenary flash and drooping wire at KM 48.6 near Vidisha. OHE wire parting and broken dropper over Down Main. Immediate 25kV power shutoff and tower wagon restoration required.",
                "corridor_id": "CORR-02",
                "section_id": "SEC-CORR-02-SCI-BHS",
                "track_name": "DOWN_MAIN",
                "km": 48.6,
                "work_type": "OHE_WIRE_PARTING_EMG",
                "dept": "TRD",
                "machine": "TW_BPL_01",
                "start_time": "13:30",
                "end_time": "15:30",
                "duration": 120,
                "power_iso": True,
                "protection": "TRAFFIC_AND_POWER_ISOLATION"
            },
            {
                "id": "BLOCK-EMG-003",
                "title": "Dual Point Machine Lock Failure at Harda Yard North Throat",
                "desc": "CRITICAL SIGNALLING FAILURE: Point machine 102A failed to lock at Harda station approach. Interlocking detection lost. Trains held at outer signals. Emergency S&T team dispatched for lock bar replacement.",
                "corridor_id": "CORR-03",
                "section_id": "SEC-CORR-03-PGL-HD",
                "track_name": "UP_MAIN",
                "km": 120.5,
                "work_type": "POINT_MACHINE_MAINT",
                "dept": "SNT",
                "machine": None,
                "start_time": "15:00",
                "end_time": "16:30",
                "duration": 90,
                "power_iso": False,
                "protection": "EMERGENCY_PROTECTION"
            },
            {
                "id": "BLOCK-EMG-004",
                "title": "Severe Track Buckling Distortion on CWR Track near Ashoknagar",
                "desc": "EMERGENCY SPEED STOP: Track patrol detected 35mm lateral track alignment distortion (thermal track buckling) on continuous welded rail near Ashoknagar. Derailment hazard. Emergency de-stressing and realignment required.",
                "corridor_id": "CORR-04",
                "section_id": "SEC-CORR-04-HPK-ASKN",
                "track_name": "DOWN_MAIN",
                "km": 72.8,
                "work_type": "RAIL_FRACTURE_REPAIR",
                "dept": "PWAY",
                "machine": None,
                "start_time": "14:30",
                "end_time": "16:00",
                "duration": 90,
                "power_iso": False,
                "protection": "EMERGENCY_PROTECTION"
            },
            {
                "id": "BLOCK-EMG-005",
                "title": "Burned Glued Insulated Joint & Track Circuit Red Flash near Shivpuri",
                "desc": "CRITICAL SIGNAL FAILURE: Glued insulated rail joint burnt out at Shivpuri approach, locking home signals at danger on single-line section. Emergency rail joint renewal and circuit re-bonding needed immediately.",
                "corridor_id": "CORR-05",
                "section_id": "SEC-CORR-05-KLRS-SVPI",
                "track_name": "UP_MAIN",
                "km": 88.2,
                "work_type": "SIGNAL_FAILURE_EMG",
                "dept": "SNT",
                "machine": None,
                "start_time": "16:00",
                "end_time": "17:30",
                "duration": 90,
                "power_iso": False,
                "protection": "EMERGENCY_PROTECTION"
            }
        ]

        print(f"Creating {len(emergent_specs)} EMERGENT blocks (1 per corridor)...")
        for idx, spec in enumerate(emergent_specs, 1):
            fid = f"FAULT-EMG-{idx:03d}"
            tid = f"TASK-EMG-{idx:03d}"
            bid = spec["id"]

            time_val = validate_or_recalculate_future_window(
                start_time_str=spec["start_time"],
                end_time_str=spec["end_time"],
                execution_date_str=today_str,
                duration_mins=spec["duration"],
                canonical_now=now,
            )
            emg_start = time_val["start_time"]
            emg_end = time_val["end_time"]
            emg_date = time_val["execution_date"]

            fault = FaultObservation(
                id=fid,
                reporter="Senior Divisional Safety Officer / Loco Pilot Alert",
                reporter_role="LOCO_PILOT",
                timestamp=now - timedelta(hours=idx),
                corridor_id=spec["corridor_id"],
                section_id=spec["section_id"],
                track_name=spec["track_name"],
                location_km=spec["km"],
                location_description=f"{spec['title']} at KM {spec['km']:.2f}",
                fault_title=spec["title"],
                description=spec["desc"],
                department_id=spec["dept"],
                severity="CRITICAL",
                status="CONFIRMED",
                human_status="CONFIRMED",
                human_decision_by="Chief Controller / DOM (Operating)",
                source_type="EMERGENCY_INCIDENT"
            )
            faults.append(fault)

            srcao = generate_srcao_factors(rng, "EMERGENT", spec["work_type"])
            task = MaintenanceTask(
                id=tid,
                fault_id=fid,
                block_id=bid,
                department_id=spec["dept"],
                work_type_id=spec["work_type"],
                corridor_id=spec["corridor_id"],
                section_id=spec["section_id"],
                track_name=spec["track_name"],
                location_km=spec["km"],
                severity="CRITICAL",
                priority="CRITICAL",
                duration_mins=spec["duration"],
                assigned_crew=f"{spec['dept']} Quick Response Safety Squad #{idx}",
                equipment_id=spec["machine"],
                operational_impact="FULL_BLOCK",
                required_protection=spec["protection"],
                maintenance_mode="EMERGENCY",
                requires_power_isolation=spec["power_iso"],
                requires_track_occupation=True,
                compatible_with_train_movement=False,
                status="PENDING",
                source_type="EMERGENCY_INCIDENT",
                sev_score=srcao["sev_score"],
                risk_score=srcao["risk_score"],
                crit_score=srcao["crit_score"],
                age_score=srcao["age_score"],
                opp_score=srcao["opp_score"],
            )
            tasks.append(task)

            block = Block(
                id=bid,
                task_id=tid,
                block_type="EMERGENT",
                planning_origin="CRITICAL_DEFECT_EMERGENCY_INTERVENTION",
                planning_date=today_str,
                execution_date=emg_date,
                corridor_id=spec["corridor_id"],
                section_id=spec["section_id"],
                track_name=spec["track_name"],
                location_km=spec["km"],
                requested_start_time=emg_start,
                requested_end_time=emg_end,
                duration_mins=spec["duration"],
                status="PLANNED",
                conflict_status="NO CONFLICT",
                conflict_summary=f"EMERGENCY BLOCK INTERVENTION: Critical defect requires immediate possession window ({emg_date} {emg_start}-{emg_end}) to avert operational hazard.",
                protection_type=spec["protection"],
                power_isolation_required=spec["power_iso"],
                assigned_machine=spec["machine"],
                proposed_by="Chief Train Controller (Emergency Desk) - Bhopal",
                approval_status="DRAFT",
                approval_notes=json.dumps({
                    "block_type": "EMERGENT",
                    "planning_origin": "CRITICAL_DEFECT_EMERGENCY_INTERVENTION",
                    "planning_date": today_str,
                    "execution_date": emg_date,
                    "departments": [spec["dept"]],
                    "bundled_tasks": [tid]
                }),
                created_at=now
            )
            blocks.append(block)

        # -------------------------------------------------------------
        # 3. SHADOW BLOCKS (Exactly 9 coordinated multi-dept blocks)
        # -------------------------------------------------------------
        # 5 Triple-dept (PWAY + TRD + SNT) [15 tasks] + 4 Dual-dept [8 tasks] = 23 tasks
        # Diversified across corridors: CORR-01 (3), CORR-02 (3), CORR-03 (1), CORR-04 (1), CORR-05 (1)
        shadow_specs = [
            # 5 Triple-dept blocks:
            {
                "id": "BLOCK-SHD-001",
                "title": "Rani Kamalapati (RKMP) Yard Coordinated Corridor Possession",
                "desc": "Synchronized multi-department maintenance window at Rani Kamalapati yard. P.Way turnout tamping, TRD catenary tensioning, S&T point machine calibration.",
                "corridor_id": "CORR-01",
                "section_id": "SEC-CORR-01-MSD-RKMP",
                "track_name": "DOWN_MAIN",
                "km": 84.5,
                "execution_date": rng.choice(future_week_days).strftime("%Y-%m-%d"),
                "start_time": "11:00",
                "end_time": "13:30",
                "duration": 150,
                "power_iso": True,
                "tasks": [
                    {"dept": "PWAY", "work": "TURNOUT_OVERHAUL", "title": "P.Way Mechanized Turnout Tamping & Switch Adjustment", "eq": "UNIMAT_01", "prio": "HIGH"},
                    {"dept": "TRD", "work": "OHE_ADJUSTMENT", "title": "TRD 25kV Catenary Re-tensioning & Insulator Washing", "eq": "TW_BPL_01", "prio": "HIGH"},
                    {"dept": "SNT", "work": "POINT_MACHINE_MAINT", "title": "S&T Point Machine Calibration & Track Circuit Tuning", "eq": None, "prio": "HIGH"}
                ]
            },
            {
                "id": "BLOCK-SHD-002",
                "title": "Mandideep Industrial Siding Lead Coordinated Block",
                "desc": "Integrated tri-department block covering Mandideep container siding lead. P.Way diamond crossing packing, TRD neutral section overhaul, S&T axle counter reset.",
                "corridor_id": "CORR-01",
                "section_id": "SEC-CORR-01-ODG-MDDP",
                "track_name": "DOWN_MAIN",
                "km": 68.0,
                "execution_date": today_str,
                "start_time": "12:00",
                "end_time": "14:30",
                "duration": 150,
                "power_iso": True,
                "tasks": [
                    {"dept": "PWAY", "work": "RAIL_FRACTURE_REPAIR", "title": "P.Way Diamond Crossing Packing & Gauge Rectification", "eq": None, "prio": "HIGH"},
                    {"dept": "TRD", "work": "OHE_INSPECTION_ROUTINE", "title": "TRD Section Insulator Overhaul & Contact Wire Height Verification", "eq": "TW_BPL_01", "prio": "MEDIUM"},
                    {"dept": "SNT", "work": "SIGNAL_INTERLOCKING_TEST", "title": "S&T Axle Counter Reset & Shunt Signal Cabling Replacement", "eq": None, "prio": "MEDIUM"}
                ]
            },
            {
                "id": "BLOCK-SHD-003",
                "title": "Vidisha - Sanchi Double-Line Coordinated Block",
                "desc": "Synchronized possession on heavy-density Vidisha-Sanchi section. P.Way track tamping, TRD cantilever swivel inspection, S&T track circuit re-tuning.",
                "corridor_id": "CORR-02",
                "section_id": "SEC-CORR-02-SCI-BHS",
                "track_name": "DOWN_MAIN",
                "km": 49.5,
                "execution_date": rng.choice(future_week_days).strftime("%Y-%m-%d"),
                "start_time": "10:30",
                "end_time": "13:00",
                "duration": 150,
                "power_iso": True,
                "tasks": [
                    {"dept": "PWAY", "work": "TAMPING_PLAIN_TRACK", "title": "P.Way Mechanized Track Tamping (CSM Tamper)", "eq": "CSM_TAMPER_01", "prio": "HIGH"},
                    {"dept": "TRD", "work": "OHE_ADJUSTMENT", "title": "TRD Catenary Stagger Adjustment & Cantilever Swivel Check", "eq": "TW_BPL_01", "prio": "MEDIUM"},
                    {"dept": "SNT", "work": "SIGNAL_INTERLOCKING_TEST", "title": "S&T Audio Frequency Track Circuit (AFTC) Tuning", "eq": None, "prio": "MEDIUM"}
                ]
            },
            {
                "id": "BLOCK-SHD-004",
                "title": "Ganj Basoda Station Approach Tri-Department Block",
                "desc": "Coordinated possession at Ganj Basoda North throat. P.Way weld trimming, TRD isolator switch replacement, S&T digital axle counter head alignment.",
                "corridor_id": "CORR-02",
                "section_id": "SEC-CORR-02-BAQ-BET",
                "track_name": "UP_MAIN",
                "km": 98.0,
                "execution_date": rng.choice(future_month_days).strftime("%Y-%m-%d"),
                "start_time": "13:00",
                "end_time": "15:30",
                "duration": 150,
                "power_iso": True,
                "tasks": [
                    {"dept": "PWAY", "work": "RAIL_FRACTURE_REPAIR", "title": "P.Way Weld Trimming & Rail Stress Equalization", "eq": None, "prio": "HIGH"},
                    {"dept": "TRD", "work": "OHE_INSPECTION_ROUTINE", "title": "TRD Isolator Switch Contact Replacement & Jumpering", "eq": None, "prio": "MEDIUM"},
                    {"dept": "SNT", "work": "POINT_MACHINE_MAINT", "title": "S&T Digital Axle Counter Head Alignment & Sensor Verification", "eq": None, "prio": "MEDIUM"}
                ]
            },
            {
                "id": "BLOCK-SHD-005",
                "title": "Harda – Pagdhal Heavy Freight Route Coordinated Block",
                "desc": "Tri-department possession on Khandwa-Itarsi trunk line. P.Way curve ballast packing, TRD neutral section maintenance, S&T earth leakage testing.",
                "corridor_id": "CORR-03",
                "section_id": "SEC-CORR-03-PGL-HD",
                "track_name": "DOWN_MAIN",
                "km": 121.0,
                "execution_date": rng.choice(future_week_days).strftime("%Y-%m-%d"),
                "start_time": "11:30",
                "end_time": "14:00",
                "duration": 150,
                "power_iso": True,
                "tasks": [
                    {"dept": "PWAY", "work": "RAIL_FRACTURE_REPAIR", "title": "P.Way Bridge Guard Rail Fastening & Sleeper Renewal", "eq": None, "prio": "HIGH"},
                    {"dept": "TRD", "work": "OHE_ADJUSTMENT", "title": "TRD Neutral Section Assembly Overhaul & Clearance Verification", "eq": "TW_BPL_01", "prio": "HIGH"},
                    {"dept": "SNT", "work": "SIGNAL_INTERLOCKING_TEST", "title": "S&T Earth Leakage Detector Testing & Signal Cable Protection", "eq": None, "prio": "MEDIUM"}
                ]
            },
            # 4 Dual-dept blocks:
            {
                "id": "BLOCK-SHD-006",
                "title": "Barkhera – Obaidullaganj Reverse Curve Track & OHE Coordinated Window",
                "desc": "Dual-department coordinated block (P.Way + TRD). Track realignment on sharp curve and overhead wire stagger realign.",
                "corridor_id": "CORR-01",
                "section_id": "SEC-CORR-01-BKA-ODG",
                "track_name": "DOWN_MAIN",
                "km": 55.5,
                "execution_date": rng.choice(future_month_days).strftime("%Y-%m-%d"),
                "start_time": "09:00",
                "end_time": "11:00",
                "duration": 120,
                "power_iso": True,
                "tasks": [
                    {"dept": "PWAY", "work": "TAMPING_PLAIN_TRACK", "title": "P.Way Reverse Curve Realignment & Super-Elevation Tamping", "eq": "CSM_TAMPER_01", "prio": "MEDIUM"},
                    {"dept": "TRD", "work": "OHE_ADJUSTMENT", "title": "TRD Radial Arm Mast Alignment & Contact Wire Stagger Check", "eq": "TW_BPL_01", "prio": "MEDIUM"}
                ]
            },
            {
                "id": "BLOCK-SHD-007",
                "title": "Mandi Bamora Turnout & Interlocking Joint Block",
                "desc": "Dual-department coordinated block (P.Way + S&T). Turnout renewal combined with point machine replacement.",
                "corridor_id": "CORR-02",
                "section_id": "SEC-CORR-02-KAH-MABA",
                "track_name": "UP_MAIN",
                "km": 118.0,
                "execution_date": today_str,
                "start_time": "14:00",
                "end_time": "16:00",
                "duration": 120,
                "power_iso": False,
                "tasks": [
                    {"dept": "PWAY", "work": "TURNOUT_OVERHAUL", "title": "P.Way Turnout Switch Rail Renewal & Tongue Packing", "eq": None, "prio": "HIGH"},
                    {"dept": "SNT", "work": "POINT_MACHINE_MAINT", "title": "S&T Point Machine Overhaul & Friction Clutch Setting", "eq": None, "prio": "HIGH"}
                ]
            },
            {
                "id": "BLOCK-SHD-008",
                "title": "Ashoknagar Yard Interlocking & Catenary Window",
                "desc": "Dual-department coordinated block (TRD + S&T) on Bina-Guna line. Shared 25kV power cut for signal gantry maintenance and OHE insulator washing.",
                "corridor_id": "CORR-04",
                "section_id": "SEC-CORR-04-HPK-ASKN",
                "track_name": "DOWN_MAIN",
                "km": 74.0,
                "execution_date": rng.choice(future_week_days).strftime("%Y-%m-%d"),
                "start_time": "10:00",
                "end_time": "12:00",
                "duration": 120,
                "power_iso": True,
                "tasks": [
                    {"dept": "TRD", "work": "OHE_INSPECTION_ROUTINE", "title": "TRD Portal Structure Foundation Inspection & Insulator Washing", "eq": "TW_BPL_01", "prio": "MEDIUM"},
                    {"dept": "SNT", "work": "SIGNAL_INTERLOCKING_TEST", "title": "S&T Signal Gantry LED Aspect Renewal & Cable Continuity Test", "eq": None, "prio": "MEDIUM"}
                ]
            },
            {
                "id": "BLOCK-SHD-009",
                "title": "Shivpuri Approach Track & Overhead Inspection",
                "desc": "Dual-department coordinated block (P.Way + TRD) on Guna-Gwalior line. Ballast compaction and OHE dropper renewal.",
                "corridor_id": "CORR-05",
                "section_id": "SEC-CORR-05-KLRS-SVPI",
                "track_name": "DOWN_MAIN",
                "km": 91.0,
                "execution_date": rng.choice(future_month_days).strftime("%Y-%m-%d"),
                "start_time": "13:30",
                "end_time": "15:30",
                "duration": 120,
                "power_iso": True,
                "tasks": [
                    {"dept": "PWAY", "work": "TAMPING_PLAIN_TRACK", "title": "P.Way Track De-Hogging & Ballast Compaction on Branch Route", "eq": "CSM_TAMPER_01", "prio": "MEDIUM"},
                    {"dept": "TRD", "work": "OHE_ADJUSTMENT", "title": "TRD Dropper Renewal & Sectioning Insulator Maintenance", "eq": "TW_BPL_01", "prio": "MEDIUM"}
                ]
            }
        ]

        print(f"Creating {len(shadow_specs)} SHADOW blocks with 23 coordinated tasks across 5 corridors...")
        for s_idx, spec in enumerate(shadow_specs, 1):
            bid = spec["id"]
            shadow_task_ids = []
            lead_task_id = None

            for t_idx, t_spec in enumerate(spec["tasks"], 1):
                tid = f"TASK-SHD-{s_idx:02d}-{t_idx}"
                fid = f"FAULT-SHD-{s_idx:02d}-{t_idx}"
                shadow_task_ids.append(tid)
                if lead_task_id is None:
                    lead_task_id = tid

                fault = FaultObservation(
                    id=fid,
                    reporter=f"Joint Coordination Desk ({t_spec['dept']} Inspector)",
                    reporter_role="OHE_INSPECTOR" if t_spec['dept'] == 'TRD' else ("SNT_ENGINEER" if t_spec['dept'] == 'SNT' else "TRACK_MAN"),
                    timestamp=datetime.strptime(f"{today_str} 08:30:00", "%Y-%m-%d %H:%M:%S"),
                    corridor_id=spec["corridor_id"],
                    section_id=spec["section_id"],
                    track_name=spec["track_name"],
                    location_km=spec["km"] + (t_idx * 0.05),
                    location_description=f"{t_spec['title']} at KM {spec['km']:.2f}",
                    fault_title=t_spec["title"],
                    description=f"Multi-department scheduled work under {spec['title']}. Department: {t_spec['dept']}.",
                    department_id=t_spec["dept"],
                    severity=t_spec["prio"],
                    status="CONFIRMED",
                    human_status="CONFIRMED",
                    human_decision_by="Joint Coordination Committee (Operating/P.Way/TRD/S&T)",
                    source_type="COORDINATED_SHADOW"
                )
                faults.append(fault)

                srcao = generate_srcao_factors(rng, "SHADOW", t_spec["work"])
                task = MaintenanceTask(
                    id=tid,
                    fault_id=fid,
                    block_id=bid,
                    department_id=t_spec["dept"],
                    work_type_id=t_spec["work"],
                    corridor_id=spec["corridor_id"],
                    section_id=spec["section_id"],
                    track_name=spec["track_name"],
                    location_km=round(spec["km"] + (t_idx * 0.05) + rng.uniform(-0.02, 0.02), 3),
                    severity=t_spec["prio"],
                    priority=t_spec["prio"],
                    duration_mins=spec["duration"],
                    assigned_crew=f"{t_spec['dept']} Coordinated Team #{s_idx}",
                    equipment_id=t_spec["eq"],
                    operational_impact="FULL_BLOCK",
                    required_protection="TRAFFIC_AND_POWER_ISOLATION" if spec["power_iso"] else "TRAFFIC_BLOCK",
                    maintenance_mode="FULL_BLOCK",
                    requires_power_isolation=spec["power_iso"] and (t_spec["dept"] == "TRD"),
                    requires_track_occupation=True,
                    compatible_with_train_movement=False,
                    status="PENDING",
                    source_type="COORDINATED_SHADOW",
                    sev_score=srcao["sev_score"],
                    risk_score=srcao["risk_score"],
                    crit_score=srcao["crit_score"],
                    age_score=srcao["age_score"],
                    opp_score=srcao["opp_score"],
                )
                tasks.append(task)

            # Create the Shadow Block Plan
            dept_names = {"PWAY": "P.Way", "TRD": "TRD/OHE", "SNT": "S&T"}
            dept_str = " + ".join([dept_names.get(d, d) for d in set(t_spec["dept"] for t_spec in spec["tasks"])])

            block = Block(
                id=bid,
                task_id=lead_task_id,
                block_type="SHADOW",
                planning_origin="JOINT_DEPARTMENTAL_COORDINATION_CELL",
                planning_date=today_str,
                execution_date=spec["execution_date"],
                corridor_id=spec["corridor_id"],
                section_id=spec["section_id"],
                track_name=spec["track_name"],
                location_km=spec["km"],
                requested_start_time=spec["start_time"],
                requested_end_time=spec["end_time"],
                duration_mins=spec["duration"],
                status="PLANNED",
                conflict_status="NO CONFLICT",
                conflict_summary=f"SHADOW BLOCK PLAN: Coordinated multi-department possession ({dept_str}) on {spec['execution_date']} ({spec['start_time']}-{spec['end_time']}) bundling {len(shadow_task_ids)} compatible tasks.",
                protection_type="TRAFFIC_AND_POWER_ISOLATION" if spec["power_iso"] else "TRAFFIC_BLOCK",
                power_isolation_required=spec["power_iso"],
                assigned_machine=spec["tasks"][0]["eq"] or "Joint Machinery Consist",
                proposed_by="Joint Departmental Coordination Cell (JDCC) - Bhopal",
                approval_status="DRAFT",
                approval_notes=json.dumps({
                    "block_type": "SHADOW",
                    "planning_origin": "JOINT_DEPARTMENTAL_COORDINATION_CELL",
                    "planning_date": today_str,
                    "execution_date": spec["execution_date"],
                    "departments": list(dict.fromkeys(t["dept"] for t in spec["tasks"])),
                    "bundled_tasks": shadow_task_ids
                }),
                created_at=now
            )
            blocks.append(block)

        # -------------------------------------------------------------
        # 4. PLANNED BLOCKS (Exactly 33 blocks across 5 corridors)
        # -------------------------------------------------------------
        # 3 (ruling) + 5 (emergent) + 9 (shadow) + 33 (planned) = 50 total blocks!
        # Diversified across corridors and cadences (Daily / Weekly / Monthly).
        planned_templates = [
            ("PWAY", "TAMPING_PLAIN_TRACK", "Mechanised Track Tamping and Ballast Consolidation", "CSM_TAMPER_01", 120, False, "TRAFFIC_BLOCK"),
            ("PWAY", "RAIL_FRACTURE_REPAIR", "Preventive Ultrasonic Testing & Rail Flaw Clamping", "USFD_01", 90, False, "TRAFFIC_BLOCK"),
            ("PWAY", "DEEP_SCREENING", "Cushion Ballast Screening & Track Bed Cleaning", "BCM_01", 180, False, "TRAFFIC_BLOCK"),
            ("PWAY", "TURNOUT_OVERHAUL", "Routine Turnout Packing & Switch Tongue Inspection", "UNIMAT_01", 120, False, "TRAFFIC_BLOCK"),
            ("TRD", "OHE_INSPECTION_ROUTINE", "Routine 25kV OHE Contact Wire Wear & Mast Inspection", "TW_BPL_01", 120, True, "TRAFFIC_AND_POWER_ISOLATION"),
            ("TRD", "OHE_ADJUSTMENT", "Catenary Wire Tensioning & Dropper Height Adjustment", "TW_BPL_01", 120, True, "TRAFFIC_AND_POWER_ISOLATION"),
            ("TRD", "OHE_INSPECTION_ROUTINE", "Substation Feed Wire & Isolator Contact Greasing", None, 90, True, "POWER_ISOLATION"),
            ("SNT", "POINT_MACHINE_MAINT", "Quarterly Point Machine Overhaul & Lubrication", None, 90, False, "TRAFFIC_BLOCK"),
            ("SNT", "SIGNAL_INTERLOCKING_TEST", "Relay Interlocking Logic & Block Instrument Testing", None, 90, False, "TRAFFIC_BLOCK"),
            ("SNT", "POINT_MACHINE_MAINT", "Electronic Interlocking Cards & Power Supply Check", None, 60, False, "TRAFFIC_CAUTION"),
        ]

        # Allocate 33 planned blocks across the 5 active corridors
        # Base realistic counts: CORR-01: 8, CORR-02: 8, CORR-03: 7, CORR-04: 5, CORR-05: 5 (Sum = 33)
        # Bounded perturbation allows random variation across seeds while preserving invariants
        all_corridor_ids = ["CORR-01", "CORR-02", "CORR-03", "CORR-04", "CORR-05"]
        planned_counts = {"CORR-01": 8, "CORR-02": 8, "CORR-03": 7, "CORR-04": 5, "CORR-05": 5}
        shifts = rng.randint(0, 3)
        for _ in range(shifts):
            donor = rng.choice([c for c in all_corridor_ids if planned_counts[c] > 4])
            receiver = rng.choice([c for c in all_corridor_ids if c != donor and planned_counts[c] < 10])
            planned_counts[donor] -= 1
            planned_counts[receiver] += 1

        print(f"Creating 33 PLANNED blocks with corridor allocation: {planned_counts}...")
        pln_idx = 1
        for cid in all_corridor_ids:
            num_pln_for_corr = planned_counts[cid]
            sec_pool = CORRIDOR_SECTIONS[cid]

            for i in range(num_pln_for_corr):
                bid = f"BLOCK-PLN-{pln_idx:03d}"
                tid = f"TASK-PLN-{pln_idx:03d}"
                fid = f"FAULT-PLN-{pln_idx:03d}"

                tmpl = planned_templates[(pln_idx - 1) % len(planned_templates)]
                sec_info = sec_pool[i % len(sec_pool)]
                sec_id, start_km, end_km, sec_name = sec_info

                # Assign execution date to guarantee Daily, Weekly, and Monthly coverage per corridor:
                # - Block 0: TODAY (Daily, Weekly, Monthly)
                # - Block 1, 2: Future day within current week (Weekly, Monthly)
                # - Remaining blocks: Days in current month outside current week (Monthly)
                if i == 0:
                    exec_date = today_str
                elif i in (1, 2):
                    exec_date = rng.choice(future_week_days).strftime("%Y-%m-%d")
                else:
                    exec_date = rng.choice(future_month_days).strftime("%Y-%m-%d")

                # Slot time (spaced throughout the operating day)
                slot_hour = 9 + ((pln_idx * 2) % 9)
                start_str = f"{slot_hour:02d}:00"
                duration_val = max(60, tmpl[4] + rng.choice([-15, 0, 15]))
                end_hour = slot_hour + (duration_val // 60)
                end_min = duration_val % 60
                end_str = f"{end_hour:02d}:{end_min:02d}"

                track = "DOWN_MAIN" if pln_idx % 2 == 1 else "UP_MAIN"
                # Keep km strictly within the bounds of this specific section
                km_span = max(0.5, end_km - start_km)
                km_val = round(start_km + rng.uniform(0.1, km_span * 0.9), 2)

                prio = "HIGH" if i == 0 else ("MEDIUM" if i <= 3 else "LOW")

                fault = FaultObservation(
                    id=fid,
                    reporter=f"Section Engineer ({tmpl[0]} / Bhopal Division)",
                    reporter_role="TRACK_MAN" if tmpl[0] == "PWAY" else ("OHE_INSPECTOR" if tmpl[0] == "TRD" else "SNT_ENGINEER"),
                    timestamp=datetime.strptime(f"{today_str} 07:00:00", "%Y-%m-%d %H:%M:%S") - timedelta(hours=(pln_idx % 12)),
                    corridor_id=cid,
                    section_id=sec_id,
                    track_name=track,
                    location_km=km_val,
                    location_description=f"{tmpl[2]} on {sec_name} ({sec_id}) at KM {km_val:.2f}",
                    fault_title=f"{tmpl[2]}",
                    description=f"Planned maintenance requirement: {tmpl[2]} on {cid} ({sec_name}). Department: {tmpl[0]}.",
                    department_id=tmpl[0],
                    severity=prio,
                    status="CONFIRMED",
                    human_status="CONFIRMED",
                    human_decision_by=f"Divisional Section Controller - {cid}",
                    source_type="WEEKLY_PLAN"
                )
                faults.append(fault)

                srcao = generate_srcao_factors(rng, "PLANNED", tmpl[1])
                task = MaintenanceTask(
                    id=tid,
                    fault_id=fid,
                    block_id=bid,
                    department_id=tmpl[0],
                    work_type_id=tmpl[1],
                    corridor_id=cid,
                    section_id=sec_id,
                    track_name=track,
                    location_km=km_val,
                    severity=prio,
                    priority=prio,
                    duration_mins=duration_val,
                    assigned_crew=f"{tmpl[0]} Maintenance Squad #{1 + (pln_idx % 5)}",
                    equipment_id=tmpl[3],
                    operational_impact="FULL_BLOCK",
                    required_protection=tmpl[6],
                    maintenance_mode="FULL_BLOCK",
                    requires_power_isolation=tmpl[5],
                    requires_track_occupation=True,
                    compatible_with_train_movement=False,
                    status="PENDING",
                    source_type="WEEKLY_PLAN",
                    sev_score=srcao["sev_score"],
                    risk_score=srcao["risk_score"],
                    crit_score=srcao["crit_score"],
                    age_score=srcao["age_score"],
                    opp_score=srcao["opp_score"],
                )
                tasks.append(task)

                block = Block(
                    id=bid,
                    task_id=tid,
                    block_type="PLANNED",
                    planning_origin="DIVISIONAL_WEEKLY_MAINTENANCE_PLAN",
                    planning_date=today_str,
                    execution_date=exec_date,
                    corridor_id=cid,
                    section_id=sec_id,
                    track_name=track,
                    location_km=km_val,
                    requested_start_time=start_str,
                    requested_end_time=end_str,
                    duration_mins=duration_val,
                    status="PLANNED",
                    conflict_status="NO CONFLICT",
                    conflict_summary=f"Planned Maintenance Block: Scheduled on {cid} ({sec_name}) for {exec_date} ({start_str}-{end_str}) under Divisional Maintenance Plan.",
                    protection_type=tmpl[6],
                    power_isolation_required=tmpl[5],
                    assigned_machine=tmpl[3] or "Manual Section Gang",
                    proposed_by=f"{tmpl[0]} Senior Section Engineer ({cid})",
                    approval_status="DRAFT",
                    approval_notes=json.dumps({
                        "block_type": "PLANNED",
                        "planning_origin": "DIVISIONAL_WEEKLY_MAINTENANCE_PLAN",
                        "planning_date": today_str,
                        "execution_date": exec_date,
                        "departments": [tmpl[0]],
                        "bundled_tasks": [tid]
                    }),
                    created_at=now
                )
                blocks.append(block)
                pln_idx += 1

    except Exception as exc:
        print(f"[DATASET GENERATE ERROR] Candidate generation failed: {exc}")
        raise

    return faults, tasks, blocks, demo_seed


def validate_candidate_dataset(faults, tasks, blocks, db=None):
    """
    Step 2 of Pipeline: VALIDATE candidate dataset before promotion.
    Enforces strict railway invariant checks:
    - Exactly 50 blocks (3 RULING, 33 PLANNED, 5 EMERGENT, 9 SHADOW)
    - Exactly 64 tasks (3 RUL, 33 PLN, 5 EMG, 23 SHD)
    - Exactly 64 fault observations matching tasks 1-to-1
    - All 5 active corridors represented (CORR-01 .. CORR-05)
    - Ruthiyai–Maksi strictly prohibited
    - Minimum 4 blocks per corridor (no corridor starvation)
    - Cadence diversification: every corridor has daily, weekly, and monthly blocks
    - Section-to-corridor integrity: all section_ids belong to the block's corridor
    - Shadow block relationships (task.block_id correctly linked, approval notes bundled_tasks)
    - Numerical sanity (km >= 0, duration > 0)
    Raises ValueError on validation failure.
    """
    if len(blocks) != 50:
        raise ValueError(f"[VALIDATION FAILED] Expected exactly 50 blocks, got {len(blocks)}")

    ruling_blocks = [b for b in blocks if b.block_type == "RULING"]
    planned_blocks = [b for b in blocks if b.block_type == "PLANNED"]
    emergent_blocks = [b for b in blocks if b.block_type == "EMERGENT"]
    shadow_blocks = [b for b in blocks if b.block_type == "SHADOW"]

    if len(ruling_blocks) != 3:
        raise ValueError(f"[VALIDATION FAILED] Expected 3 ruling blocks, got {len(ruling_blocks)}")
    if len(planned_blocks) != 33:
        raise ValueError(f"[VALIDATION FAILED] Expected 33 planned blocks, got {len(planned_blocks)}")
    if len(emergent_blocks) != 5:
        raise ValueError(f"[VALIDATION FAILED] Expected 5 emergent blocks, got {len(emergent_blocks)}")
    if len(shadow_blocks) != 9:
        raise ValueError(f"[VALIDATION FAILED] Expected 9 shadow blocks, got {len(shadow_blocks)}")

    if len(tasks) != 64:
        raise ValueError(f"[VALIDATION FAILED] Expected exactly 64 tasks, got {len(tasks)}")
    if len(faults) != 64:
        raise ValueError(f"[VALIDATION FAILED] Expected exactly 64 faults, got {len(faults)}")

    fault_ids = {f.id for f in faults}
    if len(fault_ids) != 64:
        raise ValueError(f"[VALIDATION FAILED] Duplicate fault IDs detected ({len(fault_ids)} unique)")

    task_ids = {t.id for t in tasks}
    if len(task_ids) != 64:
        raise ValueError(f"[VALIDATION FAILED] Duplicate task IDs detected ({len(task_ids)} unique)")

    block_ids = {b.id for b in blocks}
    if len(block_ids) != 50:
        raise ValueError(f"[VALIDATION FAILED] Duplicate block IDs detected ({len(block_ids)} unique)")

    # Verify task <-> fault mapping (1:1)
    task_fault_ids = {t.fault_id for t in tasks}
    if task_fault_ids != fault_ids:
        missing = fault_ids - task_fault_ids
        unmatched = task_fault_ids - fault_ids
        raise ValueError(f"[VALIDATION FAILED] Task-Fault mismatch. Missing: {missing}, Unmatched: {unmatched}")

    # Verify task <-> block mapping
    for t in tasks:
        if t.block_id not in block_ids:
            raise ValueError(f"[VALIDATION FAILED] Task {t.id} references non-existent block {t.block_id}")
        if t.location_km < 0:
            raise ValueError(f"[VALIDATION FAILED] Task {t.id} has invalid negative KM: {t.location_km}")
        if t.duration_mins <= 0:
            raise ValueError(f"[VALIDATION FAILED] Task {t.id} has invalid non-positive duration: {t.duration_mins}")
        if t.department_id not in {"PWAY", "TRD", "SNT"}:
            raise ValueError(f"[VALIDATION FAILED] Task {t.id} has invalid department: {t.department_id}")

    # Shadow block verification
    shadow_tasks = [t for t in tasks if t.id.startswith("TASK-SHD-")]
    if len(shadow_tasks) != 23:
        raise ValueError(f"[VALIDATION FAILED] Expected exactly 23 shadow tasks, got {len(shadow_tasks)}")

    for sb in shadow_blocks:
        sb_tasks = [t for t in tasks if t.block_id == sb.id]
        if len(sb_tasks) not in (2, 3):
            raise ValueError(f"[VALIDATION FAILED] Shadow block {sb.id} must have 2 or 3 tasks, got {len(sb_tasks)}")

        notes = json.loads(sb.approval_notes) if sb.approval_notes else {}
        bundled = notes.get("bundled_tasks", [])
        expected_ids = [t.id for t in sb_tasks]
        if set(bundled) != set(expected_ids):
            raise ValueError(f"[VALIDATION FAILED] Shadow block {sb.id} approval_notes bundled_tasks {bundled} mismatch expected {expected_ids}")

    # Corridor Invariants: All 5 active corridors represented
    active_corridors = {"CORR-01", "CORR-02", "CORR-03", "CORR-04", "CORR-05"}
    block_corridors = {b.corridor_id for b in blocks}
    task_corridors = {t.corridor_id for t in tasks}

    if block_corridors != active_corridors:
        raise ValueError(f"[VALIDATION FAILED] Block corridors {block_corridors} do not match active corridors {active_corridors}")
    if task_corridors != active_corridors:
        raise ValueError(f"[VALIDATION FAILED] Task corridors {task_corridors} do not match active corridors {active_corridors}")

    # Prohibit Ruthiyai–Maksi
    for b in blocks:
        check_str = f"{b.corridor_id} {b.section_id} {b.conflict_summary}".lower()
        if "maksi" in check_str or "ruthiyai" in check_str:
            raise ValueError(f"[VALIDATION FAILED] Block {b.id} references excluded Maksi/Ruthiyai line: {check_str}")

    # Check per-corridor representation and section integrity
    now = get_canonical_now()
    today = now.date()
    weekday = today.weekday()
    mon = today - timedelta(days=weekday)
    sun = mon + timedelta(days=6)
    month_prefix = today.strftime("%Y-%m")

    for cid in active_corridors:
        corr_blocks = [b for b in blocks if b.corridor_id == cid]
        if len(corr_blocks) < 4:
            raise ValueError(f"[VALIDATION FAILED] Corridor {cid} under-represented with only {len(corr_blocks)} blocks (minimum: 4)")

        # Section-to-corridor integrity
        for b in corr_blocks:
            if not b.section_id.startswith(f"SEC-{cid}-"):
                raise ValueError(f"[VALIDATION FAILED] Block {b.id} in corridor {cid} has inconsistent section {b.section_id}")

        # Cadence diversification verification
        daily_cnt = sum(1 for b in corr_blocks if b.execution_date and b.execution_date[:10] == today.strftime("%Y-%m-%d"))
        weekly_cnt = sum(
            1 for b in corr_blocks
            if b.execution_date and mon <= datetime.strptime(b.execution_date[:10], "%Y-%m-%d").date() <= sun
        )
        monthly_cnt = sum(1 for b in corr_blocks if b.execution_date and b.execution_date.startswith(month_prefix))

        if daily_cnt < 1:
            raise ValueError(f"[VALIDATION FAILED] Corridor {cid} missing Daily blocks ({daily_cnt} found)")
        if weekly_cnt < 1:
            raise ValueError(f"[VALIDATION FAILED] Corridor {cid} missing Weekly blocks ({weekly_cnt} found)")
        if monthly_cnt < 1:
            raise ValueError(f"[VALIDATION FAILED] Corridor {cid} missing Monthly blocks ({monthly_cnt} found)")

    # Validate numerical bounds
    for b in blocks:
        if b.location_km < 0:
            raise ValueError(f"[VALIDATION FAILED] Block {b.id} has invalid negative KM: {b.location_km}")
        if b.duration_mins <= 0:
            raise ValueError(f"[VALIDATION FAILED] Block {b.id} has invalid non-positive duration: {b.duration_mins}")

    for t in tasks:
        if not t.work_type_id:
            raise ValueError(f"[VALIDATION FAILED] Task {t.id} missing work_type_id")

    print("[DATASET VALIDATION] Passed: exactly 50 blocks (3 RUL, 33 PLN, 5 EMG, 9 SHD), 64 tasks (23 shadow), 64 faults. All 5 active corridors diversified across Daily, Weekly, and Monthly cadences. Zero Maksi leakage. All integrity checks passed.")
    return True


def promote_dataset_to_canonical(db, faults, tasks, blocks):
    """
    Step 3 of Pipeline: PROMOTE candidate dataset into the database atomically.
    Executes in a single database transaction. If any error occurs, rolls back completely.
    """
    try:
        print("[DATASET PROMOTION] Clearing existing blocks, tasks, and faults...")
        db.query(Block).delete()
        db.query(MaintenanceTask).delete()
        db.query(FaultObservation).delete()

        print(f"[DATASET PROMOTION] Persisting {len(faults)} faults, {len(tasks)} tasks, and {len(blocks)} blocks...")
        db.bulk_save_objects(faults)
        db.bulk_save_objects(tasks)
        db.bulk_save_objects(blocks)
        db.commit()
        print("[DATASET PROMOTION] Atomic transaction committed successfully.")
    except Exception as exc:
        db.rollback()
        print(f"[DATASET PROMOTION ERROR] Promotion failed, transaction rolled back safely: {exc}")
        raise


def populate_four_block_dataset(db=None, seed=None):
    """
    Coordinates the 3-step GENERATE -> VALIDATE -> PROMOTE pipeline:
    1. generate_candidate_dataset: builds faults, tasks, blocks in memory.
    2. validate_candidate_dataset: asserts all railway invariants, counts, and FKs.
    3. promote_dataset_to_canonical: atomic transactional wipe-and-load with rollback.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Ensure S-R-C-A-O columns exist (SQLite ALTER TABLE for nullable columns)
        from sqlalchemy import text
        for col in ["sev_score", "risk_score", "crit_score", "age_score", "opp_score"]:
            try:
                db.execute(text(f"ALTER TABLE maintenance_tasks ADD COLUMN {col} REAL"))
                db.commit()
            except Exception:
                db.rollback()

        # Step 1: GENERATE candidate dataset
        faults, tasks, blocks, demo_seed = generate_candidate_dataset(db=db, demo_seed=seed)

        # Step 2: VALIDATE candidate dataset
        validate_candidate_dataset(faults, tasks, blocks, db=db)

        # Step 3: PROMOTE candidate dataset to database
        promote_dataset_to_canonical(db, faults, tasks, blocks)

        # Post-promotion database verification
        total_blocks = db.query(Block).count()
        ruling_cnt = db.query(Block).filter(Block.block_type == "RULING").count()
        planned_cnt = db.query(Block).filter(Block.block_type == "PLANNED").count()
        emergent_cnt = db.query(Block).filter(Block.block_type == "EMERGENT").count()
        shadow_cnt = db.query(Block).filter(Block.block_type == "SHADOW").count()
        total_tasks = db.query(MaintenanceTask).count()

        print("[DATASET VERIFIED]")
        print(f"  Total Blocks:   {total_blocks} (Expected: 50)")
        print(f"    - Ruling:     {ruling_cnt} (Expected: 3)")
        print(f"    - Planned:    {planned_cnt} (Expected: 33)")
        print(f"    - Emergent:   {emergent_cnt} (Expected: 5)")
        print(f"    - Shadow:     {shadow_cnt} (Expected: 9)")
        print(f"  Total Tasks:    {total_tasks} (Expected: 64)")

        assert total_blocks == 50, f"Expected 50 blocks, got {total_blocks}"
        assert ruling_cnt == 3, f"Expected 3 ruling blocks, got {ruling_cnt}"
        assert planned_cnt == 33, f"Expected 33 planned blocks, got {planned_cnt}"
        assert emergent_cnt == 5, f"Expected 5 emergent blocks, got {emergent_cnt}"
        assert shadow_cnt == 9, f"Expected 9 shadow blocks, got {shadow_cnt}"
        assert total_tasks == 64, f"Expected 64 tasks, got {total_tasks}"

        return {
            "status": "SUCCESS",
            "demo_seed": demo_seed,
            "total_blocks": total_blocks,
            "distribution": {
                "RULING": ruling_cnt,
                "PLANNED": planned_cnt,
                "EMERGENT": emergent_cnt,
                "SHADOW": shadow_cnt
            },
            "total_tasks": total_tasks
        }
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    populate_four_block_dataset()
