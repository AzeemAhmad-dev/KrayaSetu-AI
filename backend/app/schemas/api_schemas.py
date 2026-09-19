from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Provenance badges
# REAL_PUBLIC, SIMULATED, SYNTHETIC, DERIVED

class StationBase(BaseModel):
    code: str
    name: str
    corridor_id: str
    category: str
    is_major: bool
    km_chainage: float
    platforms: int
    loop_lines: int
    sidings: int
    infra_status: str

class CorridorBase(BaseModel):
    id: str
    name: str
    code: str
    type: str
    track_configuration: str
    electrified: bool
    voltage: str
    max_permissible_speed_kmph: int
    total_distance_km: float
    description: Optional[str] = None
    stations: Optional[List[StationBase]] = None

class TrainMovementBase(BaseModel):
    train_number: str
    current_location: str
    current_station_code: Optional[str] = None
    current_section_id: Optional[str] = None
    current_track: str
    current_km: float
    direction: str
    speed_kmph: float
    scheduled_time: str
    estimated_time: str
    delay_minutes: int
    delay_category: str
    status: str
    hold_location: Optional[str] = None
    hold_reason: Optional[str] = None
    hold_start_time: Optional[str] = None
    hold_end_time: Optional[str] = None
    source_type: str

class TrainBase(BaseModel):
    train_number: str
    train_id: str
    train_name: str
    train_type: str
    service_type: str
    origin: str
    destination: str
    direction: str
    priority: int
    source_type: str
    cargo_type: Optional[str] = None
    movement: Optional[TrainMovementBase] = None

class FaultCreateRequest(BaseModel):
    reporter: str
    reporter_role: str = "LOCO_PILOT"
    train_reference: Optional[str] = None
    corridor_id: str
    section_id: Optional[str] = None
    station_code: Optional[str] = None
    track_name: str = "DOWN_MAIN"
    location_km: float
    location_description: str
    fault_title: str
    description: str
    department_id: str
    severity: str = "MEDIUM"

class FaultAssessRequest(BaseModel):
    fault_id: str

class HumanDecisionRequest(BaseModel):
    fault_id: str
    decision: str # CONFIRMED, OVERRIDDEN, REJECTED, ESCALATED
    decided_by: str
    override_severity: Optional[str] = None
    override_mode: Optional[str] = None
    override_protection: Optional[str] = None
    notes: Optional[str] = None

class BlockProposalRequest(BaseModel):
    task_id: Optional[str] = None
    bundled_tasks: Optional[List[str]] = None
    departments: Optional[List[str]] = None
    corridor_id: str
    section_id: Optional[str] = None
    track_name: str = "DOWN_MAIN"
    location_km: float
    requested_start_time: str # "12:00"
    requested_end_time: str # "14:00"
    duration_mins: int = 120
    protection_type: str = "TRAFFIC_BLOCK"
    power_isolation_required: bool = False
    assigned_machine: Optional[str] = None
    proposed_by: str = "P.Way Section Engineer"

class BlockApprovalRequest(BaseModel):
    block_id: str
    action: str # APPROVE, REJECT, RESCHEDULE, SELECT, REPLAN
    approved_by: str
    notes: Optional[str] = None

class BlockActionRequest(BaseModel):
    actor: Optional[str] = None
    approved_by: Optional[str] = None
    role: Optional[str] = None
    notes: Optional[str] = None
    reason: Optional[str] = None

class ProposalFromScheduleRequest(BaseModel):
    task_id: Optional[str] = None
    bundled_tasks: Optional[List[str]] = None
    departments: Optional[List[str]] = None
    corridor_id: str
    section_id: Optional[str] = None
    track_name: str = "DOWN_MAIN"
    location_km: float
    requested_start_time: str
    requested_end_time: str
    duration_mins: int = 120
    protection_type: str = "TRAFFIC_BLOCK"
    power_isolation_required: bool = False
    assigned_machine: Optional[str] = None
    proposed_by: str = "CP-SAT Optimizer / Controller"
    auto_submit: bool = False
    candidate_id: Optional[str] = None
    impact_summary: Optional[str] = None

class ScenarioApplyRequest(BaseModel):
    scenario_id: str # NORMAL, HEAVY_DELAY, FREIGHT_HEAVY, MAINTENANCE_DISRUPTION, BLOCK_CONFLICT

class OptimizeRequest(BaseModel):
    corridor_id: Optional[str] = "CORR-01"
    target_tasks: Optional[List[str]] = None
    time_window_start: str = "10:00"
    time_window_end: str = "18:00"
    allow_bundling: bool = True
    max_time_seconds: float = 8.0
    tasks: Optional[List[Dict[str, Any]]] = None
    train_movements: Optional[List[Dict[str, Any]]] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None

class CrewBase(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    department_id: str
    crew_type: str = "TRACK_MAINTENANCE_GANG"
    gang_size: int = 10
    base_station_code: Optional[str] = None
    contact_supervisor: Optional[str] = None
    max_duty_hours: int = 8
    active: bool = True

