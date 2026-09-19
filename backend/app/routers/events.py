from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.events import EventLog

router = APIRouter(tags=["Events"])

@router.get("/events")
def get_events(limit: int = 100, entity: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(EventLog)
    if entity:
        query = query.filter(EventLog.entity == entity.upper())
    events = query.order_by(EventLog.timestamp.desc()).limit(limit).all()

    return [
        {
            "id": e.id,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "actor": e.actor,
            "role": e.role,
            "entity": e.entity,
            "entity_id": e.entity_id,
            "action": e.action,
            "previous_state": e.previous_state,
            "new_state": e.new_state,
            "reason": e.reason,
            "provenance": e.provenance
        }
        for e in events
    ]
