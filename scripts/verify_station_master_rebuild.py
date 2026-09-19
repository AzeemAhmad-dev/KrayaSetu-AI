import urllib.request
import json
import sys

STATIONS = ["BHS", "RKMP", "BPL", "ET", "BINA", "KNW", "GWL"]

print("==================================================")
print("VERIFYING STATION MASTER REBUILT MAP & DATA LOGIC")
print("==================================================")

for stn_code in STATIONS:
    try:
        url = f"http://127.0.0.1:8000/api/stations/{stn_code}"
        res = urllib.request.urlopen(url)
        data = json.loads(res.read().decode())
        
        stn = data.get("station", {})
        plats = data.get("platforms_layout", [])
        present = data.get("present_trains", [])
        blocks = data.get("nearby_blocks", [])
        
        print(f"\nStation: {stn.get('name')} ({stn_code})")
        print(f"  Platforms in DB: {len(plats)} | Present Trains in DB: {len(present)} | Blocks: {len(blocks)}")
        
        # Test strict 1-train = 1-location invariant
        placed_train_ids = set()
        occupied_pfs = 0
        conflicts = 0
        
        for p in plats:
            p_num = p.get("platform_number")
            status = p.get("status")
            occ = p.get("occupied_by")
            
            if status == "OCCUPIED" and occ:
                occupied_pfs += 1
                # Find matching present train
                matched = None
                for t in present:
                    if t.get("train_name", "").strip().lower() == occ.strip().lower():
                        matched = t
                        break
                    if occ.find(t.get("train_number", "")) != -1:
                        matched = t
                        break
                
                t_id = matched.get("train_number") if matched else f"TRN-P{p_num}"
                t_name = matched.get("train_name") if matched else occ
                t_delay = matched.get("delay_minutes", 0) if matched else 0
                
                if t_id in placed_train_ids:
                    print(f"  [ERROR - DUPLICATE TRAIN] Train {t_id} on PF {p_num} was ALREADY placed!")
                    conflicts += 1
                else:
                    placed_train_ids.add(t_id)
                    print(f"  PF {p_num}: OCCUPIED by Train {t_id} ({t_name}) [delay: {t_delay}m]")
            else:
                print(f"  PF {p_num}: AVAILABLE / CLEAR (No train placed)")
                
        print(f"  Total Occupied: {occupied_pfs} | Total Clear: {len(plats) - occupied_pfs} | Conflicts: {conflicts}")
        assert conflicts == 0, f"Conflicts detected in {stn_code}!"
        
    except Exception as e:
        print(f"Error checking {stn_code}: {e}")
        sys.exit(1)

print("\n==================================================")
print("ALL 7 STATIONS VERIFIED SUCCESSFULLY (0 CONFLICTS)")
print("==================================================")
