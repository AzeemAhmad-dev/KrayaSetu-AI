import React from "react";
import { LiveRailwayTrain } from "../../services/railwayApi";
import { BlockData } from "../../types";
import { TRAIN_CATEGORIES } from "../../data/bhopalRegionConfig";
import { formatDistanceKm } from "../../utils/formatDistance";

interface TrainDetailDrawerProps {
  selectedTrain: LiveRailwayTrain | null;
  selectedBlock: BlockData | null;
  onClose: () => void;
  theme: "vintage" | "dark";
}

export const TrainDetailDrawer: React.FC<TrainDetailDrawerProps> = ({
  selectedTrain,
  selectedBlock,
  onClose,
  theme,
}) => {
  if (!selectedTrain && !selectedBlock) return null;

  const isVintage = theme === "vintage";

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full sm:w-[450px] shadow-2xl z-50 overflow-y-auto border-l transition-transform duration-300 ${
        isVintage
          ? "bg-[#faf6ee] text-[#1c1917] border-[#c9beaa]"
          : "bg-[#0b1120] text-slate-100 border-slate-800"
      }`}
    >
      {/* Drawer Header */}
      <div
        className={`sticky top-0 z-10 px-5 py-4 border-b flex items-center justify-between ${
          isVintage ? "bg-[#f4eee1] border-[#d6cfbe]" : "bg-[#070b14] border-slate-800"
        }`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xl">
            {selectedTrain ? "🚆" : selectedBlock?.block_type === "SHADOW" ? "👥" : "🚧"}
          </span>
          <h2 className="font-serif font-bold text-base tracking-wide">
            {selectedTrain
              ? `Train Inspection: ${selectedTrain.trainDisplayName || `${selectedTrain.trainNumber} — ${selectedTrain.trainName}`}`
              : `Block Dossier: ${selectedBlock?.id}`}
          </h2>
        </div>
        <button
          onClick={onClose}
          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-sm ${
            isVintage
              ? "bg-[#e5ded0] hover:bg-[#d6cfbe] text-[#332a21]"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300"
          }`}
        >
          ✕
        </button>
      </div>

      <div className="p-5 space-y-6 text-sm">
        {/* ======================================================== */}
        {/* TRAIN DETAILS VIEW */}
        {/* ======================================================== */}
        {selectedTrain && (
          <div className="space-y-5">
            {/* Title & Category Badge */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span
                  className="px-2.5 py-0.5 rounded text-xs font-mono font-bold text-white shadow-sm"
                  style={{
                    backgroundColor:
                      TRAIN_CATEGORIES[selectedTrain.category]?.color || "#475569",
                  }}
                >
                  {TRAIN_CATEGORIES[selectedTrain.category]?.name || selectedTrain.category}
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    selectedTrain.direction === "UP"
                      ? "bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                  }`}
                >
                  {selectedTrain.direction === "UP" ? "UP Line (Towards BINA / North)" : "DN Line (Towards ET / South)"}
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold">
                {selectedTrain.trainDisplayName || `${selectedTrain.trainNumber} — ${selectedTrain.trainName}`}
              </h3>
              <p className="text-xs opacity-70 font-mono">
                {selectedTrain.direction === "UP" ? "Itarsi Jn ➔ Bina Jn" : "Bina Jn ➔ Itarsi Jn"}
              </p>
            </div>

            {/* Live Operational Metrics */}
            <div
              className={`p-3.5 rounded border grid grid-cols-2 gap-3 text-xs ${
                isVintage ? "bg-[#f2ebdc] border-[#cfc4b0]" : "bg-slate-900 border-slate-800"
              }`}
            >
              <div>
                <span className="block opacity-60 text-[10px] uppercase font-bold">Speed / Status</span>
                <span className="font-mono font-bold text-sm">
                  {selectedTrain.currentSpeedKmph} km/h • {selectedTrain.status}
                </span>
              </div>
              <div>
                <span className="block opacity-60 text-[10px] uppercase font-bold">Punctuality</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    selectedTrain.delayMinutes > 15
                      ? "text-rose-600 dark:text-rose-400"
                      : selectedTrain.delayMinutes > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {selectedTrain.delayMinutes <= 0
                    ? "ON TIME"
                    : `+${selectedTrain.delayMinutes} min late`}
                </span>
              </div>
              <div>
                <span className="block opacity-60 text-[10px] uppercase font-bold">Current Location</span>
                <span className="font-mono font-semibold">
                  {formatDistanceKm(selectedTrain.currentKm)} ({selectedTrain.previousStation} ➔ {selectedTrain.nextStation})
                </span>
              </div>
              <div>
                <span className="block opacity-60 text-[10px] uppercase font-bold">Corridor Window</span>
                <span className="font-mono font-semibold">
                  {selectedTrain.entryTimeStr} ➔ {selectedTrain.exitTimeStr}
                </span>
              </div>
            </div>

            {/* Trajectory / Timetable Points */}
            <div className="space-y-2">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider opacity-80">
                Confirmed Telemetry Positions ({selectedTrain.historicalPositions?.length || 0})
              </h4>
              <div
                className={`border rounded divide-y overflow-hidden max-h-48 overflow-y-auto ${
                  isVintage
                    ? "border-[#d8cfbe] bg-[#faf6ee] divide-[#e8e0d1]"
                    : "border-slate-800 bg-slate-900 divide-slate-800"
                }`}
              >
                {selectedTrain.historicalPositions?.map((pt, idx) => (
                  <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] opacity-60 w-16">
                        {formatDistanceKm(pt.km)}
                      </span>
                      <span className="font-semibold">{pt.station}</span>
                      <span className="text-[10px] opacity-50 font-mono">({pt.type})</span>
                    </div>
                    <div className="font-mono text-right font-bold text-emerald-700 dark:text-emerald-400">
                      {pt.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scheduled Path Points */}
            {selectedTrain.scheduledPath && selectedTrain.scheduledPath.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-serif font-bold text-xs uppercase tracking-wider opacity-80">
                  Scheduled Timetable Stops ({selectedTrain.scheduledPath.length})
                </h4>
                <div
                  className={`border rounded divide-y overflow-hidden max-h-48 overflow-y-auto ${
                    isVintage
                      ? "border-[#d8cfbe] bg-[#faf6ee] divide-[#e8e0d1]"
                      : "border-slate-800 bg-slate-900 divide-slate-800"
                  }`}
                >
                  {selectedTrain.scheduledPath.map((pt, idx) => (
                    <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] opacity-60 w-16">
                          {formatDistanceKm(pt.km)}
                        </span>
                        <span className="font-semibold">{pt.station}</span>
                      </div>
                      <div className="font-mono text-right opacity-70">
                        {pt.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* BLOCK DETAILS VIEW */}
        {/* ======================================================== */}
        {selectedBlock && (
          <div className="space-y-5">
            {/* Block Type Badge & Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold border shadow-sm ${
                    selectedBlock.block_type === "RULING"
                      ? "bg-indigo-900 text-indigo-100 border-indigo-700"
                      : selectedBlock.block_type === "EMERGENT"
                      ? "bg-rose-900 text-rose-100 border-rose-700"
                      : selectedBlock.block_type === "SHADOW"
                      ? "bg-amber-900 text-amber-100 border-amber-700"
                      : "bg-emerald-900 text-emerald-100 border-emerald-700"
                  }`}
                >
                  {selectedBlock.block_type === "RULING"
                    ? "🏛️ RULING BLOCK (Annual Prog 2026)"
                    : selectedBlock.block_type === "EMERGENT"
                    ? "🚨 EMERGENT BLOCK (Emergency P1)"
                    : selectedBlock.block_type === "SHADOW"
                    ? "👥 SHADOW BLOCK (Multi-Department)"
                    : "📋 PLANNED BLOCK (Scheduled Possession)"}
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    selectedBlock.status === "SANCTIONED"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  }`}
                >
                  {selectedBlock.status}
                </span>
              </div>
              <h3 className="text-base font-serif font-bold">
                {selectedBlock.work_type_name || selectedBlock.task_title || "Track Maintenance Window"}
              </h3>
              <p className="text-xs font-mono opacity-70">
                Track: {selectedBlock.track_name} • Location: {formatDistanceKm(selectedBlock.location_km)} (
                {selectedBlock.from_station_code || "Section"} ➔ {selectedBlock.to_station_code || "Adjacent"}
                )
              </p>
            </div>

            {/* Window & Possession Timing */}
            <div
              className={`p-3.5 rounded border grid grid-cols-2 gap-3 text-xs ${
                isVintage ? "bg-[#f2ebdc] border-[#cfc4b0]" : "bg-slate-900 border-slate-800"
              }`}
            >
              <div>
                <span className="block opacity-60 text-[10px] uppercase font-bold">Possession Window</span>
                <span className="font-mono font-bold text-sm">
                  {selectedBlock.requested_start_time} — {selectedBlock.requested_end_time}
                </span>
              </div>
              <div>
                <span className="block opacity-60 text-[10px] uppercase font-bold">Total Duration</span>
                <span className="font-mono font-bold text-sm">
                  {selectedBlock.duration_mins} Minutes ({Math.round(selectedBlock.duration_mins / 60 * 10) / 10}h)
                </span>
              </div>
              <div>
                <span className="block opacity-60 text-[10px] uppercase font-bold">Participating Depts</span>
                <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400">
                  {selectedBlock.participating_departments || selectedBlock.department_id || "PWAY"}
                </span>
              </div>
              <div>
                <span className="block opacity-60 text-[10px] uppercase font-bold">Planning Origin</span>
                <span className="font-mono font-semibold text-xs">
                  {selectedBlock.planning_origin || "DIVISIONAL_TIMETABLE_COMMITTEE"}
                </span>
              </div>
              <div>
                <span className="block opacity-60 text-[10px] uppercase font-bold">Power Isolation (TRD)</span>
                <span className="font-mono font-semibold">
                  {selectedBlock.power_isolation_required ? "⚠️ YES (OHE Power Block)" : "NO (Track-only)"}
                </span>
              </div>
              <div>
                <span className="block opacity-60 text-[10px] uppercase font-bold">Assigned Equipment</span>
                <span className="font-mono font-semibold">
                  {selectedBlock.assigned_machine || "BCM / Tamping Unit"}
                </span>
              </div>
            </div>

            {/* Multi-Department Bundled Tasks Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-xs uppercase tracking-wider opacity-80">
                  Associated Relational Tasks & Defects ({selectedBlock.tasks?.length || 1})
                </h4>
                {selectedBlock.block_type === "SHADOW" && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/40">
                    Cross-Department Synergy
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {selectedBlock.tasks && selectedBlock.tasks.length > 0 ? (
                  selectedBlock.tasks.map((task: any, idx: number) => (
                    <div
                      key={task.id || idx}
                      className={`p-3 rounded border text-xs space-y-1.5 ${
                        isVintage
                          ? "bg-[#faf6ee] border-[#d8cfbe]"
                          : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              task.department_id === "PWAY"
                                ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                                : task.department_id === "TRD"
                                ? "bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300"
                                : "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300"
                            }`}
                          >
                            {task.department_id}
                          </span>
                          <span className="font-mono text-[10px] opacity-60">{task.id}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            task.priority === "CRITICAL"
                              ? "bg-rose-600 text-white"
                              : task.priority === "HIGH"
                              ? "bg-amber-600 text-white"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {task.priority || "MEDIUM"}
                        </span>
                      </div>
                      <p className="font-medium">{task.title}</p>
                      <div className="flex items-center justify-between text-[11px] opacity-70 font-mono">
                        <span>Work: {task.work_type_name || "Possession Maintenance"}</span>
                        <span>{task.duration_hours || 2}h estimated</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className={`p-3 rounded border text-xs ${
                      isVintage ? "bg-[#faf6ee] border-[#d8cfbe]" : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    <p className="font-medium">{selectedBlock.task_title || "Primary Track Renewal Work"}</p>
                    <p className="text-[11px] opacity-70 font-mono mt-1">
                      Department: {selectedBlock.department_id || "PWAY"} • Priority:{" "}
                      {selectedBlock.task_priority || "HIGH"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
