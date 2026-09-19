from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(30), primary_key=True) # PWAY, TRD, SNT, OPERATIONS
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)

    work_types = relationship("WorkType", back_populates="department")
    equipment = relationship("Equipment", back_populates="department")
    crews = relationship("Crew", back_populates="department")


class WorkType(Base):
    __tablename__ = "work_types"

    id = Column(String(50), primary_key=True)
    department_id = Column(String(30), ForeignKey("departments.id"))
    name = Column(String(120), nullable=False)
    compatible_modes = Column(String(120), default="FULL_BLOCK,SHORT_BLOCK") # comma-separated
    default_protection = Column(String(50), default="TRAFFIC_BLOCK")
    default_duration_mins = Column(Integer, default=120)
    requires_power_isolation = Column(Boolean, default=False)
    requires_track_occupation = Column(Boolean, default=True)
    compatible_with_train_movement = Column(Boolean, default=False)

    department = relationship("Department", back_populates="work_types")


class Crew(Base):
    __tablename__ = "crews"

    id = Column(String(50), primary_key=True)
    name = Column(String(120), nullable=False)
    code = Column(String(50), nullable=True)
    department_id = Column(String(30), ForeignKey("departments.id"), nullable=False)
    crew_type = Column(String(50), default="TRACK_MAINTENANCE_GANG") # TRACK_GANG, OHE_GANG, SNT_GANG, USFD_TEAM, TAMPING_CREW
    gang_size = Column(Integer, default=10)
    base_station_code = Column(String(20), ForeignKey("stations.code"), nullable=True)
    contact_supervisor = Column(String(100), nullable=True)
    max_duty_hours = Column(Integer, default=8) # HOER statutory limit
    active = Column(Boolean, default=True)

    department = relationship("Department", back_populates="crews")
    assigned_tasks = relationship("MaintenanceTask", back_populates="crew")


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(String(50), primary_key=True)
    department_id = Column(String(30), ForeignKey("departments.id"))
    name = Column(String(120), nullable=False)
    type = Column(String(50), nullable=False) # CSM_TAMPER, UNIMAT, BCM, USFD_EQUIPMENT, TOWER_WAGON, TRACK_GANG, SNT_GANG
    base_station_code = Column(String(20), ForeignKey("stations.code"))
    status = Column(String(30), default="AVAILABLE") # AVAILABLE, ASSIGNED, UNDER_MAINTENANCE

    department = relationship("Department", back_populates="equipment")


