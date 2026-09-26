import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  FileText,
  ChevronRight,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Tag,
  Info,
  RefreshCw
} from "lucide-react";
import { DepartmentProblem, ProblemWorkflowStatus, FaultObservationData } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

const PROBLEM_WORKFLOW_STEPS: ProblemWorkflowStatus[] = [
  "Issue Logged",
  "Reviewed",
  "Block Requested",
  "Block Approved",
  "Team Going",
  "Work Started",
  "Completed",
];

interface DepartmentProblemSectionProps {
  department: "PWAY" | "SNT" | "TRD";
  departmentName: string;
  storageKey: string;
  accentColor: "orange" | "cyan" | "amber";
  categories: string[];
  locationOptions: string[];
}

export const DepartmentProblemSection: React.FC<DepartmentProblemSectionProps> = ({
  department,
  departmentName,
  storageKey,
  accentColor,
  categories,
  locationOptions,
}) => {
  const { user } = useAuth();

  // Load problems dynamically from SQLite database via api.getFaults()
  const [problems, setProblems] = useState<DepartmentProblem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal / Drawer state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<DepartmentProblem | null>(null);
  const [rescheduleReasonInput, setRescheduleReasonInput] = useState("");
  const [showRescheduleInput, setShowRescheduleInput] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [locationChoice, setLocationChoice] = useState(locationOptions[0] || "");
  const [customLocation, setCustomLocation] = useState("");
  const [category, setCategory] = useState(categories[0] || "General Defect");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [observation, setObservation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const loadProblems = async () => {
    setLoadingProblems(true);
    setBackendError(null);
    try {
      const deptFaults = await api.getFaults(undefined, department);
      const mapped: DepartmentProblem[] = (deptFaults || []).map((f: any) => {
        let workflowStatus: ProblemWorkflowStatus = "Issue Logged";
        if (f.status === "COMPLETED" || f.human_status === "CONFIRMED") {
          workflowStatus = "Reviewed";
        } else if (f.status === "BLOCK_REQUESTED") {
          workflowStatus = "Block Requested";
        } else if (f.status === "BLOCK_APPROVED") {
          workflowStatus = "Block Approved";
        } else if (f.status === "IN_PROGRESS") {
          workflowStatus = "Work Started";
        } else if (f.status === "RESOLVED") {
          workflowStatus = "Completed";
        }

        const locDesc = f.location_description || (f.station_code ? `Station ${f.station_code} · KM ${Number(f.location_km).toFixed(2)}` : `KM ${Number(f.location_km).toFixed(2)}`);

        return {
          id: f.id,
          department: (f.department_id as "PWAY" | "SNT" | "TRD") || department,
          title: f.fault_title || "Defect",
          locationKmOrSection: locDesc,
          stationCode: f.station_code,
          exactKm: typeof f.location_km === "number" ? f.location_km : undefined,
          trackName: f.track_name,
          severity: (f.severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") || "MEDIUM",
          priority: f.priority,
          category: f.ai_recommended_protection || f.source_type || "Field Observation",
          observation: f.description || "",
          status: workflowStatus,
          rescheduleReason: f.human_notes,
          loggedBy: f.reporter || `${department}-STAFF`,
          createdAt: f.timestamp || new Date().toISOString(),
          relatedTaskId: f.related_task_id,
          relatedTaskStatus: f.related_task_status,
          relatedBlockId: f.related_block_id,
          relatedBlockStatus: f.related_block_status,
          completionTime: f.completion_time,
          resolutionNotes: f.resolution_notes,
        };
      });
      setProblems(mapped);
    } catch (err: any) {
      console.error("Failed to load department faults:", err);
      setBackendError(err?.message || "Failed to load defects from database.");
    } finally {
      setLoadingProblems(false);
    }
  };

  useEffect(() => {
    loadProblems();
  }, [department]);

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setBackendError(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setFormError("Please enter a problem summary / title.");
      return;
    }

    if (!observation.trim()) {
      setFormError("Please enter detailed observation / defect notes.");
      return;
    }

    const loc = customLocation.trim() || locationChoice;
    if (!loc) {
      setFormError("Please select or specify a location / KM.");
      return;
    }

    setSubmitting(true);
    try {
      const kmMatch = loc.match(/(\d+(\.\d+)?)/);
      const parsedKm = kmMatch ? parseFloat(kmMatch[1]) : 24.5;
      const trackName = loc.toUpperCase().includes("UP")
        ? "UP_MAIN"
        : loc.toUpperCase().includes("DOWN")
        ? "DOWN_MAIN"
        : "DOWN_MAIN";

      await api.createFault({
        reporter: user?.username || `${departmentName} Supervisor`,
        reporter_role:
          department === "PWAY"
            ? "PWAY_SUPERVISOR"
            : department === "SNT"
            ? "SNT_ENGINEER"
            : "TRD_OFFICER",
        corridor_id: "CORRIDOR_ET_BPL",
        section_id: "BPL-HBJ",
        track_name: trackName,
        location_km: parsedKm,
        location_description: loc,
        fault_title: title.trim(),
        description: `${category}: ${observation.trim()}`,
        department_id: department,
        severity,
      });

      setIsAddModalOpen(false);

      // Reset form
      setTitle("");
      setCustomLocation("");
      setCategory(categories[0] || "General Defect");
      setSeverity("MEDIUM");
      setObservation("");

      setSuccessMessage(`Defect "${title.trim()}" successfully logged and persisted to database.`);
      await loadProblems();
    } catch (err: any) {
      console.error("Failed to log problem to database:", err);
      const msg = err?.message || "Failed to save defect to database. Please check connection.";
      setFormError(msg);
      setBackendError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = (problemId: string, newStatus: ProblemWorkflowStatus, reason?: string) => {
    setProblems((prev) =>
      prev.map((p) => {
        if (p.id === problemId) {
          return {
            ...p,
            status: newStatus,
            rescheduleReason: reason ? reason : p.rescheduleReason,
          };
        }
        return p;
      })
    );

    if (selectedProblem && selectedProblem.id === problemId) {
      setSelectedProblem((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              rescheduleReason: reason ? reason : prev.rescheduleReason,
            }
          : null
      );
    }
    setShowRescheduleInput(false);
    setRescheduleReasonInput("");
  };

  const getNextStatus = (current: ProblemWorkflowStatus): ProblemWorkflowStatus | null => {
    // Map "Problem Logged" to "Issue Logged" for consistency
    const normalized = current === "Problem Logged" ? "Issue Logged" : current;
    const idx = PROBLEM_WORKFLOW_STEPS.indexOf(normalized);
    if (idx >= 0 && idx < PROBLEM_WORKFLOW_STEPS.length - 1) {
      return PROBLEM_WORKFLOW_STEPS[idx + 1];
    }
    return null;
  };

  const badgeColorClass =
    accentColor === "orange"
      ? "bg-orange-100 text-orange-900 border-orange-300"
      : accentColor === "cyan"
      ? "bg-cyan-100 text-cyan-900 border-cyan-300"
      : "bg-amber-100 text-amber-900 border-amber-300";

  return (
    <div className="space-y-4">
      {/* Top Action Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Issue Log
              </h2>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${badgeColorClass}`}>
                {departmentName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Record field-observed defects and infrastructure issues directly to SQLite database. Stored for department maintenance and block requirement.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={loadProblems}
            disabled={loadingProblems}
            title="Refresh issues from database"
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingProblems ? "animate-spin text-sky-600" : ""}`} />
          </button>
          <span className="text-xs font-mono text-slate-500">
            Logged Issues: <strong className="text-slate-900 font-bold">{problems.length}</strong>
          </span>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-[#0b2545] hover:bg-[#134074] text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Issue</span>
          </button>
        </div>
      </div>

      {/* Inline Feedback / Error Banners */}
      {backendError && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded-xl text-xs font-mono flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{backendError}</span>
          </div>
          <button
            type="button"
            onClick={() => setBackendError(null)}
            className="text-red-700 hover:text-red-900 text-xs px-2 py-0.5 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-mono flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs px-2 py-0.5 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Problem List / Loading / Empty State */}
      {loadingProblems ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <RefreshCw className="w-7 h-7 text-sky-600 animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            Loading Issues from Database...
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-mono">
            Fetching registered fault observations for {departmentName}
          </p>
        </div>
      ) : problems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            No Issues Logged Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            The issue log for {departmentName} is completely clean. Department users can record an infrastructure problem or defect found during inspection using the button below.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-[#0b2545] hover:text-white text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Log Issue</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {problems.map((prob) => {
            let severityClass = "bg-slate-100 text-slate-800 border-slate-300";
            if (prob.severity === "CRITICAL") severityClass = "bg-red-100 text-red-900 border-red-300";
            if (prob.severity === "HIGH") severityClass = "bg-orange-100 text-orange-900 border-orange-300";
            if (prob.severity === "MEDIUM") severityClass = "bg-amber-100 text-amber-900 border-amber-300";

            let statusBadgeClass = "bg-sky-100 text-sky-900 border-sky-300";
            if (prob.status === "Completed") statusBadgeClass = "bg-emerald-100 text-emerald-900 border-emerald-300";
            if (prob.status === "Rescheduled") statusBadgeClass = "bg-purple-100 text-purple-900 border-purple-300";
            if (prob.status === "Team Going" || prob.status === "Work Started")
              statusBadgeClass = "bg-amber-100 text-amber-900 border-amber-300";

            return (
              <div
                key={prob.id}
                onClick={() => setSelectedProblem(prob)}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-400 p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                    <span className="font-bold text-slate-800">{prob.id}</span>
                    <div className="flex items-center space-x-1.5">
                      {prob.priority && (
                        <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {prob.priority}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded font-bold border ${severityClass}`}>
                        {prob.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold border ${statusBadgeClass}`}>
                        {prob.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                    {prob.title}
                  </h3>

                  {prob.observation && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100 font-sans">
                      {prob.observation}
                    </p>
                  )}

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{prob.locationKmOrSection}</span>
                    </div>

                    {prob.exactKm !== undefined && (
                      <div className="text-[11px] font-mono text-slate-500 pl-5">
                        Chainage: <strong className="text-slate-800 font-bold">{prob.exactKm.toFixed(2)} KM</strong>
                        {prob.trackName && ` · Line: ${prob.trackName}`}
                      </div>
                    )}
                  </div>

                  {/* Related Task & Block Links */}
                  {(prob.relatedTaskId || prob.relatedBlockId) && (
                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-mono flex flex-wrap items-center gap-1.5">
                      {prob.relatedTaskId && (
                        <span className="text-sky-800 font-bold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                          Task: {prob.relatedTaskId}
                        </span>
                      )}
                      {prob.relatedBlockId && (
                        <span className="text-indigo-800 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          Block: {prob.relatedBlockId}
                        </span>
                      )}
                    </div>
                  )}

                  {prob.completionTime && (
                    <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Resolved: {new Date(prob.completionTime).toLocaleDateString()}</span>
                    </div>
                  )}

                  <div className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>{prob.category}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Reported: {new Date(prob.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center space-x-1 font-bold text-[#0b2545]">
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Log Issue */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Log Issue / Defect ({departmentName})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProblem} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                  Issue Summary / Defect Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Broken weld at turnout 102A / Dropped track circuit"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Issue Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Severity / Urgency
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  >
                    <option value="LOW">Low (Routine observation)</option>
                    <option value="MEDIUM">Medium (Requires attention)</option>
                    <option value="HIGH">High (Urgent inspection)</option>
                    <option value="CRITICAL">Critical (Safety hazard)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Corridor Section
                  </label>
                  <select
                    value={locationChoice}
                    onChange={(e) => setLocationChoice(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  >
                    {locationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Precise KM / Point / Pole
                  </label>
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="e.g. KM 18.4 Up Main or Mast 142/12"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                  Field Observation / Technical Notes *
                </label>
                <textarea
                  rows={4}
                  required
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Describe the physical condition observed, measurements (if any), suspected cause, and required block or maintenance action..."
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  This issue will be recorded as a maintenance/block requirement for {departmentName}. It does NOT generate operational train delays or fake simulated traffic impacts.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#0b2545] hover:bg-[#134074] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? "Logging Defect..." : "Save & Log Issue"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Problem Details & 7-Step Workflow Drawer */}
      {selectedProblem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-slate-200 text-slate-800">
                  {selectedProblem.id}
                </span>
                <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded border ${badgeColorClass}`}>
                  {departmentName}
                </span>
                <h3 className="font-bold text-slate-900 text-base">Issue Workflow Management</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProblem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Reported Issue
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">{selectedProblem.title}</h2>
              </div>

              {/* 7-Step Problem Workflow Stepper */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                  <span className="font-bold uppercase tracking-wider">7-Step Issue Resolution Stepper</span>
                  <span>
                    Current: <strong className="text-slate-900">{selectedProblem.status}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-center">
                  {PROBLEM_WORKFLOW_STEPS.map((step, idx) => {
                    const normCurrent = selectedProblem.status === "Problem Logged" ? "Issue Logged" : selectedProblem.status;
                    const currentIdx = PROBLEM_WORKFLOW_STEPS.indexOf(
                      normCurrent === "Rescheduled" ? "Issue Logged" : (normCurrent as any)
                    );
                    const isPassed = currentIdx >= idx && normCurrent !== "Rescheduled";
                    const isCurrent = normCurrent === step;

                    return (
                      <div
                        key={step}
                        className={`p-2 rounded-lg border text-[11px] flex flex-col items-center justify-center transition-all ${
                          isCurrent
                            ? "bg-[#0b2545] text-white border-[#0b2545] font-bold shadow-xs"
                            : isPassed
                            ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold"
                            : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}
                      >
                        <span className="text-[9px] block opacity-80 font-mono">#{idx + 1}</span>
                        <span className="leading-tight mt-0.5 text-center">{step}</span>
                      </div>
                    );
                  })}
                </div>

                {selectedProblem.status === "Rescheduled" && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg text-xs space-y-1">
                    <div className="font-bold flex items-center space-x-1">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Issue Status: Rescheduled / Postponed</span>
                    </div>
                    {selectedProblem.rescheduleReason && (
                      <p className="text-purple-800 font-mono text-[11px]">
                        Reason: {selectedProblem.rescheduleReason}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Problem Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Location</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{selectedProblem.locationKmOrSection}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Category</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{selectedProblem.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Severity / Priority</span>
                  <span className="font-bold text-slate-900 mt-0.5 block font-mono">{selectedProblem.severity} {selectedProblem.priority ? `(${selectedProblem.priority})` : ""}</span>
                </div>
                {selectedProblem.relatedTaskId && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Related Task</span>
                    <span className="font-bold text-sky-800 mt-0.5 block font-mono">{selectedProblem.relatedTaskId} ({selectedProblem.relatedTaskStatus || "ACTIVE"})</span>
                  </div>
                )}
                {selectedProblem.relatedBlockId && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Related Block</span>
                    <span className="font-bold text-indigo-800 mt-0.5 block font-mono">{selectedProblem.relatedBlockId} ({selectedProblem.relatedBlockStatus || "PLANNED"})</span>
                  </div>
                )}
                {selectedProblem.completionTime && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Resolved At</span>
                    <span className="font-bold text-emerald-800 mt-0.5 block font-mono">{new Date(selectedProblem.completionTime).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Observation text */}
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1">
                  Field Observation Notes
                </span>
                <p className="text-xs sm:text-sm text-slate-800 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed font-sans">
                  {selectedProblem.observation}
                </p>
              </div>

              {/* Audit */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500 pt-1">
                <span>Logged by: <strong className="text-slate-800">{selectedProblem.loggedBy}</strong></span>
                <span>Date: <strong className="text-slate-800">{new Date(selectedProblem.createdAt).toLocaleString()}</strong></span>
              </div>

              {/* Workflow Actions */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                  Advance Workflow Step
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Advance button */}
                  {getNextStatus(selectedProblem.status) && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedProblem.id, getNextStatus(selectedProblem.status)!)}
                      className="px-4 py-2 rounded-lg bg-[#0b2545] hover:bg-[#134074] text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Advance to: {getNextStatus(selectedProblem.status)}</span>
                    </button>
                  )}

                  {/* Reschedule Button */}
                  {selectedProblem.status !== "Completed" && (
                    <button
                      type="button"
                      onClick={() => setShowRescheduleInput(!showRescheduleInput)}
                      className="px-3 py-2 rounded-lg border border-purple-300 text-purple-900 bg-purple-50 hover:bg-purple-100 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reschedule / Postpone</span>
                    </button>
                  )}

                  {/* If completed or rescheduled, option to re-open */}
                  {(selectedProblem.status === "Completed" || selectedProblem.status === "Rescheduled") && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedProblem.id, "Issue Logged")}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                    >
                      Re-open Issue
                    </button>
                  )}
                </div>

                {/* Reschedule Reason Box */}
                {showRescheduleInput && (
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                    <label className="block text-xs font-bold font-mono text-purple-950 uppercase">
                      Enter Reason for Rescheduling / Postponement:
                    </label>
                    <input
                      type="text"
                      value={rescheduleReasonInput}
                      onChange={(e) => setRescheduleReasonInput(e.target.value)}
                      placeholder="e.g. Block window unavailable / Heavy rail traffic / Weather constraints"
                      className="w-full text-xs border border-purple-300 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowRescheduleInput(false)}
                        className="px-3 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateStatus(
                            selectedProblem.id,
                            "Rescheduled",
                            rescheduleReasonInput.trim() || "Rescheduled by department officer"
                          )
                        }
                        className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-xs font-bold cursor-pointer"
                      >
                        Confirm Reschedule
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
