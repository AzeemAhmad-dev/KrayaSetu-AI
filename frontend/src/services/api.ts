import {
  DivisionSummary,
  CorridorData,
  TrainMovementData,
  FaultObservationData,
  BlockData,
  ScenarioData,
  EventLogData
} from "../types";

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "/api" : "http://localhost:8000")).trim().replace(/\/+$/, "");
export const API_BASE = rawApiUrl === "/api" || rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errData.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  getNetworkSummary: () => request<DivisionSummary>("/summary"),
  getCorridors: () => request<CorridorData[]>("/corridors"),
  getCorridorDetail: (id: string) => request<any>(`/corridors/${id}`),
  getStations: (majorOnly: boolean = false) => request<any[]>(`/stations?major_only=${majorOnly}`),
  getStationMaster: (code: string) => request<any>(`/stations/${code}`),
  getTrains: (serviceType?: string) => request<any[]>(`/trains${serviceType ? `?service_type=${serviceType}` : ""}`),
  getTrainMovements: () => request<TrainMovementData[]>("/train-movements"),
  getTrainDetail: (number: string) => request<any>(`/trains/${number}`),
  getTrainLive: (number: string) => request<any>(`/trains/${number}/live`),

  getFaults: (status?: string, departmentId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (departmentId) params.append("department_id", departmentId);
    const qs = params.toString();
    return request<FaultObservationData[]>(`/maintenance/faults${qs ? `?${qs}` : ""}`);
  },
  createFault: (data: any) => request<any>("/maintenance/faults", { method: "POST", body: JSON.stringify(data) }),
  assessFault: (faultId: string) => request<any>("/maintenance/assess", { method: "POST", body: JSON.stringify({ fault_id: faultId }) }),
  submitHumanDecision: (data: any) => request<any>("/maintenance/approve", { method: "POST", body: JSON.stringify(data) }),
  getMaintenanceTasks: () => request<any[]>("/maintenance/tasks"),
  completeTask: (taskId: string, data?: { completed_by?: string; notes?: string }) =>
    request<any>(`/maintenance/tasks/${taskId}/complete`, { method: "POST", body: JSON.stringify(data || {}) }),
  updateTaskStatus: (taskId: string, status: string, notes?: string, actor?: string) =>
    request<any>(`/maintenance/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status, notes, actor }) }),
  getCompletedTasks: (params?: { corridor_id?: string; station_code?: string; department_id?: string; period?: string; reference_date?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.corridor_id) q.append("corridor_id", params.corridor_id);
    if (params?.station_code) q.append("station_code", params.station_code);
    if (params?.department_id) q.append("department_id", params.department_id);
    if (params?.period) q.append("period", params.period);
    if (params?.reference_date) q.append("reference_date", params.reference_date);
    if (params?.status) q.append("status", params.status);
    const qs = q.toString();
    return request<any[]>(`/maintenance/completed-tasks${qs ? `?${qs}` : ""}`);
  },
  getPlannedActivities: (params?: { department_id?: string; cadence?: string }) => {
    const q = new URLSearchParams();
    if (params?.department_id) q.append("department_id", params.department_id);
    if (params?.cadence) q.append("cadence", params.cadence);
    const qs = q.toString();
    return request<any[]>(`/maintenance/planned-activities${qs ? `?${qs}` : ""}`);
  },
  updatePlannedActivityStatus: (activityId: string, status: string, notes?: string, actor?: string) =>
    request<any>(`/maintenance/planned-activities/${activityId}/status`, { method: "PATCH", body: JSON.stringify({ status, notes, actor }) }),
  getEquipment: () => request<any[]>("/maintenance/equipment"),

  getBlocks: (status?: string, corridorId?: string, departmentId?: string, sectionId?: string, blockType?: string, operationalOnly?: boolean, ledgerOnly?: boolean) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (corridorId) params.append("corridor_id", corridorId);
    if (departmentId) params.append("department_id", departmentId);
    if (sectionId) params.append("section_id", sectionId);
    if (blockType) params.append("block_type", blockType);
    if (operationalOnly) params.append("operational_only", "true");
    if (ledgerOnly) params.append("ledger_only", "true");
    const qs = params.toString();
    return request<BlockData[]>(`/blocks${qs ? `?${qs}` : ""}`);
  },
  getBlocksCoordination: () => request<any>("/blocks/coordination"),
  checkBlockConflict: (data: any) => request<any>("/blocks/check-conflict", { method: "POST", body: JSON.stringify(data) }),
  proposeBlock: (data: any) => request<any>("/blocks/propose", { method: "POST", body: JSON.stringify(data) }),
  proposeBlockFromSchedule: (data: any) => request<any>("/blocks/propose-from-schedule", { method: "POST", body: JSON.stringify(data) }),
  optimizeBlocks: (data: any) => request<any>("/blocks/optimize", { method: "POST", body: JSON.stringify(data) }),
  approveBlock: (data: any) => request<any>("/blocks/approve", { method: "POST", body: JSON.stringify(data) }),
  submitBlockForApproval: (blockId: string, data?: any) => request<any>(`/blocks/${blockId}/submit`, { method: "POST", body: JSON.stringify(data || {}) }),
  approveBlockDirect: (blockId: string, data?: any) => request<any>(`/blocks/${blockId}/approve`, { method: "POST", body: JSON.stringify(data || {}) }),
  rejectBlockDirect: (blockId: string, data?: any) => request<any>(`/blocks/${blockId}/reject`, { method: "POST", body: JSON.stringify(data || {}) }),
  selectBlockDirect: (blockId: string, data?: any) => request<any>(`/blocks/${blockId}/select`, { method: "POST", body: JSON.stringify(data || {}) }),
  replanBlockDirect: (blockId: string, data?: any) => request<any>(`/blocks/${blockId}/replan`, { method: "POST", body: JSON.stringify(data || {}) }),
  deferBlockDirect: (blockId: string, data?: any) => request<any>(`/blocks/${blockId}/defer`, { method: "POST", body: JSON.stringify(data || {}) }),

  getBlock: (blockId: string) => request<any>(`/blocks/${blockId}`),
  getBlockExplanation: (blockId: string) => request<any>(`/blocks/${blockId}/explanation`),
  getTaskPriorityExplanation: (taskId: string) => request<any>(`/planning/priority-explanation/${taskId}`),
  getCandidateExplanation: (candidateId: string) => request<any>(`/planning/candidates/${candidateId}/explanation`),
  getCandidateBlocks: (corridorId?: string) => request<any>(`/planning/candidates${corridorId ? `?corridor_id=${corridorId}` : ""}`),
  getPlanningDashboardSummary: () => request<any>("/planning/dashboard-summary"),
  resetDemoBlocks: () => request<any>("/blocks/demo-reset", { method: "POST" }),
  regenerateCanonicalBlocks: (seed?: number) =>
    request<{
      status: string;
      demo_seed?: number;
      dataset_fingerprint?: string;
      canonical_generation_id?: string;
      total_blocks: number;
      distribution: Record<string, number>;
      total_tasks: number;
      message: string;
    }>(`/blocks/regenerate-canonical${seed !== undefined ? `?seed=${seed}` : ""}`, { method: "POST" }),
  getTaskPriorities: (corridorId?: string, priority?: string, limit: number = 1000) =>
    request<any>(`/planning/priorities?limit=${limit}${corridorId ? `&corridor_id=${corridorId}` : ""}${priority ? `&priority=${priority}` : ""}`),

  getScenarios: () => request<{ active_scenario_id: string; active_scenario_name: string; scenarios: ScenarioData[] }>("/scenarios"),
  applyScenario: (scenarioId: string) => request<any>("/scenarios/apply", { method: "POST", body: JSON.stringify({ scenario_id: scenarioId }) }),

  getEvents: (limit: number = 100, entity?: string, departmentId?: string) =>
    request<EventLogData[]>(`/events?limit=${limit}${entity ? `&entity=${entity}` : ""}${departmentId ? `&department_id=${departmentId}` : ""}`),

  getBaselineComparison: (corridorId?: string, weekStart?: string) => {
    const q = new URLSearchParams();
    if (corridorId && corridorId !== "ALL") q.append("corridor_id", corridorId);
    if (weekStart) q.append("week_start", weekStart);
    const qs = q.toString();
    return request<any>(`/analytics/baseline-comparison${qs ? `?${qs}` : ""}`);
  },
};
