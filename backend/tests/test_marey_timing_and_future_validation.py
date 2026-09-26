import pytest
from datetime import datetime, timedelta
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.services.time_validation import (
    validate_or_recalculate_future_window,
    get_canonical_now,
    get_canonical_today_str,
    time_to_minutes,
    minutes_to_time,
)

client = TestClient(app)


def test_acceptance_train_12191_shridham_express_timing_and_direction():
    """Acceptance test for Train 12191 (Shridham Express) calibration.
    Must have DOWN direction (Bina -> Itarsi, North to South, increasing km),
    arrive at Obaidulla Ganj at 02:35, and terminate at Itarsi at 03:50.
    """
    res = client.get("/api/railway/active-trains?mode=LIVE")
    assert res.status_code == 200
    data = res.json()
    trains = data["trains"]

    shridham = next((t for t in trains if t["trainNumber"] == "12191"), None)
    assert shridham is not None, "Train 12191 must be present in active corridor trains"
    assert shridham["direction"] == "DOWN", "12191 must be DOWN direction (Bina -> Itarsi)"
    assert shridham["trainDisplayName"] == "12191 \u2014 Shridham Express"
    assert "1 2 1 9 1" not in shridham["trainDisplayName"]

    # Verify scheduled timetable stops
    sched = shridham["scheduledPath"]
    assert len(sched) >= 4, "12191 must have full scheduled corridor path"

    # Entry at Bina (km 0.0) at 00:00 — station name is "BINA JN" from corridor config
    bina_stop = sched[0]
    assert bina_stop["station"] == "BINA JN"
    assert bina_stop["km"] == 0.0
    assert bina_stop["time"] == "00:00"

    # Obaidulla Ganj (km 174.0) at 02:35
    odg_stop = next((s for s in sched if "OBAIDULLA" in s["station"].upper()), None)
    assert odg_stop is not None, "Obaidulla Ganj must be in 12191 path"
    assert odg_stop["time"] == "02:35", f"12191 must pass Obaidulla Ganj at 02:35, got {odg_stop['time']}"
    assert odg_stop["km"] == 174.0

    # Termination at Itarsi (km 231.0) at 03:50
    # Find the ARRIVAL entry at ITARSI JN (the last ARRIVAL for that station)
    et_arrivals = [s for s in sched if s["station"] == "ITARSI JN" and s.get("type") == "ARRIVAL"]
    assert len(et_arrivals) >= 1
    et_stop = et_arrivals[-1]
    assert et_stop["km"] == 231.0
    assert et_stop["time"] == "03:50", f"12191 must reach Itarsi at 03:50, got {et_stop['time']}"


def test_acceptance_train_12715_sachkhand_express_timing_and_direction():
    """Acceptance test for Train 12715 (Sachkhand Express) calibration.
    Must have UP direction (Itarsi -> Bina, South to North, decreasing km),
    enter at Itarsi at 00:00, pass Bhopal at 02:35/02:40, arrive at Bina at 04:30.
    """
    res = client.get("/api/railway/active-trains?mode=LIVE")
    assert res.status_code == 200
    data = res.json()
    trains = data["trains"]

    sachkhand = next((t for t in trains if t["trainNumber"] == "12715"), None)
    assert sachkhand is not None, "Train 12715 must be present in active corridor trains"
    assert sachkhand["direction"] == "UP", "12715 must be UP direction (Itarsi -> Bina)"
    assert sachkhand["trainDisplayName"] == "12715 \u2014 Sachkhand Express"
    assert "1 2 7 1 5" not in sachkhand["trainDisplayName"]

    sched = sachkhand["scheduledPath"]
    assert len(sched) >= 4, "12715 must have scheduled corridor stops"

    # Entry at Itarsi (km 231.0) at 00:00
    et_stop = sched[0]
    assert et_stop["station"] == "ITARSI JN"
    assert et_stop["km"] == 231.0
    assert et_stop["time"] == "00:00"

    # Bhopal (km 138.0) around 02:35/02:40
    bpl_stops = [s for s in sched if "BHOPAL" in s["station"].upper()]
    assert len(bpl_stops) >= 1, "Bhopal JN must be in 12715 path"
    bpl_arr = next((s for s in bpl_stops if s.get("type") == "ARRIVAL"), bpl_stops[0])
    assert bpl_arr["time"] in ("02:35", "02:40"), f"12715 Bhopal arrival expected 02:35 or 02:40, got {bpl_arr['time']}"

    # Termination at Bina (km 0.0) at 04:30
    bina_arrivals = [s for s in sched if s["station"] == "BINA JN" and s.get("type") == "ARRIVAL"]
    assert len(bina_arrivals) >= 1
    bina_stop = bina_arrivals[-1]
    assert bina_stop["km"] == 0.0
    assert bina_stop["time"] == "04:30", f"12715 must reach Bina at 04:30, got {bina_stop['time']}"