class FaultObservation(Base):
    __tablename__ = "fault_observations"

    id = Column(String(50), primary_key=True)
    reporter = Column(String(100), nullable=False)
    reporter_role = Column(String(50), default="LOCO_PILOT") # LOCO_PILOT, TRACK_MAN, STATION_MASTER, OHE_INSPECTOR, SNT_ENGINEER
    timestamp = Column(DateTime, default=datetime.utcnow)
    train_reference = Column(String(20), nullable=True)
    corridor_id = Column(String(30), ForeignKey("corridors.id"))
    section_id = Column(String(50), ForeignKey("sections.id"), nullable=True)
    track_name = Column(String(50), default="DOWN_MAIN")
    location_km = Column(Float, nullable=False)
    location_description = Column(String(200), nullable=False)

    fault_title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    department_id = Column(String(30), ForeignKey("departments.id"))
    evidence = Column(String(255), nullable=True)

    # Lifecycle: Observation -> AI Assessment -> Human Review -> Task -> Scheduled -> Block Requested -> Block Approved -> Team Dispatched -> Work Started -> Completed
    status = Column(String(50), default="OBSERVATION")
    severity = Column(String(30), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL

    # AI Decision Support fields
    ai_assessed = Column(Boolean, default=False)
    ai_confidence = Column(Float, default=0.0) # 0.0 to 1.0
    ai_recommended_severity = Column(String(30), nullable=True)
    ai_recommended_urgency = Column(String(30), nullable=True)
    ai_recommended_protection = Column(String(50), nullable=True)
    ai_recommended_mode = Column(String(50), nullable=True)
    ai_explanation = Column(Text, nullable=True)

    # Human Approval
    human_status = Column(String(30), default="PENDING") # PENDING, CONFIRMED, OVERRIDDEN, REJECTED, ESCALATED
    human_decision_by = Column(String(100), nullable=True)
    human_decision_at = Column(DateTime, nullable=True)
    human_notes = Column(Text, nullable=True)

    source_type = Column(String(30), default="SYNTHETIC") # REAL_PUBLIC, SYNTHETIC, FIELD_REPORT

    tasks = relationship("MaintenanceTask", back_populates="fault")


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(String(50), primary_key=True)
    fault_id = Column(String(50), ForeignKey("fault_observations.id"), nullable=True)
    asset_id = Column(String(50), ForeignKey("assets.id"), nullable=True)
    department_id = Column(String(30), ForeignKey("departments.id"))
    work_type_id = Column(String(50), ForeignKey("work_types.id"))
    corridor_id = Column(String(30), ForeignKey("corridors.id"))
    section_id = Column(String(50), ForeignKey("sections.id"), nullable=True)
    track_name = Column(String(50), default="DOWN_MAIN")
    location_km = Column(Float, nullable=False)

    severity = Column(String(30), default="MEDIUM")
    priority = Column(String(20), default="P2") # P1 (Urgent/Immediate), P2 (High), P3 (Routine), P4 (Deferrable)
    duration_mins = Column(Integer, default=120)
    assigned_crew = Column(String(100), default="Track Maintenance Gang #4")
    crew_id = Column(String(50), ForeignKey("crews.id"), nullable=True)
    equipment_id = Column(String(50), ForeignKey("equipment.id"), nullable=True)

    operational_impact = Column(String(50), default="MEDIUM_SPEED_RESTRICTION")
    required_protection = Column(String(50), default="TRAFFIC_BLOCK")
    # Protection: NO_SPECIAL_PROTECTION, TRAFFIC_CAUTION, TRAFFIC_BLOCK, POWER_ISOLATION, TRAFFIC_AND_POWER_ISOLATION, EMERGENCY_PROTECTION

    maintenance_mode = Column(String(50), default="FULL_BLOCK")
    # Mode: FULL_BLOCK, SHORT_BLOCK, GAP_WORK, TRAFFIC_CAUTION, EMERGENCY

    requires_power_isolation = Column(Boolean, default=False)
    requires_track_occupation = Column(Boolean, default=True)
    compatible_with_train_movement = Column(Boolean, default=False)

    status = Column(String(50), default="PENDING")
    # Status: PENDING, PROPOSED, SCHEDULED, IN_PROGRESS, COMPLETED, RESCHEDULED, CANCELLED

    source_type = Column(String(30), default="SYNTHETIC")

    fault = relationship("FaultObservation", back_populates="tasks")
    crew = relationship("Crew", back_populates="assigned_tasks")
    blocks = relationship("Block", back_populates="task")


class Block(Base):
    __tablename__ = "blocks"

    id = Column(String(50), primary_key=True)
    task_id = Column(String(50), ForeignKey("maintenance_tasks.id"))
    corridor_id = Column(String(30), ForeignKey("corridors.id"))
    section_id = Column(String(50), ForeignKey("sections.id"))
    track_name = Column(String(50), default="DOWN_MAIN")
    location_km = Column(Float, nullable=False)

    requested_start_time = Column(String(10), nullable=False) # "12:00"
    requested_end_time = Column(String(10), nullable=False) # "14:00"
    duration_mins = Column(Integer, default=120)

    # Block states: AVAILABLE, UNAVAILABLE, PLANNED, ACTIVE, COMPLETED
    status = Column(String(30), default="PLANNED")

    # Conflict Evaluation: CONFLICT, NO CONFLICT, POTENTIAL CONFLICT, HIGH OPERATIONAL RISK
    conflict_status = Column(String(50), default="NO CONFLICT")
    conflict_summary = Column(Text, nullable=True)
    conflicting_trains = Column(Text, nullable=True) # JSON string list

    protection_type = Column(String(50), default="TRAFFIC_BLOCK")
    power_isolation_required = Column(Boolean, default=False)
    assigned_machine = Column(String(100), nullable=True)

    proposed_by = Column(String(100), default="P.Way Section Engineer")
    approval_status = Column(String(30), default="PENDING") # PENDING, APPROVED, REJECTED, RESCHEDULED
    approved_by = Column(String(100), nullable=True) # e.g. "Divisional Section Controller"
    approval_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("MaintenanceTask", back_populates="blocks")


class OperationalRestriction(Base):
    __tablename__ = "operational_restrictions"

    id = Column(String(50), primary_key=True)
    corridor_id = Column(String(30), ForeignKey("corridors.id"))
    section_id = Column(String(50), ForeignKey("sections.id"))
    track_name = Column(String(50), default="DOWN_MAIN")
    start_km = Column(Float, nullable=False)
    end_km = Column(Float, nullable=False)
    restriction_type = Column(String(50), default="TSR") # TSR (Temporary Speed Restriction), PSR, CAUTION, POWER_NEUTRAL
    speed_limit_kmph = Column(Integer, default=30)
    reason = Column(String(200), nullable=False)
    active = Column(Boolean, default=True)
    issued_at = Column(DateTime, default=datetime.utcnow)
