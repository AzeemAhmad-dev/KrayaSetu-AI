import React, { useState, useEffect } from "react";
import {
  Train,
  MapPin,
  ClipboardEdit,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Send,
  RotateCcw,
  Info,
  ShieldCheck,
  FileText,
  RefreshCw
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { CORRIDORS_DATABASE } from "../data/corridorsData";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { PilotActivityLog, BlockData, TrainMovementData } from "../types";
import { api } from "../services/api";
import { BlockReasoningModal } from "../components/blocks/BlockReasoningModal";
import { useQueryClient } from "@tanstack/react-query";

export const TrainPilotWorkspacePage: React.FC = () => {
  const { user } = useAuth();

  // Form State - Location
  const corridorList = Object.values(CORRIDORS_DATABASE);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(corridorList[0]?.id || "CORR-01");
  const [selectedStationCode, setSelectedStationCode] = useState<string>("");
  const [customLocation, setCustomLocation] = useState<string>("");
  const [sectionPoint, setSectionPoint] = useState<string>("");
  const [kmChainage, setKmChainage] = useState<string>("");

  // Form State - Observations
  const [primaryObservation, setPrimaryObservation] = useState<string>("");
  const [secondaryObservation, setSecondaryObservation] = useState<string>("");

  // Form State - Departments
  const [deptPway, setDeptPway] = useState<boolean>(false);
  const [deptSnt, setDeptSnt] = useState<boolean>(false);
  const [deptTrd, setDeptTrd] = useState<boolean>(false);

  // Form State - Systems
  const [sysTms, setSysTms] = useState<boolean>(false);
  const [sysSmms, setSysSmms] = useState<boolean>(false);
  const [sysTdms, setSysTdms] = useState<boolean>(false);

  // Status & Feedback
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [trainMovements, setTrainMovements] = useState<TrainMovementData[]>([]);
  const [workspaceTab, setWorkspaceTab] = useState<"restrictions" | "log">("restrictions");
  const [selectedReasoningBlockId, setSelectedReasoningBlockId] = useState<string | null>(null);

  // Loading states
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);

  // Logs List (Loaded dynamically from SQLite database via api.getFaults())
  const [activityLogs, setActivityLogs] = useState<PilotActivityLog[]>([]);

  const loadPilotObservations = async () => {
    setLoadingLogs(true);
    setServerError(null);
    try {
      const faults = await api.getFaults();
      const pilotFaults = (faults || []).filter((f) =>
        f.reporter_role === "LOCO_PILOT" ||
        f.train_reference === "TRAIN-001" ||
        (f.reporter && f.reporter.toLowerCase().includes("pilot")) ||
        (f.reporter && f.reporter.toLowerCase().includes("train"))
      );

      const mapped: PilotActivityLog[] = pilotFaults.map((f) => {
        const dept = (f.department_id as "PWAY" | "SNT" | "TRD") || "PWAY";
        const corridorName = f.corridor_id
          ? (CORRIDORS_DATABASE[f.corridor_id]?.name || f.corridor_id)
          : "Bhopal Main Corridor";

        return {
          id: f.id,
          timestamp: f.timestamp || new Date().toISOString(),
          corridor_id: f.corridor_id || "CORR-01",
          corridor_name: corridorName,
          station_code: f.station_code,
          station_name: f.station_code,
          nearby_location: f.location_description || f.section_id || "En-route Section",
          section_point: f.section_id || "Section Line",
          km_chainage: f.location_km != null ? `KM ${f.location_km}` : "Unspecified KM",
          primary_observation: f.fault_title || f.description || "Track / Asset Anomaly",
          secondary_observation: f.description && f.description !== f.fault_title ? f.description : undefined,
          departments: [dept],
          target_systems: ["TMS", "SMMS"],
          status: "LOGGED_PENDING_REVIEW",
          logged_by: f.reporter || "TRAIN-001",
        };
      });

      setActivityLogs(mapped);
    } catch (err: any) {
      console.warn("Could not load pilot observations from database:", err);
      setServerError(err?.message || "Failed to load pilot observations from database.");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.getBlocks().catch(() => []),
      api.getTrainMovements().catch(() => []),
      loadPilotObservations(),
    ]).then(([bRes, tRes]) => {
      setBlocks(bRes);
      setTrainMovements(tRes);
    });
  }, []);

  // Current active corridor stations
  const activeCorridor = CORRIDORS_DATABASE[selectedCorridorId] || corridorList[0];
  const stations = activeCorridor?.locations || [];

  // Reset station when corridor changes
  const handleCorridorChange = (corridorId: string) => {
    setSelectedCorridorId(corridorId);
    setSelectedStationCode("");
  };

  const handleResetForm = () => {
    setPrimaryObservation("");
    setSecondaryObservation("");
    setSelectedStationCode("");
    setCustomLocation("");
    setSectionPoint("");
    setKmChainage("");
    setDeptPway(false);
    setDeptSnt(false);
    setDeptTrd(false);
    setSysTms(false);
    setSysSmms(false);
    setSysTdms(false);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setServerError(null);
    setSubmitSuccess(null);

    // Validation
    if (!primaryObservation.trim()) {
      setFormError("Please enter an observation description in 'Describe what you observed'.");
      return;
    }

    const hasDept = deptPway || deptSnt || deptTrd;
    if (!hasDept) {
      setFormError("Please select at least one relevant railway department (P.Way, S&T, or Traction / OHE).");
      return;
    }

    const chosenStation = stations.find((s) => s.code === selectedStationCode);
    const stationLabel = chosenStation ? `${chosenStation.name} (${chosenStation.code})` : "";
    const nearbyLoc = customLocation.trim() || stationLabel || "Between Stations";

    const departments: ("PWAY" | "SNT" | "TRD")[] = [];
    if (deptPway) departments.push("PWAY");
    if (deptSnt) departments.push("SNT");
    if (deptTrd) departments.push("TRD");

    const targetSystems: ("TMS" | "SMMS" | "TDMS")[] = [];
    if (sysTms) targetSystems.push("TMS");
    if (sysSmms) targetSystems.push("SMMS");
    if (sysTdms) targetSystems.push("TDMS");

    const kmMatch = kmChainage.match(/(\d+(\.\d+)?)/);
    const parsedKm = kmMatch ? parseFloat(kmMatch[1]) : 0.0;

    setSubmittingLog(true);
    try {
      const res = await api.createFault({
        reporter: user?.username ? `${user.username} (Loco Pilot)` : "Loco Pilot (TRAIN-001)",
        reporter_role: "LOCO_PILOT",
        train_reference: "TRAIN-001",
        corridor_id: activeCorridor.id,
        section_id: sectionPoint.trim() || activeCorridor.name,
        station_code: chosenStation?.code || undefined,
        track_name: "UP_MAIN",
        location_km: parsedKm,
        location_description: `${activeCorridor.name} - ${nearbyLoc} (KM ${kmChainage || "N/A"})`,
        fault_title: primaryObservation.trim(),
        description: secondaryObservation.trim()
          ? `${primaryObservation.trim()} | Consequence: ${secondaryObservation.trim()}`
          : primaryObservation.trim(),
        department_id: departments[0] || "PWAY",
        severity: "MEDIUM",
      });

      // Invalidate maintenance query cache
      await queryClient.invalidateQueries({ queryKey: ["faults"] });
      await queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      await queryClient.invalidateQueries({ queryKey: ["trains"] });

      handleResetForm();
      setSubmitSuccess(
        `Activity record ${res?.fault_id || "FAULT-OBS"} successfully logged. Persisted to database and dispatched for engineering review.`
      );
      await loadPilotObservations();
    } catch (err: any) {
      console.error("Failed to persist pilot activity log to database:", err);
      const msg = err?.message || "Failed to persist observation to database.";
      setFormError(msg);
      setServerError(msg);
    } finally {
      setSubmittingLog(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans space-y-6">
      {/* Workspace Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <span className="p-2 bg-[#0b2545] text-white rounded-lg shadow-xs">
              <Train className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Train Pilot Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-100 text-indigo-900 border border-indigo-200">
              TRAIN-001
            </span>
          </div>
          <p className="text-sm text-slate-600 font-medium">
            Loco Pilot En-Route Activity & Observation Logging Portal · West Central Railway (WCR)
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            Crew Base: <strong className="text-slate-900">Bhopal (BPL)</strong>
          </div>
        </div>
      </div>

      {/* Operational Protocol Banner */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-amber-950 block">
            Train Pilot Safety Advisory & Standard Operating Procedure
          </span>
          <p className="text-amber-800 leading-relaxed">
            Record en-route visual track observations, OHE conditions, signal abnormalities, or physical obstructions.
            Observations are recorded with verifiable status tags (<em>Observed, Suspected, Requires inspection</em>) and routed to the corresponding engineering departments and workflow targets.
          </p>
        </div>
      </div>

      {/* Feedback Messages */}
      {submitSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-sm text-emerald-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{submitSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {serverError && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-sm text-red-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="font-medium">{serverError}</span>
          </div>
          <button
            type="button"
            onClick={() => setServerError(null)}
            className="text-red-700 hover:text-red-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {formError && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-sm text-red-900 flex items-center space-x-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="font-medium">{formError}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setWorkspaceTab("restrictions")}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            workspaceTab === "restrictions"
              ? "bg-[#0b2545] text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Operational Locks & Movement Restrictions</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
            workspaceTab === "restrictions" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {blocks.filter((b) => ["PROPOSED", "PENDING_APPROVAL", "APPROVED", "SELECTED"].includes(b.status)).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setWorkspaceTab("log")}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            workspaceTab === "log"
              ? "bg-[#0b2545] text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
          }`}
        >
          <ClipboardEdit className="w-4 h-4" />
          <span>Log En-Route Observation</span>
        </button>
      </div>

      {/* Tab 1: Operational Locks & Planned Movement Restrictions */}
      {workspaceTab === "restrictions" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded bg-amber-100 text-amber-800">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide font-mono uppercase">
                    OPERATIONAL LOCKS & PLANNED MOVEMENT RESTRICTIONS (DECISION SUPPORT)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Surveillance of planned maintenance blocks, temporary sectional possessions, and train impacts across Bhopal Division.
                </p>
              </div>
              <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
            </div>

            {blocks.filter((b) => ["PROPOSED", "PENDING_APPROVAL", "APPROVED", "SELECTED"].includes(b.status)).length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800">
                  No Active Operational Locks or Movement Restrictions
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  All tracks on the 5 Bhopal Division corridors are currently clear for normal movement. Blocks proposed or approved by Central Control will appear here with precautionary advisories.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Impacted Train / Service</th>
                      <th className="py-2.5 px-3">Related Block ID</th>
                      <th className="py-2.5 px-3">Corridor & Section</th>
                      <th className="py-2.5 px-3">Track / KM</th>
                      <th className="py-2.5 px-3">Planned Window</th>
                      <th className="py-2.5 px-3">Advisory / Status</th>
                      <th className="py-2.5 px-3 text-right">Precautionary Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {blocks
                      .filter((b) => ["PROPOSED", "PENDING_APPROVAL", "APPROVED", "SELECTED"].includes(b.status))
                      .map((b) => {
                        const conflictingTrainInfo =
                          b.conflicting_trains && b.conflicting_trains.length > 0
                            ? b.conflicting_trains.map((t: any) => typeof t === "string" ? t : (t.train_number || t.number || "Passenger Train")).join(", ")
                            : null;

                        return (
                          <tr key={`pilot-block-${b.id}`} className="hover:bg-slate-50 transition-colors">
                            {/* Train / Service Identifier */}
                            <td className="py-3 px-3">
                              <div className="flex flex-col space-y-0.5">
                                <span className="font-bold text-slate-900 font-mono">
                                  {conflictingTrainInfo || "Scheduled Traffic in Sector"}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {conflictingTrainInfo ? "Direct Schedule Impact Identified" : "Precautionary Corridor Window"}
                                </span>
                              </div>
                            </td>

                            {/* Block ID */}
                            <td className="py-3 px-3">
                              <div className="font-mono font-bold text-slate-900">{b.id}</div>
                              {b.task_id && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Task: {b.task_id}
                                </div>
                              )}
                            </td>

                            {/* Corridor & Section */}
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{b.corridor_id}</div>
                              <div className="text-[11px] text-slate-600 font-mono">
                                {b.section_id || "Mainline Section"}
                              </div>
                            </td>

                            {/* Track / KM */}
                            <td className="py-3 px-3">
                              <div className="font-mono font-medium text-slate-800">{b.track_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">KM {b.location_km.toFixed(3)}</div>
                            </td>

                            {/* Planned Window */}
                            <td className="py-3 px-3">
                              <div className="font-mono font-bold text-slate-900">
                                {b.requested_start_time} – {b.requested_end_time}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Duration: {b.duration_mins}m
                              </div>
                            </td>

                            {/* Advisory / Status */}
                            <td className="py-3 px-3">
                              <div className="flex flex-col space-y-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold w-fit ${
                                  b.status === "SELECTED"
                                    ? "bg-sky-100 text-sky-900 border border-sky-300"
                                    : b.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                    : "bg-amber-100 text-amber-900 border border-amber-300"
                                }`}>
                                  {b.status === "SELECTED"
                                    ? "Operational Lock / Planned Movement Restriction"
                                    : b.status === "APPROVED"
                                    ? "Train Impact Identified (Approved Block)"
                                    : "Movement Conflict / Precautionary Notice"}
                                </span>
                                {b.power_isolation_required && (
                                  <span className="text-[10px] font-mono font-bold text-amber-700">
                                    ⚡ 25kV OHE Isolation Active
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Precautionary Action */}
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedReasoningBlockId(b.id)}
                                className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
                              >
                                View Advisory
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Activity Logging Form */}
      {workspaceTab === "log" && (
        <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClipboardEdit className="w-5 h-5 text-[#0b2545]" />
            <h2 className="font-bold text-slate-900 text-base sm:text-lg">
              Log En-Route Activity / Observation
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 font-semibold uppercase tracking-wider">
            Field Report Interface
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* Section 1: Location */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider">
                1. Location
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Corridor */}
              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1.5">
                  Select Corridor *
                </label>
                <select
                  value={selectedCorridorId}
                  onChange={(e) => handleCorridorChange(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                >
                  {corridorList.map((corr) => (
                    <option key={corr.id} value={corr.id}>
                      {corr.id} — {corr.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nearby Station Dropdown */}
              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1.5">
                  Nearby Station / Location
                </label>
                <select
                  value={selectedStationCode}
                  onChange={(e) => setSelectedStationCode(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                >
                  <option value="">-- Select Nearby Station --</option>
                  {stations.map((stn) => (
                    <option key={stn.code} value={stn.code}>
                      {stn.name} ({stn.code}) · KM {stn.km}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Location / Landmark */}
              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1.5">
                  Or Custom Landmark / Yard
                </label>
                <input
                  type="text"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  placeholder="e.g. Outer yard, Bridge No. 42"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                />
              </div>

              {/* Precise KM / Chainage */}
              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1.5">
                  Precise KM / Chainage
                </label>
                <input
                  type="text"
                  value={kmChainage}
                  onChange={(e) => setKmChainage(e.target.value)}
                  placeholder="e.g. KM 824/12 or KM 48.5"
                  className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                />
              </div>
            </div>

            {/* Section or Point on Corridor */}
            <div>
              <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1.5">
                Relevant Section / Point on Corridor
              </label>
              <input
                type="text"
                value={sectionPoint}
                onChange={(e) => setSectionPoint(e.target.value)}
                placeholder="e.g. Up Line between Mandideep & Misrod, approaching Home Signal"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Primary Observation */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider">
                2. Observation / Problem *
              </h3>
            </div>
            <label className="block text-sm font-bold text-slate-800">
              Describe what you observed
            </label>
            <p className="text-xs text-slate-500">
              Provide clear, objective details of what was witnessed from the locomotive cab (e.g. OHE wire appears damaged/snapped, possible rail crack, track obstruction, signal-related abnormality).
            </p>
            <textarea
              rows={4}
              required
              value={primaryObservation}
              onChange={(e) => setPrimaryObservation(e.target.value)}
              placeholder="Describe what you observed..."
              className="w-full text-sm border border-slate-300 rounded-lg p-3 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
            />
          </div>

          {/* Section 3 & 4: Multi-Select Checkboxes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* 3. Required Departments */}
            <div className="space-y-3 p-4 bg-slate-50/70 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider">
                  3. Required Departments *
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Select one, two, or all three depending on the observation:
              </p>
              <div className="space-y-2.5 pt-1">
                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deptPway}
                    onChange={(e) => setDeptPway(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0b2545] focus:ring-[#0b2545]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">
                      P.Way / Engineering
                    </span>
                    <span className="text-xs text-slate-500">
                      Track geometry, rails, sleepers, ballast, turnouts, physical bridge/track obstructions
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deptSnt}
                    onChange={(e) => setDeptSnt(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0b2545] focus:ring-[#0b2545]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">
                      Signal & S&T
                    </span>
                    <span className="text-xs text-slate-500">
                      Colour light signals, point machines, track circuits, axle counters, cab signaling
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deptTrd}
                    onChange={(e) => setDeptTrd(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0b2545] focus:ring-[#0b2545]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">
                      Traction / OHE
                    </span>
                    <span className="text-xs text-slate-500">
                      25kV catenary contact wire, droppers, mast insulators, neutral sections, pantograph interaction
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* 4. Required Systems / Workflow Targets */}
            <div className="space-y-3 p-4 bg-slate-50/70 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider">
                  4. Required Systems / Workflow Targets
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Record which systems may need this activity/observation:
              </p>
              <div className="space-y-2.5 pt-1">
                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sysTms}
                    onChange={(e) => setSysTms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0b2545] focus:ring-[#0b2545]"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900">
                        TMS
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                        Train Management System
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Section controller advisory & cautionary train speed restrictions
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sysSmms}
                    onChange={(e) => setSysSmms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0b2545] focus:ring-[#0b2545]"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900">
                        SMMS
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                        Track Maintenance Mgmt
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Permanent Way gang inspection docket & track defect rectification
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sysTdms}
                    onChange={(e) => setSysTdms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0b2545] focus:ring-[#0b2545]"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900">
                        TDMS
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                        Traction Distribution Mgmt
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      OHE electrical maintenance docket & tower wagon requisition
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 5: Potential Secondary Observation */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider">
                5. Potential Secondary Observation (Optional)
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-bold text-slate-800">
                Related or suspected issues requiring verification
              </label>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 rounded font-semibold">
                Requires Inspection
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Record any suspected secondary consequences (e.g. main issue might be "OHE wire snapped", but you also suspect the snapped wire caused rail damage or track impact).
              Please use prudent terminology: <em>"Observed"</em>, <em>"Suspected"</em>, <em>"Possible"</em>, or <em>"Requires inspection"</em> without declaring unverified faults as confirmed fact.
            </p>
            <textarea
              rows={3}
              value={secondaryObservation}
              onChange={(e) => setSecondaryObservation(e.target.value)}
              placeholder="e.g. Possible rail damage/crack suspected near impact site; requires physical engineering inspection before line-clear..."
              className="w-full text-sm border border-slate-300 rounded-lg p-3 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
            />
          </div>

          {/* Section 6: Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Clear Form</span>
            </button>
            <button
              type="submit"
              disabled={submittingLog}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#0b2545] hover:bg-[#134074] disabled:opacity-50 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              {submittingLog ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{submittingLog ? "Transmitting..." : "Log Activity"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 7: Activity Log History Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-5 h-5 text-slate-700" />
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                Train Pilot Activity Log
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                En-route driver activity and observation reports recorded during operations (persisted to database)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => loadPilotObservations()}
              disabled={loadingLogs}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 flex items-center space-x-1 cursor-pointer transition-colors"
              title="Refresh from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <span className="text-xs font-mono text-slate-500 font-bold">
              Total Recorded:
            </span>
            <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-slate-200 text-slate-800">
              {activityLogs.length}
            </span>
          </div>
        </div>

        {/* Clean Initial State / Empty State */}
        {activityLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
              <ClipboardEdit className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No Pilot Activity Reports Recorded Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              The activity log is currently clean. Use the form above to log en-route observations (track, OHE, signal abnormalities) observed during your locomotive journey.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {activityLogs.map((log) => {
              const formattedDate = new Date(log.timestamp).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <div key={log.id} className="p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                  {/* Top Header Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 border border-slate-300">
                        {log.id}
                      </span>
                      <span className="font-bold text-sm text-slate-900">
                        {log.corridor_name}
                      </span>
                      <span className="text-slate-400 text-xs">·</span>
                      <span className="text-xs text-slate-600 font-medium">
                        {log.nearby_location}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Logged / Pending Review
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  {/* Section & KM Meta */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-slate-400">Section: </span>
                      <span className="font-semibold text-slate-800">{log.section_point}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Chainage: </span>
                      <span className="font-semibold text-slate-800">{log.km_chainage}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Logged By: </span>
                      <span className="font-semibold text-slate-800">{log.logged_by}</span>
                    </div>
                  </div>

                  {/* Primary Observation */}
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Primary Observation:
                    </span>
                    <p className="text-sm font-medium text-slate-800 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                      {log.primary_observation}
                    </p>
                  </div>

                  {/* Potential Secondary Observation if present */}
                  {log.secondary_observation && (
                    <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200/80 space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-900">
                          Suspected Secondary Consequence (Requires Inspection):
                        </span>
                      </div>
                      <p className="text-xs font-medium text-amber-950 leading-relaxed">
                        {log.secondary_observation}
                      </p>
                    </div>
                  )}

                  {/* Departments and Target Systems Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    {/* Departments */}
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-mono text-slate-500 font-bold">
                        Departments:
                      </span>
                      {log.departments.map((dept) => {
                        let label = "";
                        let color = "";
                        if (dept === "PWAY") {
                          label = "P.Way / Engineering";
                          color = "bg-emerald-100 text-emerald-900 border-emerald-300";
                        } else if (dept === "SNT") {
                          label = "Signal & S&T";
                          color = "bg-cyan-100 text-cyan-900 border-cyan-300";
                        } else {
                          label = "Traction / OHE";
                          color = "bg-amber-100 text-amber-900 border-amber-300";
                        }
                        return (
                          <span
                            key={dept}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${color}`}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>

                    {/* Systems */}
                    {log.target_systems && log.target_systems.length > 0 && (
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-mono text-slate-500 font-bold">
                          Workflow Targets:
                        </span>
                        {log.target_systems.map((sys) => (
                          <span
                            key={sys}
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200"
                          >
                            {sys}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </div>
      )}

      <BlockReasoningModal
        isOpen={!!selectedReasoningBlockId}
        onClose={() => setSelectedReasoningBlockId(null)}
        blockId={selectedReasoningBlockId || undefined}
      />
    </div>
  );
};
