"""
Canonical Application Time & Future Planning Window Validator for KrayaSetu AI
Unified canonical time source across frontend, backend, database, Marey, and optimizer.

Core Invariants:
1. Whenever system generates or selects a future planned block/task,
   the execution window must be future relative to canonical application time:
   `START < END` and `END > CURRENT_TIME` (when execution_date == today).
2. Never present an already-expired slot as an upcoming future planned block.
   Recalculate/select a valid future slot according to existing planning constraints.
3. Past scheduled window != automatically completed.
   Physical maintenance completion comes only from real human/field workflow actions.
4. Unified canonical time source across all subsystems.
"""

from datetime import datetime, timedelta
from typing import Tuple, Optional, Dict, Any
import zoneinfo

try:
    KOLKATA_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")
except Exception:
    KOLKATA_TZ = None


def get_canonical_now() -> datetime:
    """Returns the canonical application system datetime in Asia/Kolkata wall-clock time."""
    if KOLKATA_TZ:
        try:
            return datetime.now(KOLKATA_TZ).replace(tzinfo=None)
        except Exception:
            pass
    return datetime.now()


def get_canonical_today_str() -> str:
    """Returns today's canonical date formatted as YYYY-MM-DD."""
    return get_canonical_now().strftime("%Y-%m-%d")


def time_to_minutes(time_str: str) -> int:
    """Parses HH:MM string to integer minutes from midnight."""
    parts = time_str.strip().split(":")
    return int(parts[0]) * 60 + int(parts[1])


def minutes_to_time(minutes: int) -> str:
    """Converts integer minutes to formatted HH:MM string (modulo 24 hours)."""
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


