/**
 * Client Railway Telemetry Service for KrayaSetu AI
 * Supports live/demo querying, polling, train details and corridor station data.
 */

export interface RailwayHistoricalPoint {
  km: number;
  time: string;
  time_float: number;
  station: string;
  speed: number;
  type: "ARRIVAL" | "DEPARTURE" | "CURRENT_POSITION" | "CURRENT_HALT";
}

export interface RailwayScheduledPoint {
  km: number;
  time: string;
  time_float: number;
  station: string;
  type?: "ARRIVAL" | "DEPARTURE";
}

export interface LiveRailwayTrain {
  trainNumber: string;
  trainName: string;
  trainDisplayName?: string;
  fullName?: string;
  category: "VANDE_BHARAT" | "RAJDHANI_SHATABDI" | "SUPERFAST" | "MAIL_EXPRESS" | "FREIGHT" | "OTHER";
  direction: "UP" | "DOWN";
  currentSpeedKmph: number;
  currentKm: number;
  status: "RUNNING" | "HALTED" | "DELAYED" | "SCHEDULED" | "ARRIVED";
  is_active: boolean;
  previousStation: string;
  nextStation: string;
  latitude: number;
  longitude: number;
  delayMinutes: number;
  entryTimeStr: string;
  entryTimeFloat: number;
  exitTimeStr: string;
  exitTimeFloat: number;
  lastUpdated: string;
  historicalPositions: RailwayHistoricalPoint[];
  scheduledPath: RailwayScheduledPoint[];
}

export interface RailwayApiResponse {
  status: string;
  mode: "LIVE" | "DEMO";
  provider: string;
  synchronized_at: string;
  reference_time: string;
  reference_date?: string;
  is_today?: boolean;
  total_active_trains: number;
  total_trains: number;
  trains: LiveRailwayTrain[];
}

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "/api" : "http://localhost:8000")).trim().replace(/\/+$/, "");
const BASE_URL = rawApiUrl === "/api" || rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`;

export const railwayApi = {
  async getActiveTrains(params?: {
    mode?: "LIVE" | "DEMO";
    category?: string;
    direction?: string;
    search?: string;
    reference_time?: string;
    reference_date?: string;
  }): Promise<RailwayApiResponse> {
    const query = new URLSearchParams();
    if (params?.mode) query.append("mode", params.mode);
    if (params?.category) query.append("category", params.category);
    if (params?.direction) query.append("direction", params.direction);
    if (params?.search) query.append("search", params.search);
    if (params?.reference_time) query.append("reference_time", params.reference_time);
    if (params?.reference_date) query.append("reference_date", params.reference_date);

    const res = await fetch(`${BASE_URL}/railway/active-trains?${query.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch active trains: ${res.statusText}`);
    }
    return res.json();
  },

  async getCorridorStations(): Promise<any> {
    const res = await fetch(`${BASE_URL}/railway/corridor-stations`);
    if (!res.ok) {
      throw new Error(`Failed to fetch corridor stations: ${res.statusText}`);
    }
    return res.json();
  },
};

export const fetchActiveTrains = (params?: any) => railwayApi.getActiveTrains(params);
