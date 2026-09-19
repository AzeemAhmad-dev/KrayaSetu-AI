import React from "react";
import { ProvenanceBadge } from "../common/ProvenanceBadge";
import {
  Train,
  ShieldAlert,
  Zap,
  Gauge,
  Ruler,
  Info,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface StationElementInspectorProps {
  element: any | null;
  stationName: string;
  stationCode: string;
}

export const StationElementInspector: React.FC<StationElementInspectorProps> = ({
  element,
  stationName,
  stationCode,
}) => {
  if (!element) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col items-center justify-center text-center min-h-[160px]">
        <Info className="w-8 h-8 text-slate-300 mb-2" />
        <h3 className="font-bold text-slate-700 text-sm">No Track Element Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Click any track line, platform canopy, turnout, or train marker on the schematic map above to inspect live interlocking telemetry and occupancy details.
        </p>
      </div>
    );
  }

  const isTurnout = !!element.isTurnout;
  const isOccupied = element.operationalStatus === "OCCUPIED";
  const isMaintenance = element.operationalStatus === "MAINTENANCE" || element.operationalStatus === "BLOCKED";
  const occupant = element.occupant;
  const block = element.activeBlock;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      {/* Inspector Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-[#0b2545] text-white">
            {element.id}
          </span>
          <span className="font-bold text-slate-900 text-sm sm:text-base">
            {element.name}
          </span>
          <span className="text-xs font-mono text-slate-500 font-semibold">
            ({stationName} - {stationCode})
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Badge */}
          {isOccupied ? (
            <span className="px-2.5 py-1 rounded text-xs font-bold font-mono bg-red-100 text-red-800 border border-red-300 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span>OCCUPIED</span>
            </span>
          ) : isMaintenance ? (
            <span className="px-2.5 py-1 rounded text-xs font-bold font-mono bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>TRAFFIC BLOCK</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded text-xs font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>LINE CLEAR</span>
            </span>
          )}

          <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
        </div>
      </div>

      {/* Main Inspection Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Track Classification */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
          <div className="text-xs text-slate-500 uppercase tracking-wider flex items-center space-x-1 mb-1 font-semibold">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Infrastructure Type</span>
          </div>
          <div className="font-bold text-slate-900 text-base">
            {element.trackType ? element.trackType.replace("_", " ") : isTurnout ? `TURNOUT (${element.type})` : "TRACK"}
          </div>
          {element.platformNumber && (
            <div className="text-xs text-sky-700 font-semibold mt-1">
              Platform {element.platformNumber} ({element.platformSide || "Island"} Platform)
            </div>
          )}
        </div>

        {/* Metric 2: Speed & Limits */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
          <div className="text-xs text-slate-500 uppercase tracking-wider flex items-center space-x-1 mb-1 font-semibold">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <span>Permitted Speed</span>
          </div>
          <div className="font-bold text-slate-900 text-base font-mono">
            {Math.min(element.speedLimitKmph || (isTurnout ? 30 : 50), 60)} km/h
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Booked Sectional Ceiling
          </div>
        </div>

        {/* Metric 3: Clear Standing Room / Length */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
          <div className="text-xs text-slate-500 uppercase tracking-wider flex items-center space-x-1 mb-1 font-semibold">
            <Ruler className="w-3.5 h-3.5 text-slate-400" />
            <span>Berthing Length (CSR)</span>
          </div>
          <div className="font-bold text-slate-900 text-base font-mono">
            {element.lengthMeters ? `${element.lengthMeters} meters` : "Standard 24+ Coach"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Full rake capacity
          </div>
        </div>

        {/* Metric 4: Electrification / Traction */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
          <div className="text-xs text-slate-500 uppercase tracking-wider flex items-center space-x-1 mb-1 font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Traction & Power</span>
          </div>
          <div className="font-bold text-slate-900 text-base">
            {element.electrified !== false ? "25 kV AC OHE" : "Non-Electrified Siding"}
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>OHE Energized (TRD Normal)</span>
          </div>
        </div>
      </div>

      {/* Occupant / Train Details (if occupied) */}
      {isOccupied && occupant && (
        <div className="mx-4 mb-4 p-3.5 bg-sky-50/70 rounded-lg border border-sky-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-900 text-white">
              <Train className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-sky-950 text-sm">
                  {occupant.train_number}
                </span>
                <span className="text-slate-800 font-semibold text-xs">
                  {occupant.train_name}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-sky-200 text-sky-900 font-mono">
                  {occupant.train_type || "EXPRESS"}
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1 flex items-center space-x-2 font-mono font-medium">
                <span>Speed: {occupant.speed || 0} km/h</span>
                <span>·</span>
                <span>Berth Status: {occupant.status || "At Platform"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            <span className="text-xs text-slate-500 font-mono font-medium">Route Locked by RRI</span>
          </div>
        </div>
      )}

      {/* Maintenance Block Details (if blocked) */}
      {isMaintenance && block && (
        <div className="mx-4 mb-4 p-3.5 bg-amber-50 rounded-lg border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-700 text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-amber-950 text-sm">
                  Block {block.id}
                </span>
                <span className="text-xs font-semibold text-amber-900">
                  {block.work_type || "Routine Maintenance"}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-200 text-amber-900 font-mono">
                  {block.department || "P.Way"}
                </span>
              </div>
              <div className="text-xs text-amber-900 mt-1 font-mono font-medium">
                Slot: {block.start_time} - {block.end_time} · Location: KM {block.location_km} · Priority: {block.priority || "NORMAL"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Track Notes / Operational Guidance */}
      {element.notes && (
        <div className="px-4 pb-3 text-xs text-slate-500 font-mono flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>Operational Note: {element.notes}</span>
        </div>
      )}
    </div>
  );
};
