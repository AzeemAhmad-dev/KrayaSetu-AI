import json
import os

# Authoritative passenger timetables and synthetic freight templates for Bhopal Division
# Time format: "HH:MM" (24h)
timetables = [
    {
        "train_number": "12002",
        "train_name": "New Delhi - Rani Kamalapati Shatabdi Express",
        "train_type": "SHATABDI",
        "service_type": "PASSENGER",
        "origin": "NDLS",
        "destination": "RKMP",
        "corridor_id": "CORR-01",
        "direction": "DOWN",
        "priority": 1,
        "max_speed_kmph": 130,
        "source_type": "REAL_PUBLIC",
        "schedule": [
            {"station_code": "GWL", "station_name": "Gwalior Junction", "arrival": "09:23", "departure": "09:28", "halt_minutes": 5, "km": 0},
            {"station_code": "BINA", "station_name": "Bina Junction", "arrival": "11:58", "departure": "12:00", "halt_minutes": 2, "km": 143},
            {"station_code": "BHS", "station_name": "Vidisha", "arrival": "12:53", "departure": "12:55", "halt_minutes": 2, "km": 232},
            {"station_code": "BPL", "station_name": "Bhopal Junction", "arrival": "13:38", "departure": "13:40", "halt_minutes": 2, "km": 286},
            {"station_code": "RKMP", "station_name": "Rani Kamalapati", "arrival": "14:40", "departure": "14:40", "halt_minutes": 0, "km": 292}
        ]
    },
    {
        "train_number": "12001",
        "train_name": "Rani Kamalapati - New Delhi Shatabdi Express",
        "train_type": "SHATABDI",
        "service_type": "PASSENGER",
        "origin": "RKMP",
        "destination": "NDLS",
        "corridor_id": "CORR-01",
        "direction": "UP",
        "priority": 1,
        "max_speed_kmph": 130,
        "source_type": "REAL_PUBLIC",
        "schedule": [
            {"station_code": "RKMP", "station_name": "Rani Kamalapati", "arrival": "15:10", "departure": "15:15", "halt_minutes": 5, "km": 0},
            {"station_code": "BPL", "station_name": "Bhopal Junction", "arrival": "15:25", "departure": "15:30", "halt_minutes": 5, "km": 6},
            {"station_code": "BHS", "station_name": "Vidisha", "arrival": "16:08", "departure": "16:10", "halt_minutes": 2, "km": 60},
            {"station_code": "BINA", "station_name": "Bina Junction", "arrival": "17:03", "departure": "17:05", "halt_minutes": 2, "km": 149},
            {"station_code": "GWL", "station_name": "Gwalior Junction", "arrival": "19:15", "departure": "19:20", "halt_minutes": 5, "km": 292}
        ]
    },
    {
        "train_number": "20171",
        "train_name": "Rani Kamalapati - Hazrat Nizamuddin Vande Bharat Express",
        "train_type": "VANDE_BHARAT",
        "service_type": "PASSENGER",
        "origin": "RKMP",
        "destination": "NZM",
        "corridor_id": "CORR-01",
        "direction": "UP",
        "priority": 1,
        "max_speed_kmph": 130,
        "source_type": "REAL_PUBLIC",
        "schedule": [
            {"station_code": "RKMP", "station_name": "Rani Kamalapati", "arrival": "05:40", "departure": "05:40", "halt_minutes": 0, "km": 0},
            {"station_code": "BPL", "station_name": "Bhopal Junction", "arrival": "05:48", "departure": "05:50", "halt_minutes": 2, "km": 6},
            {"station_code": "BINA", "station_name": "Bina Junction", "arrival": "07:18", "departure": "07:20", "halt_minutes": 2, "km": 149},
            {"station_code": "GWL", "station_name": "Gwalior Junction", "arrival": "09:41", "departure": "09:45", "halt_minutes": 4, "km": 292}
        ]
    },
    {
        "train_number": "20172",
        "train_name": "Hazrat Nizamuddin - Rani Kamalapati Vande Bharat Express",
        "train_type": "VANDE_BHARAT",
        "service_type": "PASSENGER",
        "origin": "NZM",
        "destination": "RKMP",
        "corridor_id": "CORR-01",
        "direction": "DOWN",
        "priority": 1,
        "max_speed_kmph": 130,
        "source_type": "REAL_PUBLIC",
        "schedule": [
            {"station_code": "GWL", "station_name": "Gwalior Junction", "arrival": "18:00", "departure": "18:04", "halt_minutes": 4, "km": 0},
            {"station_code": "BINA", "station_name": "Bina Junction", "arrival": "20:25", "departure": "20:27", "halt_minutes": 2, "km": 143},
            {"station_code": "BPL", "station_name": "Bhopal Junction", "arrival": "21:50", "departure": "21:52", "halt_minutes": 2, "km": 286},
            {"station_code": "RKMP", "station_name": "Rani Kamalapati", "arrival": "22:10", "departure": "22:10", "halt_minutes": 0, "km": 292}
        ]
    },
    {
        "train_number": "12615",
        "train_name": "Grand Trunk (GT) Express",
        "train_type": "SUPERFAST",
        "service_type": "PASSENGER",
        "origin": "NDLS",
        "destination": "MAS",
        "corridor_id": "CORR-01",
        "direction": "DOWN",
        "priority": 2,
        "max_speed_kmph": 110,
        "source_type": "REAL_PUBLIC",
        "schedule": [
            {"station_code": "BINA", "station_name": "Bina Junction", "arrival": "02:30", "departure": "02:35", "halt_minutes": 5, "km": 0},
            {"station_code": "BAQ", "station_name": "Ganj Basoda", "arrival": "03:08", "departure": "03:10", "halt_minutes": 2, "km": 49},
            {"station_code": "BHS", "station_name": "Vidisha", "arrival": "03:38", "departure": "03:40", "halt_minutes": 2, "km": 89},
            {"station_code": "BPL", "station_name": "Bhopal Junction", "arrival": "04:35", "departure": "04:40", "halt_minutes": 5, "km": 143},
            {"station_code": "NDPM", "station_name": "Narmadapuram", "arrival": "05:43", "departure": "05:45", "halt_minutes": 2, "km": 217},
            {"station_code": "ET", "station_name": "Itarsi Junction", "arrival": "06:20", "departure": "06:30", "halt_minutes": 10, "km": 235}
        ]
    },
    {
        "train_number": "12616",
        "train_name": "Grand Trunk (GT) Express",
        "train_type": "SUPERFAST",
        "service_type": "PASSENGER",
        "origin": "MAS",
        "destination": "NDLS",
        "corridor_id": "CORR-01",
        "direction": "UP",
        "priority": 2,
        "max_speed_kmph": 110,
        "source_type": "REAL_PUBLIC",
        "schedule": [
            {"station_code": "ET", "station_name": "Itarsi Junction", "arrival": "19:15", "departure": "19:25", "halt_minutes": 10, "km": 0},
            {"station_code": "NDPM", "station_name": "Narmadapuram", "arrival": "19:43", "departure": "19:45", "halt_minutes": 2, "km": 18},
            {"station_code": "BPL", "station_name": "Bhopal Junction", "arrival": "21:00", "departure": "21:05", "halt_minutes": 5, "km": 92},
            {"station_code": "BHS", "station_name": "Vidisha", "arrival": "21:48", "departure": "21:50", "halt_minutes": 2, "km": 146},
            {"station_code": "BAQ", "station_name": "Ganj Basoda", "arrival": "22:18", "departure": "22:20", "halt_minutes": 2, "km": 186},
            {"station_code": "BINA", "station_name": "Bina Junction", "arrival": "23:20", "departure": "23:25", "halt_minutes": 5, "km": 235}
        ]
    },
    {
        "train_number": "12137",
        "train_name": "Punjab Mail",
        "train_type": "MAIL_EXPRESS",
        "service_type": "PASSENGER",
        "origin": "CSMT",
        "destination": "FZR",
        "corridor_id": "CORR-02",
        "direction": "UP",
        "priority": 3,
        "max_speed_kmph": 110,
        "source_type": "REAL_PUBLIC",
        "schedule": [
            {"station_code": "KNW", "station_name": "Khandwa Junction", "arrival": "06:42", "departure": "06:45", "halt_minutes": 3, "km": 0},
            {"station_code": "KKN", "station_name": "Khirkiya", "arrival": "07:38", "departure": "07:40", "halt_minutes": 2, "km": 75},
            {"station_code": "HD", "station_name": "Harda", "arrival": "08:04", "departure": "08:06", "halt_minutes": 2, "km": 124},
            {"station_code": "BPF", "station_name": "Banapura", "arrival": "08:38", "departure": "08:40", "halt_minutes": 2, "km": 156},
            {"station_code": "ET", "station_name": "Itarsi Junction", "arrival": "09:30", "departure": "09:40", "halt_minutes": 10, "km": 184},
            {"station_code": "NDPM", "station_name": "Narmadapuram", "arrival": "10:00", "departure": "10:02", "halt_minutes": 2, "km": 202},
            {"station_code": "RKMP", "station_name": "Rani Kamalapati", "arrival": "11:03", "departure": "11:05", "halt_minutes": 2, "km": 270},
            {"station_code": "BPL", "station_name": "Bhopal Junction", "arrival": "11:20", "departure": "11:25", "halt_minutes": 5, "km": 276},
            {"station_code": "BHS", "station_name": "Vidisha", "arrival": "12:08", "departure": "12:10", "halt_minutes": 2, "km": 330},
            {"station_code": "BAQ", "station_name": "Ganj Basoda", "arrival": "12:38", "departure": "12:40", "halt_minutes": 2, "km": 370},
            {"station_code": "BINA", "station_name": "Bina Junction", "arrival": "13:30", "departure": "13:35", "halt_minutes": 5, "km": 419}
        ]
    },
    {
        "train_number": "18237",
        "train_name": "Chhattisgarh Express",
        "train_type": "EXPRESS",
        "service_type": "PASSENGER",
        "origin": "KRBA",
        "destination": "ASR",
        "corridor_id": "CORR-01",
        "direction": "UP",
        "priority": 3,
        "max_speed_kmph": 100,
        "source_type": "REAL_PUBLIC",
        "schedule": [
            {"station_code": "ET", "station_name": "Itarsi Junction", "arrival": "20:30", "departure": "20:40", "halt_minutes": 10, "km": 0},
            {"station_code": "BPL", "station_name": "Bhopal Junction", "arrival": "22:15", "departure": "22:20", "halt_minutes": 5, "km": 92},
            {"station_code": "BHS", "station_name": "Vidisha", "arrival": "23:08", "departure": "23:10", "halt_minutes": 2, "km": 146},
            {"station_code": "BINA", "station_name": "Bina Junction", "arrival": "00:20", "departure": "00:25", "halt_minutes": 5, "km": 235}
        ]
    },
    {
        "train_number": "11125",
        "train_name": "Ratlam - Gwalior Intercity Express",
        "train_type": "EXPRESS",
        "service_type": "PASSENGER",
        "origin": "GUNA",
        "destination": "GWL",
        "corridor_id": "CORR-05",
        "direction": "UP",
        "priority": 3,
        "max_speed_kmph": 100,
        "source_type": "REAL_PUBLIC",
        "schedule": [
            {"station_code": "GUNA", "station_name": "Guna Junction", "arrival": "14:15", "departure": "14:20", "halt_minutes": 5, "km": 0},
            {"station_code": "BDWS", "station_name": "Badarwas", "arrival": "14:58", "departure": "15:00", "halt_minutes": 2, "km": 48},
            {"station_code": "SVPI", "station_name": "Shivpuri", "arrival": "15:45", "departure": "15:50", "halt_minutes": 5, "km": 102},
            {"station_code": "MOJ", "station_name": "Mohana", "arrival": "16:38", "departure": "16:40", "halt_minutes": 2, "km": 152},
            {"station_code": "GWL", "station_name": "Gwalior Junction", "arrival": "17:45", "departure": "17:45", "halt_minutes": 0, "km": 227}
        ]
    }
]

