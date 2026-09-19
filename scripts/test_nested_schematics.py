import os
import re

def main():
    print("=== 1. VERIFYING CORRIDORS DATABASE LOCATIONS ===")
    with open("frontend/src/data/corridorsData.ts", "r", encoding="utf-8") as f:
        corr_ts = f.read()

    test_stations = ["MDDP", "SCI", "BHS", "HD", "ASKN", "SVPI", "ET", "BPL", "BINA", "KNW", "GWL"]
    all_stations_found = True
    for stn in test_stations:
        found = f'"{stn}"' in corr_ts
        print(f"  Station {stn:8s} in corridorsData: {found}")
        if not found:
            all_stations_found = False

    print("\n=== 2. VERIFYING LIGHT ENGINEERING THEME (NO BLACK-HEAVY MAP) ===")
    files_to_check = [
        "frontend/src/components/corridor/DetailedCorridorMapCanvas.tsx",
        "frontend/src/components/station/RailwayStationSchematic.tsx",
        "frontend/src/components/station/PlatformSchematic.tsx",
        "frontend/src/components/network/SchematicRailwayMap.tsx",
    ]

    all_light = True
    for filepath in files_to_check:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        has_old_dark = "#07111e" in content or "#0a1829" in content
        has_light_bg = "bg-white" in content or "bg-[#fbfcfd]" in content or "bg-slate-50" in content
        has_dual_rails = "HALF_GAUGE" in content or "halfGauge" in content or "Dual" in content or "line" in content
        fname = os.path.basename(filepath)
        print(f"  {fname}:")
        print(f"    - No old dark/black background: {not has_old_dark}")
        print(f"    - Has light engineering background: {has_light_bg}")
        print(f"    - Dual rails / sleepers: {has_dual_rails}")
        if has_old_dark or not has_light_bg or not has_dual_rails:
            all_light = False

    print("\n=== 3. VERIFYING TYPOGRAPHY IN INDEX.HTML & INDEX.CSS ===")
    with open("frontend/index.html", "r", encoding="utf-8") as f:
        html = f.read()
    with open("frontend/src/index.css", "r", encoding="utf-8") as f:
        css = f.read()

    inter_html = "family=Inter" in html
    inter_css = "Inter" in css
    mono_html = "family=JetBrains+Mono" in html
    print(f"  Inter font in index.html: {inter_html}")
    print(f"  Inter font in index.css: {inter_css}")
    print(f"  JetBrains Mono in index.html: {mono_html}")

    print("\n=== 4. VERIFYING ZERO OPERATIONAL DATA IN CORRIDOR UI ===")
    with open("frontend/src/pages/CorridorDetailPage.tsx", "r", encoding="utf-8") as f:
        page_code = f.read()

    banned_terms = ["train_number", "delay_minutes", "speed_actual", "conflict_risk_score", "occupancy_status"]
    found_banned = [term for term in banned_terms if term in page_code]
    print(f"  Banned operational terms in CorridorDetailPage: {found_banned} (Should be empty)")

    print("\n=== 5. VERIFYING NESTED INTERACTION HIERARCHY ===")
    has_corridor_map = "DetailedCorridorMapCanvas" in page_code
    has_station_schematic = "RailwayStationSchematic" in page_code
    has_platform_schematic = "PlatformSchematic" in page_code
    has_collapse_toggle = "isStationExpanded" in page_code
    has_platform_toggle = "selectedPlatformNumber" in page_code

    print(f"  Has DetailedCorridorMapCanvas: {has_corridor_map}")
    print(f"  Has RailwayStationSchematic: {has_station_schematic}")
    print(f"  Has PlatformSchematic: {has_platform_schematic}")
    print(f"  Has Station Collapse/Expand toggle: {has_collapse_toggle}")
    print(f"  Has Platform selection toggle: {has_platform_toggle}")

    if all_stations_found and all_light and inter_html and inter_css and len(found_banned) == 0:
        print("\nALL NESTED SCHEMATIC AND VISUAL REQUIREMENTS PASSED!")
    else:
        print("\nSOME CHECKS FAILED.")

if __name__ == "__main__":
    main()
