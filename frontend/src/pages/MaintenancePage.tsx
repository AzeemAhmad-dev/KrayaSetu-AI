import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { FaultObservationData } from "../types";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { formatKmValue, formatDistanceKm } from "../utils/formatDistance";
import {
  Wrench,
  Sparkles,
  UserCheck,
  CheckCircle,
  XCircle,
  AlertOctagon,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Layers,
  Plus
} from "lucide-react";

export const MaintenancePage: React.FC = () => {
  const [faults, setFaults] = useState<FaultObservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [assessingId, setAssessingId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // New observation modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dept, setDept] = useState("PWAY");
  const [km, setKm] = useState(140.0);
  const [track, setTrack] = useState("DOWN_MAIN");

  useEffect(() => {
    loadFaults();
  }, []);

  const loadFaults = async () => {
    try {
      const res = await api.getFaults();
      setFaults(res);
    } catch (err) {
      console.error("Failed to load faults", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAIAssessment = async (faultId: string) => {
    setAssessingId(faultId);
    try {
      await api.assessFault(faultId);
      await loadFaults();
    } catch (err) {
      console.error("AI assessment failed", err);
    } finally {
      setAssessingId(null);
    }
  };

  const handleHumanDecision = async (
    faultId: string,
    decision: "CONFIRMED" | "OVERRIDDEN" | "REJECTED" | "ESCALATED"
  ) => {
    setActioningId(faultId);
    try {
      await api.submitHumanDecision({
        fault_id: faultId,
        decision,
        decided_by: "Senior Divisional Engineer (Operating/Civil)",
        notes: `Human Review Action: ${decision} with verified safety boundaries.`,
      });
      await loadFaults();
    } catch (err) {
      console.error("Human decision failed", err);
    } finally {
      setActioningId(null);
    }
  };

  const handleCreateObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFault({
        reporter: "Track Maintenance Gang BHS",
        reporter_role: "TRACK_MAN",
        corridor_id: "CORR-01",
        section_id: "SEC-CORR-01-BHS-SOI",
        track_name: track,
        location_km: km,
        location_description: `Between Vidisha and Sorai near KM ${km}`,
        fault_title: title,
        description: desc,
        department_id: dept,
        severity: "MEDIUM",
      });
      setShowNewModal(false);
      setTitle("");
      setDesc("");
      await loadFaults();
    } catch (err) {
      console.error("Failed to create observation", err);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Maintenance Field Observations & AI Decision Support
            </h1>
            <span className="text-xs bg-purple-100 text-purple-800 font-mono font-bold px-2 py-0.5 rounded">
              Human-in-the-Loop
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            P.Way (Civil) · TRD (25kV OHE) · S&T (Signaling & Circuits) Safety Engine
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Field Observation</span>
          </button>
          <ProvenanceBadge type="DERIVED" />
        </div>
      </div>

      {/* Observations & Tasks Cards */}
      <div className="space-y-4">
        {faults.map((f) => (
          <div
            key={f.id}
            className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 hover:border-sky-300 transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-slate-900">{f.id}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                    {f.department_id}
                  </span>
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                      f.severity === "CRITICAL"
                        ? "bg-red-100 text-red-800"
                        : f.severity === "HIGH"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {f.severity}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Status: <span className="text-slate-800 font-bold">{f.status}</span>
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{f.fault_title}</h3>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  Location: {f.location_description} · Track: {f.track_name} ({formatDistanceKm(f.location_km)})
                </div>
              </div>

              <div className="flex items-center space-x-2 font-mono text-xs text-slate-400">
                <span>Reporter: {f.reporter} ({f.reporter_role})</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-700 mt-3 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
              {f.description}
            </p>

            {/* AI Decision Support Panel */}
            {f.ai_assessed ? (
              <div className="mt-3 p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs">
                <div className="flex items-center justify-between font-bold text-indigo-950 mb-1">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>AI DECISION SUPPORT RECOMMENDATION</span>
                    <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-1.5 py-0.2 rounded font-mono">
                      {(f.ai_confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                  <ProvenanceBadge type="DERIVED" size="sm" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2 font-mono text-[11px]">
                  <div className="bg-white p-1.5 rounded border border-indigo-100">
                    <span className="text-slate-400 block text-[9px]">SEVERITY</span>
                    <span className="font-bold text-slate-800">{f.ai_recommended_severity}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-indigo-100">
                    <span className="text-slate-400 block text-[9px]">REQUIRED PROTECTION</span>
                    <span className="font-bold text-red-700">{f.ai_recommended_protection}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-indigo-100">
                    <span className="text-slate-400 block text-[9px]">MAINTENANCE MODE</span>
                    <span className="font-bold text-indigo-700">{f.ai_recommended_mode}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-indigo-100">
                    <span className="text-slate-400 block text-[9px]">URGENCY</span>
                    <span className="font-bold text-amber-700">{f.ai_recommended_urgency}</span>
                  </div>
                </div>

                <div className="text-[11px] text-indigo-950 font-medium whitespace-pre-line leading-relaxed bg-white/80 p-2.5 rounded border border-indigo-100 mt-2 shadow-2xs">
                  {f.ai_explanation}
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 font-mono">
                  Awaiting ML fault risk & protection mode evaluation
                </span>
                <button
                  onClick={() => handleRunAIAssessment(f.id)}
                  disabled={assessingId === f.id}
                  className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  <span>{assessingId === f.id ? "Analyzing..." : "Trigger AI Assessment"}</span>
                </button>
              </div>
            )}

            {/* Human Decision Review Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold uppercase font-mono text-[10px] text-slate-400">
                  Human Authority Decision:
                </span>
                <span
                  className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                    f.human_status === "CONFIRMED"
                      ? "bg-emerald-100 text-emerald-800"
                      : f.human_status === "OVERRIDDEN"
                      ? "bg-amber-100 text-amber-800"
                      : f.human_status === "REJECTED"
                      ? "bg-red-100 text-red-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {f.human_status}
                </span>
                {f.human_decision_by && (
                  <span className="text-slate-500 text-[11px] font-medium">
                    by {f.human_decision_by}
                  </span>
                )}
              </div>

              {f.human_status === "PENDING" && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleHumanDecision(f.id, "REJECTED")}
                    disabled={actioningId === f.id}
                    className="px-2.5 py-1 rounded border border-red-300 hover:bg-red-50 text-red-700 text-xs font-semibold"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleHumanDecision(f.id, "OVERRIDDEN")}
                    disabled={actioningId === f.id}
                    className="px-2.5 py-1 rounded border border-amber-300 hover:bg-amber-50 text-amber-800 text-xs font-semibold"
                  >
                    Override
                  </button>
                  <button
                    onClick={() => handleHumanDecision(f.id, "ESCALATED")}
                    disabled={actioningId === f.id}
                    className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
                  >
                    Escalate Emergency
                  </button>
                  <button
                    onClick={() => handleHumanDecision(f.id, "CONFIRMED")}
                    disabled={actioningId === f.id}
                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirm & Create Task</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Logging New Observation */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 shadow-lg border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Log Field Observation</h3>
            <form onSubmit={handleCreateObservation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fault Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OHE bracket insulator cracked"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-medium"
                >
                  <option value="PWAY">Permanent Way (Civil / Track)</option>
                  <option value="TRD">TRD (Traction / 25kV OHE)</option>
                  <option value="SNT">Signal & Telecom (S&T)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Track Line</label>
                  <select
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-medium"
                  >
                    <option value="DOWN_MAIN">DOWN MAIN</option>
                    <option value="UP_MAIN">UP MAIN</option>
                    <option value="THIRD_LINE">THIRD LINE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">KM Location</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={km}
                    onChange={(e) => setKm(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Field Observation Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Observed defect details..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold"
                >
                  Save Observation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