# Synthetic Freight Templates (Constrained & Realistic)
freight_templates = [
    {
        "freight_id": "FREIGHT-F001",
        "cargo_type": "COAL",
        "origin_region": "Singrauli Coalfields",
        "destination_region": "Kota Thermal Power Station",
        "corridor_id": "CORR-01",
        "entry_station": "ET",
        "exit_station": "BINA",
        "direction": "UP",
        "trailing_load_tonnes": 4800,
        "wagon_type": "BOXN-HL",
        "max_speed_kmph": 75,
        "source_type": "SYNTHETIC",
        "holding_capability": True,
        "preferred_hold_stations": ["SUMR", "SOI", "MDG", "PRKD"]
    },
    {
        "freight_id": "FREIGHT-F002",
        "cargo_type": "AUTOMOBILES",
        "origin_region": "Mandideep Industrial Area (ICD)",
        "destination_region": "Northern Logistics Hub (Dadri)",
        "corridor_id": "CORR-01",
        "entry_station": "MDDP",
        "exit_station": "BINA",
        "direction": "UP",
        "trailing_load_tonnes": 1600,
        "wagon_type": "NMGH",
        "max_speed_kmph": 90,
        "source_type": "SYNTHETIC",
        "holding_capability": True,
        "preferred_hold_stations": ["SUMR", "BET", "DWG"]
    },
    {
        "freight_id": "FREIGHT-F003",
        "cargo_type": "CONTAINERS",
        "origin_region": "JNPT Port Mumbai",
        "destination_region": "CONCOR Mandideep ICD",
        "corridor_id": "CORR-02",
        "entry_station": "KNW",
        "exit_station": "ET",
        "direction": "UP",
        "trailing_load_tonnes": 3200,
        "wagon_type": "BLCA/BLCB",
        "max_speed_kmph": 80,
        "source_type": "SYNTHETIC",
        "holding_capability": True,
        "preferred_hold_stations": ["BIR", "PGL", "MSO"]
    },
    {
        "freight_id": "FREIGHT-F004",
        "cargo_type": "CEMENT",
        "origin_region": "Birla Cement, Maihar",
        "destination_region": "Guna Distribution Depot",
        "corridor_id": "CORR-03",
        "entry_station": "BINA",
        "exit_station": "GUNA",
        "direction": "DOWN",
        "trailing_load_tonnes": 3800,
        "wagon_type": "BCN-HL",
        "max_speed_kmph": 75,
        "source_type": "SYNTHETIC",
        "holding_capability": True,
        "preferred_hold_stations": ["SMDK", "GVB", "PIA"]
    },
    {
        "freight_id": "FREIGHT-F005",
        "cargo_type": "FOOD_GRAINS",
        "origin_region": "Guna Food Corporation Depot",
        "destination_region": "Gwalior Grain Silo",
        "corridor_id": "CORR-05",
        "entry_station": "GUNA",
        "exit_station": "GWL",
        "direction": "DOWN",
        "trailing_load_tonnes": 3500,
        "wagon_type": "BCN",
        "max_speed_kmph": 75,
        "source_type": "SYNTHETIC",
        "holding_capability": True,
        "preferred_hold_stations": ["BDWS", "SVPI", "MOJ"]
    }
]

