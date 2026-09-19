import urllib.request
import json

res = urllib.request.urlopen("http://127.0.0.1:8000/api/corridors")
corridors = json.loads(res.read().decode())
print(f"Total Corridors: {len(corridors)}")
for c in corridors:
    print(f"- {c['id']}: {c['name']} | Distance: {c['total_distance_km']} km | Locations: {c['total_locations']}")
