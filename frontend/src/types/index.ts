export type ProvenanceType = "REAL_PUBLIC" | "SIMULATED" | "SYNTHETIC" | "DERIVED" | "ESTIMATED";

export interface DivisionSummary {
  division: {
    id: string;
    name: string;
    zone: string;
    headquarters: string;
    established: string;
  };
  statistics: {
    total_corridors: number;
    total_researched_locations: number;
    major_stations_count: number;
    active_blocks_count: number;
    active_restrictions_count: number;
  };
  provenance: Record<string, string>;
}

export interface StationLocation {
  code: string;
  name: string;
  category: string;
  km: number;
  platforms: number;
  loop_lines: number;
  sidings: number;
  infra_status: string;
  is_major: boolean;
  sequence?: number;
}

export interface CorridorData {
  id: string;
  name: string;
  code: string;
  type: string;
  track_configuration: string;
  electrified: boolean;
  voltage: string;
  max_permissible_speed_kmph: number;
  total_distance_km: number;
  description: string;
  major_stations: StationLocation[];
  total_locations: number;
  active_trains_count: number;
  blocks_count: number;
  provenance: string;
}

export interface TrainMovementData {
  train_number: string;
  train_name: string;
  train_type: string;
  service_type: string;
  origin: string;
  destination: string;
  direction: "UP" | "DOWN";
  priority: number;
  current_location: string;
  current_station_code?: string;
  current_section_id?: string;
  current_track: string;
  current_km: number;
  speed_kmph: number;
  scheduled_time: string;
  estimated_time: string;
  delay_minutes: number;
  delay_category: "ON_TIME" | "MINOR" | "MODERATE" | "HEAVY" | "SEVERE";
  status: string;
  hold_location?: string;
  hold_reason?: string;
  hold_start_time?: string;
  hold_end_time?: string;
  cargo_type?: string;
  source_type: ProvenanceType;
  train_source_type: ProvenanceType;
  updated_at?: string;
}

export interface FaultObservationData {
  id: string;
  reporter: string;
  reporter_role: string;
  timestamp: string;
  train_reference?: string;
  corridor_id: string;
  section_id?: string;
  station_code?: string;
  track_name: string;
  location_km: number;
  location_description: string;
  fault_title: string;
  description: string;
  department_id: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: string;
  ai_assessed: boolean;
  ai_confidence: number;
  ai_recommended_severity?: string;
  ai_recommended_urgency?: string;
  ai_recommended_protection?: string;
  ai_recommended_mode?: string;
  ai_explanation?: string;
  human_status: "PENDING" | "CONFIRMED" | "OVERRIDDEN" | "REJECTED" | "ESCALATED";
  human_decision_by?: string;
  human_decision_at?: string;
  human_notes?: string;
  source_type: string;
}

export interface BlockData {
  id: string;
  task_id?: string;
  task_title?: string;
  task_priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  department_id?: string;
  departments?: string[];
  is_multi_department?: boolean;
  participating_departments?: string;
  work_type_name?: string;
  corridor_id: string;
  corridor_name?: string;
  section_id?: string;
  section_name?: string;
  from_station_code?: string;
  to_station_code?: string;
  station_codes?: string[];
  date?: string;
  scheduled_date?: string;
  month?: string;
  week?: string;
  track_name: string;
  location_km: number;
  requested_start_time: string;
  requested_end_time: string;
  duration_mins: number;
  status: "PROPOSED" | "PENDING_APPROVAL" | "APPROVED" | "SANCTIONED" | "SELECTED" | "SCHEDULED" | "REJECTED" | "DEFERRED" | "RE_PLAN" | "PLANNED" | "ACTIVE" | "COMPLETED" | "UNAVAILABLE" | "AVAILABLE" | "RESCHEDULED";
  conflict_status: "NO CONFLICT" | "CONFLICT" | "POTENTIAL CONFLICT" | "HIGH OPERATIONAL RISK";
  conflict_summary: string;
  conflicting_trains: any[];
  protection_type: string;
  power_isolation_required: boolean;
  trd_coordination_required?: boolean;
  assigned_machine?: string;
  proposed_by: string;
  approval_status: string;
  approved_by?: string;
  approval_notes?: string;
  block_type?: "RULING" | "PLANNED" | "EMERGENT" | "SHADOW" | string;
  planning_origin?: string;
  planning_date?: string;
  execution_date?: string;
  tasks?: any[];
  bundled_tasks?: any[];
  created_at?: string;
}

