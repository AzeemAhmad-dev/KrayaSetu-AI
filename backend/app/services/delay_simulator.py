import random
from typing import Tuple

def compute_delay_category(delay_minutes: int) -> str:
    if delay_minutes <= 5:
        return "ON_TIME"
    elif delay_minutes <= 15:
        return "MINOR"
    elif delay_minutes <= 45:
        return "MODERATE"
    elif delay_minutes <= 90:
        return "HEAVY"
    else:
        return "SEVERE"

def simulate_train_delay(
    train_number: str,
    train_type: str,
    scenario_id: str = "NORMAL",
    seed: int = 42
) -> Tuple[int, str]:
    """
    Simulates delay based on train type, current scenario, and deterministic seed.
    Realistic distributions:
    - High priority (Vande Bharat / Shatabdi): 85% on time, 15% minor delay
    - Superfast (GT Express / Tamil Nadu): 70% on time, 20% minor, 10% moderate
    - Mail/Express (Punjab Mail): 60% on time, 25% minor, 15% moderate/heavy
    - Heavy delay scenario: targeted trains incur 120-240 mins delay
    """
    rng = random.Random(f"{seed}_{train_number}_{scenario_id}")

    if scenario_id == "HEAVY_DELAY":
        # Specific scenario injection: GT Express (12615) delayed by +3h55m (235 min)
        # Punjab Mail (12137) delayed by +1h45m (105 min)
        if train_number in ["12615", "12616"]:
            delay = 235 # +3h55m
            return delay, compute_delay_category(delay)
        elif train_number in ["12137", "12138"]:
            delay = 105 # +1h45m
            return delay, compute_delay_category(delay)

    # Standard distribution
    roll = rng.random()
    if train_type in ["VANDE_BHARAT", "SHATABDI"]:
        if roll < 0.82:
            delay = rng.randint(0, 4)
        elif roll < 0.95:
            delay = rng.randint(6, 18)
        else:
            delay = rng.randint(20, 35)
    elif train_type == "SUPERFAST":
        if roll < 0.70:
            delay = rng.randint(0, 5)
        elif roll < 0.90:
            delay = rng.randint(8, 24)
        elif roll < 0.97:
            delay = rng.randint(28, 55)
        else:
            delay = rng.randint(60, 95)
    elif train_type == "MAIL_EXPRESS":
        if roll < 0.60:
            delay = rng.randint(0, 5)
        elif roll < 0.85:
            delay = rng.randint(10, 30)
        else:
            delay = rng.randint(35, 75)
    else: # FREIGHT or PASSENGER
        if roll < 0.40:
            delay = rng.randint(0, 15)
        elif roll < 0.75:
            delay = rng.randint(20, 50)
        else:
            delay = rng.randint(55, 120)

    return delay, compute_delay_category(delay)