# Maintenance Domain Rules & Work Types
maintenance_rules = {
    "departments": [
        {
            "id": "PWAY",
            "name": "Permanent Way (Engineering)",
            "description": "Maintenance of rails, sleepers, ballast, turnouts, track geometry and structural integrity.",
            "work_types": [
                {"id": "RAIL_RENEWAL", "name": "Through Rail Renewal (TRR)", "mode": "FULL_BLOCK", "protection": "TRAFFIC_BLOCK", "default_duration_mins": 180, "requires_power_isolation": False, "requires_track_occupation": True, "equipment": ["CSM_TAMPER", "TRACK_GANG"]},
                {"id": "TAMPER_PACKING", "name": "Tamping and Track Packing", "mode": "FULL_BLOCK", "protection": "TRAFFIC_BLOCK", "default_duration_mins": 150, "requires_power_isolation": False, "requires_track_occupation": True, "equipment": ["CSM_TAMPER"]},
                {"id": "DEEP_SCREENING", "name": "Deep Ballast Screening", "mode": "FULL_BLOCK", "protection": "TRAFFIC_BLOCK", "default_duration_mins": 240, "requires_power_isolation": False, "requires_track_occupation": True, "equipment": ["BCM", "CSM_TAMPER"]},
                {"id": "USFD_TESTING", "name": "Ultrasonic Flaw Detection (USFD)", "mode": "GAP_WORK", "protection": "TRAFFIC_CAUTION", "default_duration_mins": 90, "requires_power_isolation": False, "requires_track_occupation": False, "equipment": ["USFD_EQUIPMENT", "TRACK_GANG"]},
                {"id": "TURNOUT_OVERHAUL", "name": "Points & Crossing Overhaul", "mode": "FULL_BLOCK", "protection": "TRAFFIC_BLOCK", "default_duration_mins": 210, "requires_power_isolation": False, "requires_track_occupation": True, "equipment": ["UNIMAT", "TRACK_GANG"]},
                {"id": "RAIL_FRACTURE_REPAIR", "name": "Emergency Rail Fracture Clamping/Welding", "mode": "EMERGENCY", "protection": "EMERGENCY_PROTECTION", "default_duration_mins": 90, "requires_power_isolation": False, "requires_track_occupation": True, "equipment": ["TRACK_GANG"]}
            ]
        },
        {
            "id": "TRD",
            "name": "Traction Distribution (OHE / Electrical)",
            "description": "Maintenance of 25kV AC overhead contact & catenary wire, isolators, cantilevers, and sub-stations.",
            "work_types": [
                {"id": "OHE_ADJUSTMENT", "name": "OHE Catenary & Contact Wire Adjustment", "mode": "FULL_BLOCK", "protection": "TRAFFIC_AND_POWER_ISOLATION", "default_duration_mins": 120, "requires_power_isolation": True, "requires_track_occupation": True, "equipment": ["TOWER_WAGON"]},
                {"id": "INSULATOR_REPLACEMENT", "name": "Section Insulator & Bracket Replacement", "mode": "SHORT_BLOCK", "protection": "TRAFFIC_AND_POWER_ISOLATION", "default_duration_mins": 75, "requires_power_isolation": True, "requires_track_occupation": True, "equipment": ["TOWER_WAGON"]},
                {"id": "TREE_TRIMMING_OHE", "name": "Tree Branch Trimming near Live OHE", "mode": "SHORT_BLOCK", "protection": "POWER_ISOLATION", "default_duration_mins": 60, "requires_power_isolation": True, "requires_track_occupation": False, "equipment": ["TRD_GANG"]},
                {"id": "OHE_WIRE_PARTING_EMG", "name": "Contact Wire Parting Restoration", "mode": "EMERGENCY", "protection": "EMERGENCY_PROTECTION", "default_duration_mins": 180, "requires_power_isolation": True, "requires_track_occupation": True, "equipment": ["TOWER_WAGON", "TRD_GANG"]}
            ]
        },
        {
            "id": "SNT",
            "name": "Signal & Telecommunication (S&T)",
            "description": "Maintenance of point machines, track circuits, axle counters, signals, and electronic interlocking.",
            "work_types": [
                {"id": "POINT_MACHINE_MAINT", "name": "Point Machine Cleaning & Overhaul", "mode": "SHORT_BLOCK", "protection": "TRAFFIC_BLOCK", "default_duration_mins": 60, "requires_power_isolation": False, "requires_track_occupation": True, "equipment": ["SNT_GANG"]},
                {"id": "AXLE_COUNTER_TEST", "name": "Axle Counter BPAC Testing & Tuning", "mode": "GAP_WORK", "protection": "TRAFFIC_CAUTION", "default_duration_mins": 45, "requires_power_isolation": False, "requires_track_occupation": False, "equipment": ["SNT_GANG"]},
                {"id": "SIGNAL_CABLE_MEGGERING", "name": "Signal Cable Insulation Testing", "mode": "GAP_WORK", "protection": "NO_SPECIAL_PROTECTION", "default_duration_mins": 60, "requires_power_isolation": False, "requires_track_occupation": False, "equipment": ["SNT_GANG"]},
                {"id": "SIGNAL_FAILURE_EMG", "name": "Signal Red Lock / Blank Restoration", "mode": "EMERGENCY", "protection": "EMERGENCY_PROTECTION", "default_duration_mins": 60, "requires_power_isolation": False, "requires_track_occupation": True, "equipment": ["SNT_GANG"]}
            ]
        }
    ],
    "equipment_registry": [
        {"id": "CSM_01", "type": "CSM_TAMPER", "name": "Plasser 09-32 CSM Tamper #812", "base_station": "BPL", "assigned_department": "PWAY", "status": "AVAILABLE"},
        {"id": "UNIMAT_01", "type": "UNIMAT", "name": "Points Tamper Unimat 08-275 #404", "base_station": "BINA", "assigned_department": "PWAY", "status": "AVAILABLE"},
        {"id": "BCM_01", "type": "BCM", "name": "Ballast Cleaning Machine BCM-80 #11", "base_station": "ET", "assigned_department": "PWAY", "status": "AVAILABLE"},
        {"id": "TW_BPL_01", "type": "TOWER_WAGON", "name": "8-Wheeler DETC Tower Wagon #09", "base_station": "BPL", "assigned_department": "TRD", "status": "AVAILABLE"},
        {"id": "TW_BINA_01", "type": "TOWER_WAGON", "name": "8-Wheeler DETC Tower Wagon #14", "base_station": "BINA", "assigned_department": "TRD", "status": "AVAILABLE"},
        {"id": "USFD_01", "type": "USFD_EQUIPMENT", "name": "Digital Rail Tester EEC-DRT #03", "base_station": "BHS", "assigned_department": "PWAY", "status": "AVAILABLE"}
    ]
}

os.makedirs("data", exist_ok=True)
with open("data/timetables.json", "w", encoding="utf-8") as f:
    json.dump({"passenger_trains": timetables, "freight_templates": freight_templates}, f, indent=2)

with open("data/maintenance_rules.json", "w", encoding="utf-8") as f:
    json.dump(maintenance_rules, f, indent=2)

print(f"Generated timetables: {len(timetables)} passenger trains, {len(freight_templates)} freight templates.")
print(f"Generated maintenance rules: {len(maintenance_rules['departments'])} departments, {len(maintenance_rules['equipment_registry'])} heavy machines.")