def test_train_display_formatting():
    """Verify all trains have solid unbroken trainDisplayName without digit spaces."""
    res = client.get("/api/railway/active-trains?mode=LIVE")
    assert res.status_code == 200
    trains = res.json()["trains"]

    for t in trains:
        disp = t.get("trainDisplayName", "")
        assert disp != "", f"Train {t['trainNumber']} missing trainDisplayName"
        assert t["trainNumber"] in disp
        assert t["trainName"] in disp
        assert " \u2014 " in disp
        # Ensure digits of trainNumber are unbroken
        assert " " not in t["trainNumber"], f"trainNumber {t['trainNumber']} must not have internal spaces"


def test_time_validation_service_future_guarantee():
    """Verify that validate_or_recalculate_future_window prevents past slots."""
    now = get_canonical_now()
    today_str = get_canonical_today_str()

    # Case 1: Slot clearly in the past for today (e.g. 02:00 to 04:00 when now is afternoon/night)
    if now.hour >= 5:
        res = validate_or_recalculate_future_window(
            start_time_str="02:00",
            end_time_str="04:00",
            execution_date_str=today_str,
            duration_mins=120,
        )
        # Result must be in the future relative to now
        res_date = datetime.strptime(res["execution_date"], "%Y-%m-%d").date()
        res_end_mins = time_to_minutes(res["end_time"])
        now_mins = now.hour * 60 + now.minute

        if res_date == now.date():
            assert res_end_mins > now_mins, "Recalculated today slot must end in the future"
        else:
            assert res_date > now.date(), "If advanced to another day, date must be strictly future"

    # Case 2: Ensure start < end always
    res = validate_or_recalculate_future_window(
        start_time_str="14:00",
        end_time_str="12:00",  # inverted
        execution_date_str=today_str,
        duration_mins=120,
    )
    assert time_to_minutes(res["start_time"]) < time_to_minutes(res["end_time"])

    # Case 3: Future slot tomorrow should be preserved
    tomorrow_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    res_tomorrow = validate_or_recalculate_future_window(
        start_time_str="10:00",
        end_time_str="12:00",
        execution_date_str=tomorrow_str,
        duration_mins=120,
    )
    assert res_tomorrow["start_time"] == "10:00"
    assert res_tomorrow["end_time"] == "12:00"
    assert res_tomorrow["execution_date"] == tomorrow_str


def test_block_propose_future_validation_integration():
    """Verify that proposing a block with past timestamps returns a valid response."""
    now = get_canonical_now()
    today_str = get_canonical_today_str()

    payload = {
        "corridor_id": "BPL-ET",
        "location_km": 122.5,
        "section_id": "HBJ-MDI",
        "requested_date": today_str,
        "requested_start_time": "01:00",
        "requested_end_time": "03:00",
        "block_type": "PLANNED",
        "work_type": "TRACK_MAINTENANCE",
        "department": "TRACK",
        "description": "Validation test track maintenance",
        "applicant_id": "TEST_ENG_01",
        "applicant_role": "SR_DEN",
    }

    res = client.post("/api/blocks/propose", json=payload)
    assert res.status_code == 200
    result = res.json()
    assert result["status"] == "SUCCESS"
    assert "block_id" in result
