"""
Dataset Identity & Fingerprinting Service for KrayaSetu AI
Smart India Hackathon Problem Statement 26027

Provides deterministic, lightweight dataset fingerprinting derived directly
from the authoritative SQLite database.

Invariants:
- Deterministic: Same DB state always produces the exact same fingerprint.
- Lightweight: No secondary database or external state store.
- Traceable: Provenance chain from SQLite -> Endpoints -> UI -> CP-SAT -> Proposals.
"""

import hashlib
import json
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.maintenance import Block, MaintenanceTask

logger = logging.getLogger("krayasetu.dataset_identity")

def compute_dataset_fingerprint(db: Session) -> str:
    """
    Computes a deterministic 12-character SHA-256 fingerprint derived directly
    from all canonical blocks and maintenance tasks in the SQLite database.

    Fields included:
    - Block: id, block_type, corridor_id, section_id, track_name, location_km, status
    - MaintenanceTask: id, block_id, corridor_id, section_id, priority, severity, work_type_id
    """
    blocks = (
        db.query(Block)
        .order_by(Block.id)
        .all()
    )
    tasks = (
        db.query(MaintenanceTask)
        .order_by(MaintenanceTask.id)
        .all()
    )

    hasher = hashlib.sha256()

    # Block signature
    for b in blocks:
        block_sig = f"B:{b.id}:{b.block_type}:{b.corridor_id}:{b.section_id}:{b.track_name}:{b.location_km:.2f}:{b.status}"
        hasher.update(block_sig.encode("utf-8"))

    # Task signature
    for t in tasks:
        task_sig = f"T:{t.id}:{t.block_id}:{t.corridor_id}:{t.section_id}:{t.priority}:{t.severity}:{t.work_type_id}"
        hasher.update(task_sig.encode("utf-8"))

    hex_digest = hasher.hexdigest().upper()
    return f"CANON-{hex_digest[:8]}"

def log_canonical_generation(source: str, fingerprint: str, demo_seed: Optional[int] = None, blocks_count: int = 50):
    """
    Structured development log for canonical generation events per Section 27.
    """
    print(
        f"[CANONICAL-GENERATE] source={source} "
        f"fingerprint={fingerprint} "
        f"demo_seed={demo_seed} "
        f"blocks={blocks_count}"
    )
