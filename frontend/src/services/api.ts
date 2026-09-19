import {
  DivisionSummary,
  CorridorData,
  TrainMovementData,
  FaultObservationData,
  BlockData,
  ScenarioData,
  EventLogData
} from "../types";

const API_BASE = "/api";

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

  getFaults: (status?: string) => request<FaultObservationData[]>(`/maintenance/faults${status ? `?status=${status}` : ""}`),
  createFault: (data: any) => request<any>("/maintenance/faults", { method: "POST", body: JSON.stringify(data) }),
  assessFault: (faultId: string) => request<any>("/maintenance/assess", { method: "POST", body: JSON.stringify({ fault_id: faultId }) }),
  submitHumanDecision: (data: any) => request<any>("/maintenance/approve", { method: "POST", body: JSON.stringify(data) }),
  getMaintenanceTasks: () => request<any[]>("/maintenance/tasks"),
  getEquipment: () => request<any[]>("/maintenance/equipment"),

  getBlocks: (status?: string, corridorId?: string, departmentId?: string, sectionId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (corridorId) params.append("corridor_id", corridorId);
    if (departmentId) params.append("department_id", departmentId);
    if (sectionId) params.append("section_id", sectionId);
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
  getTaskPriorities: (corridorId?: string, priority?: string, limit: number = 1000) =>
    request<any>(`/planning/priorities?limit=${limit}${corridorId ? `&corridor_id=${corridorId}` : ""}${priority ? `&priority=${priority}` : ""}`),

  getScenarios: () => request<{ active_scenario_id: string; active_scenario_name: string; scenarios: ScenarioData[] }>("/scenarios"),
  applyScenario: (scenarioId: string) => request<any>("/scenarios/apply", { method: "POST", body: JSON.stringify({ scenario_id: scenarioId }) }),

  getEvents: (limit: number = 100, entity?: string) => request<EventLogData[]>(`/events?limit=${limit}${entity ? `&entity=${entity}` : ""}`),
};
