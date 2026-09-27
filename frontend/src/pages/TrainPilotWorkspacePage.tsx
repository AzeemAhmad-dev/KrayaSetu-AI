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
  RefreshCw,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";
import { CORRIDORS_DATABASE } from "../data/corridorsData";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { PilotActivityLog, BlockData, TrainMovementData } from "../types";
import { api } from "../services/api";
import { BlockReasoningModal } from "../components/blocks/BlockReasoningModal";
import { useQueryClient } from "@tanstack/react-query";
import { formatKmBadge, formatDistanceKm } from "../utils/formatDistance";
import { useTheme } from "../context/ThemeContext";

export const TrainPilotWorkspacePage: React.FC = () => {
  const { user } = useAuth();

  // Global theme state from ThemeContext
  const { theme } = useTheme();

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
          km_chainage: f.location_km != null ? formatKmBadge(f.location_km) : "Unspecified KM",
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
      api.getBlocks(undefined, undefined, undefined, undefined, undefined, true).catch(() => []),
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans space-y-6 min-h-screen bg-[var(--surface-body)] text-[var(--text-primary)] transition-colors" data-theme={theme}>
      {/* Workspace Header */}
      <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <span className="p-2 bg-[var(--brand-navy)] text-white rounded-lg shadow-xs">
              <Train className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Train Pilot Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              TRAIN-001
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] font-medium">
            Loco Pilot En-Route Activity & Observation Logging Portal · West Central Railway (WCR)
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="px-3 py-1.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-secondary)]">
            Crew Base: <strong className="text-[var(--text-primary)]">Bhopal (BPL)</strong>
          </div>
        </div>
      </div>

      {/* Operational Protocol Banner */}
      <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-300 flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-amber-950 dark:text-amber-200 block">
            Train Pilot Safety Advisory & Standard Operating Procedure
          </span>
          <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
            Record en-route visual track observations, OHE conditions, signal abnormalities, or physical obstructions.
            Observations are recorded with verifiable status tags (<em>Observed, Suspected, Requires inspection</em>) and routed to the corresponding engineering departments and workflow targets.
          </p>
        </div>
      </div>

      {/* Feedback Messages */}
      {submitSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-900 dark:text-emerald-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-medium">{submitSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccess(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {serverError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-4 text-sm text-red-900 dark:text-red-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="font-medium">{serverError}</span>
          </div>
          <button
            type="button"
            onClick={() => setServerError(null)}
            className="text-red-700 dark:text-red-400 hover:text-red-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {formError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-4 text-sm text-red-900 dark:text-red-200 flex items-center space-x-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="font-medium">{formError}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-[var(--surface-card)] p-2 sm:p-2.5 rounded-2xl border border-[var(--border-subtle)] shadow-xs">
        <Tabs
          value={workspaceTab}
          onValueChange={(val) => setWorkspaceTab(val as "restrictions" | "log")}
          variant="pills"
          className="w-full min-w-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 w-full min-w-0">
            <div className="flex-1 min-w-0 overflow-x-auto">
              <TabsList className="bg-transparent border-0 p-0 space-x-2 overflow-visible min-w-max">
                <TabsTrigger
                  value="restrictions"
                  icon={<ShieldCheck className="w-4 h-4" />}
                  badge={
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      {blocks.filter((b) => ["APPROVED", "SANCTIONED", "ACTIVE", "SELECTED"].includes(b.status)).length}
                    </span>
                  }
                  className="px-4 py-2 text-xs sm:text-sm font-bold"
                >
                  <span>Operational Locks & Movement Restrictions</span>
                </TabsTrigger>
                <TabsTrigger
                  value="log"
                  icon={<ClipboardEdit className="w-4 h-4" />}
                  className="px-4 py-2 text-xs sm:text-sm font-bold"
                >
                  <span>Log En-Route Observation</span>
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="text-xs font-mono text-[var(--text-muted)] hidden sm:block pr-2 flex-shrink-0">
              {workspaceTab === "restrictions"
                ? "Live Sanctioned Operational Restrictions"
                : "Field Telemetry & Driver Observation Portal"}
            </div>
          </div>
        </Tabs>
      </div>

      {/* Tab 1: Operational Locks & Planned Movement Restrictions */}
      {workspaceTab === "restrictions" && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-wide font-mono uppercase">
                    OPERATIONAL LOCKS & SANCTIONED MOVEMENT RESTRICTIONS (COBO AUTHORIZED)
                  </h2>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Surveillance of COBO-sanctioned operational maintenance blocks, temporary sectional possessions, and train impacts across Bhopal Division. Unapproved planning proposals are strictly gated out.
                </p>
              </div>
              <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
            </div>

            {blocks.filter((b) => ["APPROVED", "SANCTIONED", "ACTIVE", "SELECTED"].includes(b.status)).length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                title="No Active Operational Locks or Movement Restrictions"
                description="All tracks on the 5 Bhopal Division corridors are currently clear for normal movement. Only blocks sanctioned by Chief of Block Officer (COBO) appear here with precautionary advisories."
                className="py-12"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-mono text-[11px] uppercase tracking-wider">
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
                  <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                    {blocks
                      .filter((b) => ["APPROVED", "SANCTIONED", "ACTIVE", "SELECTED"].includes(b.status))
                      .map((b) => {
                        const conflictingTrainInfo =
                          b.conflicting_trains && b.conflicting_trains.length > 0
                            ? b.conflicting_trains.map((t: any) => typeof t === "string" ? t : (t.train_number || t.number || "Passenger Train")).join(", ")
                            : null;

                        return (
                          <tr key={`pilot-block-${b.id}`} className="hover:bg-[var(--surface-secondary)] transition-colors">
                            {/* Train / Service Identifier */}
                            <td className="py-3 px-3">
                              <div className="flex flex-col space-y-0.5">
                                <span className="font-bold text-[var(--text-primary)] font-mono">
                                  {conflictingTrainInfo || "Scheduled Traffic in Sector"}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                  {conflictingTrainInfo ? "Direct Schedule Impact Identified" : "Precautionary Corridor Window"}
                                </span>
                              </div>
                            </td>

                            {/* Block ID */}
                            <td className="py-3 px-3">
                              <div className="font-mono font-bold text-[var(--text-primary)]">{b.id}</div>
                              {b.task_id && (
                                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                  Task: {b.task_id}
                                </div>
                              )}
                            </td>

                            {/* Corridor & Section */}
                            <td className="py-3 px-3">
                              <div className="font-semibold text-[var(--text-primary)]">{b.corridor_id}</div>
                              <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                                {b.section_id || "Mainline Section"}
                              </div>
                            </td>

                            {/* Track / KM */}
                            <td className="py-3 px-3">
                              <div className="font-mono font-medium text-[var(--text-secondary)]">{b.track_name}</div>
                              <div className="text-[11px] text-[var(--text-muted)] font-mono">{formatKmBadge(b.location_km)}</div>
                            </td>

                            {/* Planned Window */}
                            <td className="py-3 px-3">
                              <div className="font-mono font-bold text-[var(--text-primary)]">
                                {b.requested_start_time} – {b.requested_end_time}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                Duration: {b.duration_mins}m
                              </div>
                            </td>

                            {/* Advisory / Status */}
                            <td className="py-3 px-3">
                              <div className="flex flex-col space-y-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold w-fit ${
                                  b.status === "SELECTED"
                                    ? "bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-800"
                                    : b.status === "APPROVED"
                                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                    : "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                }`}>
                                  {b.status === "SELECTED"
                                    ? "Operational Lock / Planned Movement Restriction"
                                    : b.status === "APPROVED"
                                    ? "Train Impact Identified (Approved Block)"
                                    : "Movement Conflict / Precautionary Notice"}
                                </span>
                                {b.power_isolation_required && (
                                  <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400">
                                    ⚡ 25kV OHE Isolation Active
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Precautionary Action */}
                            <td className="py-3 px-3 text-right">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSelectedReasoningBlockId(b.id)}
                              >
                                View Advisory
                              </Button>
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
        <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClipboardEdit className="w-5 h-5 text-[var(--brand-navy)]" />
            <h2 className="font-bold text-[var(--text-primary)] text-base sm:text-lg">
              Log En-Route Activity / Observation
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)] font-semibold uppercase tracking-wider">
            Field Report Interface
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* Section 1: Location */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-[var(--border-subtle)] pb-2">
              <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
              <h3 className="text-xs font-bold font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                1. Location
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Corridor */}
              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1.5">
                  Select Corridor *
                </label>
                <select
                  value={selectedCorridorId}
                  onChange={(e) => handleCorridorChange(e.target.value)}
                  className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
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
                <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1.5">
                  Nearby Station / Location
                </label>
                <select
                  value={selectedStationCode}
                  onChange={(e) => setSelectedStationCode(e.target.value)}
                  className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
                >
                  <option value="">-- Select Nearby Station --</option>
                  {stations.map((stn) => (
                    <option key={stn.code} value={stn.code}>
                      {stn.name} ({stn.code}) · {formatKmBadge(stn.km)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Location / Landmark */}
              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1.5">
                  Or Custom Landmark / Yard
                </label>
                <input
                  type="text"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  placeholder="e.g. Outer yard, Bridge No. 42"
                  className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
                />
              </div>

              {/* Precise KM / Chainage */}
              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1.5">
                  Precise KM / Chainage
                </label>
                <input
                  type="text"
                  value={kmChainage}
                  onChange={(e) => setKmChainage(e.target.value)}
                  placeholder="e.g. KM 824/12 or KM 48.5"
                  className="w-full text-sm font-mono border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
                />
              </div>
            </div>

            {/* Section or Point on Corridor */}
            <div>
              <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1.5">
                Relevant Section / Point on Corridor
              </label>
              <input
                type="text"
                value={sectionPoint}
                onChange={(e) => setSectionPoint(e.target.value)}
                placeholder="e.g. Up Line between Mandideep & Misrod, approaching Home Signal"
                className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Primary Observation */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 border-b border-[var(--border-subtle)] pb-2">
              <FileText className="w-4 h-4 text-[var(--text-muted)]" />
              <h3 className="text-xs font-bold font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                2. Observation / Problem *
              </h3>
            </div>
            <label className="block text-sm font-bold text-[var(--text-primary)]">
              Describe what you observed
            </label>
            <p className="text-xs text-[var(--text-muted)]">
              Provide clear, objective details of what was witnessed from the locomotive cab (e.g. OHE wire appears damaged/snapped, possible rail crack, track obstruction, signal-related abnormality).
            </p>
            <textarea
              rows={4}
              required
              value={primaryObservation}
              onChange={(e) => setPrimaryObservation(e.target.value)}
              placeholder="Describe what you observed..."
              className="w-full text-sm border border-[var(--border-subtle)] rounded-lg p-3 bg-[var(--surface-card)] text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
            />
          </div>

          {/* Section 3 & 4: Multi-Select Checkboxes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* 3. Required Departments */}
            <div className="space-y-3 p-4 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border-subtle)]">
              <div className="flex items-center space-x-2 border-b border-[var(--border-subtle)] pb-2">
                <Layers className="w-4 h-4 text-[var(--text-primary)]" />
                <h3 className="text-xs font-bold font-mono text-[var(--text-primary)] uppercase tracking-wider">
                  3. Required Departments *
                </h3>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Select one, two, or all three depending on the observation:
              </p>
              <div className="space-y-2.5 pt-1">
                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deptPway}
                    onChange={(e) => setDeptPway(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-navy)] focus:ring-[var(--brand-navy)]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-[var(--text-primary)] block">
                      P.Way / Engineering
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      Track geometry, rails, sleepers, ballast, turnouts, physical bridge/track obstructions
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deptSnt}
                    onChange={(e) => setDeptSnt(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-navy)] focus:ring-[var(--brand-navy)]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-[var(--text-primary)] block">
                      Signal & S&T
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      Colour light signals, point machines, track circuits, axle counters, cab signaling
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deptTrd}
                    onChange={(e) => setDeptTrd(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-navy)] focus:ring-[var(--brand-navy)]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-[var(--text-primary)] block">
                      Traction / OHE
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      25kV catenary contact wire, droppers, mast insulators, neutral sections, pantograph interaction
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* 4. Required Systems / Workflow Targets */}
            <div className="space-y-3 p-4 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border-subtle)]">
              <div className="flex items-center space-x-2 border-b border-[var(--border-subtle)] pb-2">
                <ShieldCheck className="w-4 h-4 text-[var(--text-primary)]" />
                <h3 className="text-xs font-bold font-mono text-[var(--text-primary)] uppercase tracking-wider">
                  4. Required Systems / Workflow Targets
                </h3>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Record which systems may need this activity/observation:
              </p>
              <div className="space-y-2.5 pt-1">
                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sysTms}
                    onChange={(e) => setSysTms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-navy)] focus:ring-[var(--brand-navy)]"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        TMS
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded">
                        Train Management System
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Section controller advisory & cautionary train speed restrictions
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sysSmms}
                    onChange={(e) => setSysSmms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-navy)] focus:ring-[var(--brand-navy)]"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        SMMS
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded">
                        Track Maintenance Mgmt
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Permanent Way gang inspection docket & track defect rectification
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sysTdms}
                    onChange={(e) => setSysTdms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-navy)] focus:ring-[var(--brand-navy)]"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        TDMS
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded">
                        Traction Distribution Mgmt
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      OHE electrical maintenance docket & tower wagon requisition
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 5: Potential Secondary Observation */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center space-x-2 border-b border-[var(--border-subtle)] pb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs font-bold font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                5. Potential Secondary Observation (Optional)
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-bold text-[var(--text-primary)]">
                Related or suspected issues requiring verification
              </label>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded font-semibold">
                Requires Inspection
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Record any suspected secondary consequences (e.g. main issue might be "OHE wire snapped", but you also suspect the snapped wire caused rail damage or track impact).
              Please use prudent terminology: <em>"Observed"</em>, <em>"Suspected"</em>, <em>"Possible"</em>, or <em>"Requires inspection"</em> without declaring unverified faults as confirmed fact.
            </p>
            <textarea
              rows={3}
              value={secondaryObservation}
              onChange={(e) => setSecondaryObservation(e.target.value)}
              placeholder="e.g. Possible rail damage/crack suspected near impact site; requires physical engineering inspection before line-clear..."
              className="w-full text-sm border border-[var(--border-subtle)] rounded-lg p-3 bg-[var(--surface-card)] text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
            />
          </div>

          {/* Section 6: Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <Button
              variant="secondary"
              type="button"
              onClick={handleResetForm}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Clear Form
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={submittingLog}
              leftIcon={<Send className="w-4 h-4" />}
            >
              {submittingLog ? "Transmitting..." : "Log Activity"}
            </Button>
          </div>
        </form>
      </div>

      {/* Section 7: Activity Log History Section */}
      <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-5 h-5 text-[var(--text-secondary)]" />
            <div>
              <h2 className="font-bold text-[var(--text-primary)] text-base sm:text-lg">
                Train Pilot Activity Log
              </h2>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                En-route driver activity and observation reports recorded during operations (persisted to database)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadPilotObservations()}
              isLoading={loadingLogs}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
            <span className="text-xs font-mono text-[var(--text-muted)] font-bold">
              Total Recorded:
            </span>
            <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              {activityLogs.length}
            </span>
          </div>
        </div>

        {/* Clean Initial State / Empty State */}
        {activityLogs.length === 0 ? (
          <EmptyState
            icon={<ClipboardEdit className="w-8 h-8 text-[var(--brand-navy)]" />}
            title="No Pilot Activity Reports Recorded Yet"
            description="The activity log is currently clean. Use the form above to log en-route observations (track, OHE, signal abnormalities) observed during your locomotive journey."
            actionLabel="Refresh Database"
            onAction={() => loadPilotObservations()}
            className="py-12"
          />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {activityLogs.map((log) => {
              const formattedDate = new Date(log.timestamp).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <div key={log.id} className="p-5 hover:bg-[var(--surface-secondary)] transition-colors space-y-3">
                  {/* Top Header Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        {log.id}
                      </span>
                      <span className="font-bold text-sm text-[var(--text-primary)]">
                        {log.corridor_name}
                      </span>
                      <span className="text-[var(--text-muted)] text-xs">·</span>
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        {log.nearby_location}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        Logged / Pending Review
                      </span>
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  {/* Section & KM Meta */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--text-secondary)] bg-[var(--surface-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                    <div>
                      <span className="text-[var(--text-muted)]">Section: </span>
                      <span className="font-semibold text-[var(--text-primary)]">{log.section_point}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Chainage: </span>
                      <span className="font-semibold text-[var(--text-primary)]">{log.km_chainage}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Logged By: </span>
                      <span className="font-semibold text-[var(--text-primary)]">{log.logged_by}</span>
                    </div>
                  </div>

                  {/* Primary Observation */}
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                      Primary Observation:
                    </span>
                    <p className="text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-card)] p-3 rounded-lg border border-[var(--border-subtle)] leading-relaxed">
                      {log.primary_observation}
                    </p>
                  </div>

                  {/* Potential Secondary Observation if present */}
                  {log.secondary_observation && (
                    <div className="bg-amber-50/50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200/80 dark:border-amber-800 space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                          Suspected Secondary Consequence (Requires Inspection):
                        </span>
                      </div>
                      <p className="text-xs font-medium text-amber-950 dark:text-amber-200 leading-relaxed">
                        {log.secondary_observation}
                      </p>
                    </div>
                  )}

                  {/* Departments and Target Systems Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    {/* Departments */}
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-mono text-[var(--text-muted)] font-bold">
                        Departments:
                      </span>
                      {log.departments.map((dept) => {
                        let label = "";
                        let colorClass = "";
                        if (dept === "PWAY") {
                          label = "P.Way / Engineering";
                          colorClass = "bg-[var(--dept-pway-surface)] text-[var(--dept-pway-text)] border-[var(--dept-pway-border)]";
                        } else if (dept === "SNT") {
                          label = "Signal & S&T";
                          colorClass = "bg-[var(--dept-snt-surface)] text-[var(--dept-snt-text)] border-[var(--dept-snt-border)]";
                        } else {
                          label = "Traction / OHE";
                          colorClass = "bg-[var(--dept-trd-surface)] text-[var(--dept-trd-text)] border-[var(--dept-trd-border)]";
                        }
                        return (
                          <span
                            key={dept}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${colorClass}`}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>

                    {/* Systems */}
                    {log.target_systems && log.target_systems.length > 0 && (
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-mono text-[var(--text-muted)] font-bold">
                          Workflow Targets:
                        </span>
                        {log.target_systems.map((sys) => (
                          <span
                            key={sys}
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
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
