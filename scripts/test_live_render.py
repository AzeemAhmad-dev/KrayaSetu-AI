import urllib.request
import json
import ssl

ctx = ssl.create_default_context()

endpoints = [
    "/api/summary",
    "/api/corridors",
    "/api/trains",
    "/api/train-movements",
    "/api/blocks",
    "/api/blocks?operational_only=true",
    "/api/maintenance/tasks",
    "/api/maintenance/faults",
    "/api/scenarios",
]

for ep in endpoints:
    url = f"https://krayasetu-ai.onrender.com{ep}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            data = resp.read().decode("utf-8")
            parsed = json.loads(data)
            count = len(parsed) if isinstance(parsed, (list, dict)) else "?"
            print(f"{ep:35s} -> Status: {resp.status}, Items: {count}")
            if ep == "/api/summary":
                print("   Summary content:", data[:200])
            elif ep == "/api/blocks" and isinstance(parsed, list):
                print(f"   Total blocks on Render: {len(parsed)}")
                if len(parsed) > 0:
                    print("   First block:", parsed[0].get("id"), parsed[0].get("status"))
            elif ep == "/api/trains" and isinstance(parsed, list):
                print(f"   Total trains on Render: {len(parsed)}")
    except Exception as e:
        print(f"{ep:35s} -> FAILED: {e}")
