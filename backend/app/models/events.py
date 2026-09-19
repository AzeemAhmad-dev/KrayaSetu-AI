from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime
from datetime import datetime
from backend.app.database import Base

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(String(50), primary_key=True) # NORMAL, HEAVY_DELAY, FREIGHT_HEAVY, MAINTENANCE_DISRUPTION, BLOCK_CONFLICT
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    active = Column(Boolean, default=False)
    parameters = Column(Text, nullable=True) # JSON config
    updated_at = Column(DateTime, default=datetime.utcnow)


class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    actor = Column(String(100), nullable=False) # e.g. "AI System", "Section Controller - BPL", "Station Master - Bhopal"
    role = Column(String(50), nullable=False) # SYSTEM, CONTROLLER, STATION_MASTER, ENGINEER
    entity = Column(String(50), nullable=False) # FAULT, BLOCK, TRAIN, SCENARIO, RESTRICTION
    entity_id = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    previous_state = Column(String(50), nullable=True)
    new_state = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    provenance = Column(String(50), default="SIMULATED") # REAL_PUBLIC, SIMULATED, SYNTHETIC, DERIVED
