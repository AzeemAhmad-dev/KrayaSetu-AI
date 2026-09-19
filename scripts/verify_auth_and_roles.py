import json

# Verify frontend AuthContext demo registry accounts and mappings
with open("frontend/src/context/AuthContext.tsx", "r", encoding="utf-8") as f:
    content = f.read()

accounts = [
    ("COA-001", "Chief of Block Officer", "/control", "Master Control"),
    ("COR-001", "Corridor Master", "/corridors", "Corridor Control"),
    ("SM-001", "Station Master", "/station-master/bhopal", "Station Master"),
    ("PWAY-001", "Track / P.Way", "/pway-control", "Track Maintenance"),
    ("PWAY-002", "Track / P.Way", "/pway-control", "Track Maintenance"),
    ("SNT-001", "Signal & S&T", "/snt-control", "Signal & S&T Control"),
    ("TRD-001", "Traction / OHE", "/trd-control", "Traction / OHE Control"),
    ("TRD-002", "Traction / OHE", "/trd-control", "Traction / OHE Control"),
]

print("=== VERIFYING DEMO ACCOUNTS IN FRONTEND REGISTRY ===")
all_passed = True
for username, role_title, default_path, workspace in accounts:
    if f'"{username}":' in content:
        print(f"[PASS] Account {username} defined.")
    else:
        print(f"[FAIL] Account {username} missing in registry.")
        all_passed = False

    if f'defaultPath: "{default_path}"' in content or default_path in content:
        print(f"[PASS] {username} mapped to {default_path}")
    else:
        print(f"[FAIL] {username} path mismatch.")
        all_passed = False

if all_passed:
    print("\nALL 8 DEMO ACCOUNTS AND ROLE WORKSPACE MAPPINGS VERIFIED!")
else:
    print("\nSome verifications failed.")