def compute_future_planning_horizon(
    requested_start: str = "08:00",
    requested_end: str = "20:00",
    requested_date: Optional[str] = None,
    canonical_now: Optional[datetime] = None,
    min_prep_buffer_mins: int = 15,
    min_window_duration_mins: int = 60,
) -> Tuple[str, str, str]:
    """
    Computes a strictly future-feasible planning horizon (effective_start, effective_end, target_date).
    - If requested_date is in the future (> today), requested_start and requested_end are valid as-is.
    - If requested_date is today or None:
      - If current_time + min_prep_buffer_mins + min_window_duration_mins > time_to_minutes(requested_end):
        The window has expired or is too small for today; advances to tomorrow with original requested window.
      - If current_time is before requested_start:
        Window is today: requested_start to requested_end.
      - If current_time is during the requested window:
        Window is today: adjusted_start (rounded up to nearest 15m with prep buffer) to requested_end.
    Returns: (effective_start_str, effective_end_str, target_date_str)
    """
    now = canonical_now or get_canonical_now()
    today_str = now.strftime("%Y-%m-%d")
    cur_minutes = now.hour * 60 + now.minute

    target_date = (requested_date or today_str).strip()

    req_start_m = time_to_minutes(requested_start)
    req_end_m = time_to_minutes(requested_end)

    if target_date < today_str:
        # Expired past date: advance to today
        target_date = today_str

    if target_date == today_str:
        # Check if enough time remains today within the requested window
        earliest_start = ((cur_minutes + min_prep_buffer_mins + 14) // 15) * 15
        
        if earliest_start + min_window_duration_mins > req_end_m or cur_minutes >= req_end_m:
            # Cannot fit within today's window; advance to tomorrow with full daytime window
            tomorrow = now + timedelta(days=1)
            target_date = tomorrow.strftime("%Y-%m-%d")
            effective_start_m = req_start_m
            effective_end_m = req_end_m
        else:
            # Fits today! Start from max of requested start and earliest feasible future time
            effective_start_m = max(req_start_m, earliest_start)
            effective_end_m = req_end_m
    else:
        # Future date: use requested start and end as-is
        effective_start_m = req_start_m
        effective_end_m = req_end_m

    return minutes_to_time(effective_start_m), minutes_to_time(effective_end_m), target_date


def validate_or_recalculate_future_window(
    start_time_str: str,
    end_time_str: str,
    execution_date_str: Optional[str] = None,
    duration_mins: Optional[int] = None,
    canonical_now: Optional[datetime] = None,
    min_prep_buffer_mins: int = 15,
) -> Dict[str, Any]:
    """
    Validates that a planned block/task execution window is strictly in the future:
    - START < END
    - If execution_date == today: END > CURRENT_TIME
    - If execution_date < today: date has expired, must be advanced.

    If the slot is expired or invalid:
    Recalculates/selects a valid future slot according to railway planning constraints:
    1. If duration fits later today (with preparation buffer), schedules earliest feasible slot today.
    2. If duration cannot fit later today (late evening or crosses midnight), advances execution_date
       to tomorrow, preserving planned duration and operational slot.

    Returns:
    {
        "start_time": str,
        "end_time": str,
        "execution_date": str,
        "duration_mins": int,
        "is_future": True,
        "was_recalculated": bool,
        "recalculation_reason": Optional[str]
    }
    """
    now = canonical_now or get_canonical_now()
    today_str = now.strftime("%Y-%m-%d")
    cur_minutes = now.hour * 60 + now.minute

    exec_date = (execution_date_str or today_str).strip()

    # Parse requested times safely
    try:
        start_m = time_to_minutes(start_time_str)
    except Exception:
        start_m = 9 * 60

    try:
        end_m = time_to_minutes(end_time_str)
    except Exception:
        end_m = start_m + (duration_mins or 120)

    # Determine effective task duration
    if duration_mins and duration_mins > 0:
        dur = duration_mins
    elif end_m > start_m:
        dur = end_m - start_m
    else:
        dur = 120

    was_recalculated = False
    recalculation_reason = None

    # Check if execution date is in the past
    if exec_date < today_str:
        was_recalculated = True
        recalculation_reason = f"Expired date '{exec_date}' updated to active operational window."
        exec_date = today_str

    if exec_date == today_str:
        # Scheduled for today: slot must have START < END and END > CURRENT_TIME
        is_expired = (end_m <= cur_minutes)
        is_invalid_order = (start_m >= end_m)

        if is_expired or is_invalid_order:
            was_recalculated = True
            # Check if task can fit in remaining daylight/evening hours today
            earliest_start = ((cur_minutes + min_prep_buffer_mins + 14) // 15) * 15
            earliest_end = earliest_start + dur

            if earliest_end <= 1410:  # Before 23:30 today
                start_m = earliest_start
                end_m = earliest_end
                recalculation_reason = (
                    f"Past/expired slot ({start_time_str}–{end_time_str} <= {minutes_to_time(cur_minutes)}) "
                    f"recalculated to upcoming valid future window today: {minutes_to_time(start_m)}–{minutes_to_time(end_m)}."
                )
            else:
                # Cannot fit today: advance to tomorrow
                tomorrow = now + timedelta(days=1)
                exec_date = tomorrow.strftime("%Y-%m-%d")
                # Preserve standard daytime window (or requested hours if valid)
                if not is_invalid_order:
                    start_m = time_to_minutes(start_time_str)
                    end_m = start_m + dur
                else:
                    start_m = 9 * 60
                    end_m = start_m + dur
                recalculation_reason = (
                    f"Slot expired for today. Reallocated to next available future day ({exec_date}) "
                    f"at {minutes_to_time(start_m)}–{minutes_to_time(end_m)}."
                )
        elif start_m < cur_minutes:
            # Slot has already started, but hasn't ended yet.
            # If start is in past, adjust start to current time + buffer to guarantee upcoming future execution
            earliest_start = ((cur_minutes + min_prep_buffer_mins + 14) // 15) * 15
            if earliest_start + 30 <= 1440:
                was_recalculated = True
                start_m = earliest_start
                end_m = max(end_m, start_m + dur)
                recalculation_reason = (
                    f"Block start time adjusted from {start_time_str} to future time {minutes_to_time(start_m)}."
                )

    else:
        # Future date (exec_date > today_str): already strictly in the future!
        # Only guarantee START < END
        if start_m >= end_m:
            was_recalculated = True
            end_m = start_m + dur
            recalculation_reason = f"Adjusted invalid end time to {minutes_to_time(end_m)} to satisfy START < END."

    valid_start_str = minutes_to_time(start_m)
    valid_end_str = minutes_to_time(end_m)
    final_dur = end_m - start_m if end_m > start_m else dur

    return {
        "start_time": valid_start_str,
        "end_time": valid_end_str,
        "execution_date": exec_date,
        "duration_mins": final_dur,
        "is_future": True,
        "was_recalculated": was_recalculated,
        "recalculation_reason": recalculation_reason,
    }
