from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.events import EventLog

def log_event(
    db: Session,
    actor: str,
    role: str,
    entity: str,
    entity_id: str,
    action: str,
    previous_state: str = None,
    new_state: str = "COMPLETED",
    reason: str = None,
    provenance: str = "SIMULATED"
) -> EventLog:
    """Logs an operational event with strict provenance tracking."""
    event = EventLog(
        timestamp=datetime.utcnow(),
        actor=actor,
        role=role,
        entity=entity,
        entity_id=entity_id,
        action=action,
        previous_state=previous_state,
        new_state=new_state,
        reason=reason,
        provenance=provenance
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