export interface ScenarioData {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface EventLogData {
  id: number;
  timestamp: string;
  actor: string;
  role: string;
  entity: string;
  entity_id: string;
  action: string;
  previous_state?: string;
  new_state: string;
  reason?: string;
  provenance: ProvenanceType;
}

export interface UserRole {
  id: string;
  title: string;
  department: string;
  stationOrCorridor: string;
}

export interface PilotActivityLog {
  id: string;
  timestamp: string;
  corridor_id: string;
  corridor_name: string;
  station_code?: string;
  station_name?: string;
  nearby_location: string;
  section_point: string;
  km_chainage: string;
  primary_observation: string;
  secondary_observation?: string;
  departments: ("PWAY" | "SNT" | "TRD")[];
  target_systems: ("TMS" | "SMMS" | "TDMS")[];
  status: "LOGGED_PENDING_REVIEW" | "INSPECTION_DISPATCHED" | "ACKNOWLEDGED";
  logged_by: string;
}

export type TaskWorkflowStatus =
  | "Planned"
  | "Awaiting COBO Sanction"
  | "Block Approved"
  | "Team Going"
  | "Work Started"
  | "Completed"
  | "Rescheduled";

export interface DepartmentTask {
  id: string;
  department: "PWAY" | "SNT" | "TRD";
  cadence: "CURRENT" | "WEEKLY" | "MONTHLY";
  title: string;
  sectionOrLocation: string;
  targetDate: string;
  priority: "ROUTINE" | "PRIORITY" | "SAFETY_CRITICAL";
  assignedGangOrSupervisor: string;
  estimatedDurationHours?: number;
  description: string;
  status: TaskWorkflowStatus;
  rescheduleReason?: string;
  createdAt: string;
  createdBy: string;
  backendBlockStatus?: string;
  isCoboApproved?: boolean;
  backendTaskId?: string;
  completed_at?: string;
}

export type ProblemWorkflowStatus =
  | "Issue Logged"
  | "Problem Logged"
  | "Reviewed"
  | "Block Requested"
  | "Block Approved"
  | "Team Going"
  | "Work Started"
  | "Completed"
  | "Rescheduled";

export interface DepartmentProblem {
  id: string;
  department: "PWAY" | "SNT" | "TRD";
  title: string;
  locationKmOrSection: string;
  stationCode?: string;
  exactKm?: number;
  trackName?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  priority?: string;
  category: string;
  observation: string;
  status: ProblemWorkflowStatus;
  rescheduleReason?: string;
  loggedBy: string;
  createdAt: string;
  relatedTaskId?: string;
  relatedTaskStatus?: string;
  relatedBlockId?: string;
  relatedBlockStatus?: string;
  completionTime?: string;
  resolutionNotes?: string;
}

export interface StationBlock {
  id: string;
  stationCode: string;
  cadence: "WEEKLY" | "MONTHLY";
  title: string;
  lineOrPlatform: string;
  department: "PWAY" | "SNT" | "TRD" | "JOINT";
  blockType: "TRAFFIC_BLOCK" | "POWER_BLOCK" | "COMBINED_BLOCK";
  scheduledDate: string;
  durationMinutes: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  assignedBy?: string;
  remarks?: string;
}

export interface StationIssueBlockRequest {
  id: string;
  stationCode: string;
  title: string;
  affectedLineOrAsset: string;
  department: "PWAY" | "SNT" | "TRD" | "JOINT";
  urgency: "ROUTINE" | "PRIORITY" | "URGENT" | "SAFETY_HAZARD";
  blockTypeRequired: "TRAFFIC_BLOCK" | "POWER_BLOCK" | "COMBINED_BLOCK" | "NONE";
  requestedDurationMinutes: number;
  requestedWindow?: string;
  description: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "BLOCK_REQUESTED" | "RESOLVED";
  loggedBy: string;
  createdAt: string;
}

export type CorridorBlockType = "DAILY" | "WEEKLY" | "MONTHLY" | "CRITICAL" | "RULING" | "EMERGENT" | "SHADOW" | "PLANNED";
export type CorridorBlockStatus = "PLANNED" | "PROPOSED" | "PENDING_APPROVAL" | "APPROVED" | "SANCTIONED" | "SELECTED" | "IN_PROGRESS" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "REJECTED" | "RE_PLAN" | "DEFERRED";

export interface CorridorBlock {
  id: string;
  corridorId: string;
  type: CorridorBlockType;
  rawBlockType?: string;
  title: string;
  sectionOrStation: string;
  lineOrTrack: string;
  locationKm?: number;
  department: "PWAY" | "SNT" | "TRD" | "JOINT";
  participatingDepts?: string;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  timeWindow?: string;
  durationMinutes: number;
  status: CorridorBlockStatus;
  description: string;
  isCritical?: boolean;
  associatedIssueId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  approvalNotes?: string;
}

export interface CorridorIssue {
  id: string;
  corridorId: string;
  title: string;
  sectionOrLocation: string;
  department: "PWAY" | "SNT" | "TRD" | "JOINT";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  blockRequired: boolean;
  blockTypeRequired?: CorridorBlockType;
  requestedDurationMinutes?: number;
  description: string;
  status: "OPEN" | "BLOCK_SCHEDULED" | "RESOLVED";
  associatedBlockId?: string;
  loggedBy: string;
  createdAt: string;
}


