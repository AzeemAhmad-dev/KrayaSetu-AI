import React, { useState, useEffect } from "react";
import {
  Calendar,
  CalendarRange,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Users,
  ChevronRight,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  FileText
} from "lucide-react";
import { DepartmentTask, TaskWorkflowStatus } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatDistanceKm, formatKmValue } from "../../utils/formatDistance";
import { isDailyBlock, isWeeklyBlock, isMonthlyBlock } from "../../utils/plannedBlocksHelper";

const TASK_EXECUTION_STEPS: TaskWorkflowStatus[] = [
  "Block Approved",
  "Team Going",
  "Work Started",
  "Completed",
];

const LIFECYCLE_STEPS: TaskWorkflowStatus[] = [
  "Awaiting COBO Sanction",
  "Block Approved",
  "Team Going",
  "Work Started",
  "Completed",
];

interface DepartmentTaskSectionProps {
  department: "PWAY" | "SNT" | "TRD";
  departmentName: string;
  cadence: "CURRENT" | "WEEKLY" | "MONTHLY";
  storageKey: string;
  accentColor: "orange" | "cyan" | "amber";
  locationOptions?: string[];
}

export const DepartmentTaskSection: React.FC<DepartmentTaskSectionProps> = ({
  department,
  departmentName,
  cadence,
  storageKey,
  accentColor,
}) => {
  const { user } = useAuth();

  const [backendBlocks, setBackendBlocks] = useState<any[]>([]);
  const [plannedActivities, setPlannedActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [localOverrides, setLocalOverrides] = useState<Record<string, { status: TaskWorkflowStatus; reason?: string }>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const map: Record<string, { status: TaskWorkflowStatus; reason?: string }> = {};
          parsed.forEach((t: any) => {
            if (t.id && t.status) map[t.id] = { status: t.status, reason: t.rescheduleReason };
          });
          return map;
        }
        return parsed;
      }
    } catch (e) {
      console.warn("Could not read overrides from storage", e);
    }
    return {};
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [blks, acts] = await Promise.all([
        cadence !== "CURRENT"
          ? api.getBlocks(undefined, undefined, department, undefined, undefined, true).catch(() => [])
          : Promise.resolve([]),
        api.getPlannedActivities({ department_id: department, cadence }).catch(() => [])
      ]);
      const filteredBlks = (blks || []).filter((b: any) => {
        if (cadence === "WEEKLY") return isWeeklyBlock(b);
        if (cadence === "MONTHLY") return isMonthlyBlock(b);
        return isDailyBlock(b);
      });
      setBackendBlocks(filteredBlks);
      setPlannedActivities(acts || []);
    } catch (e) {
      console.warn("Could not load tasks/activities for department", department, e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [department, cadence]);

  // Sync localOverrides to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(localOverrides));
    } catch (e) {
      console.warn("Could not save overrides to storage", e);
    }
  }, [localOverrides, storageKey]);

  // Map planned activities into tasks
  const plannedMapped: DepartmentTask[] = plannedActivities.map((a: any) => {
    const override = localOverrides[a.id];
    let statusText: TaskWorkflowStatus = "Block Approved";
    if (a.status === "COMPLETED") statusText = "Completed";
    else if (a.status === "IN_PROGRESS") statusText = "Work Started";
    else if (a.is_due_now || a.status === "DUE_NOW") statusText = "Work Started";

    const locDesc = `${a.corridor_id} · ${a.location_description} (KM ${Number(a.location_km).toFixed(2)}) · Track: ${a.track_name || "DOWN_MAIN"}`;
    const dateLabel = a.scheduled_date === "2026-09-25" ? `Today, ${a.start_time}–${a.end_time}` : `${a.scheduled_date}, ${a.start_time}–${a.end_time}`;

    return {
      id: a.id,
      department,
      cadence,
      title: a.title,
      sectionOrLocation: locDesc,
      targetDate: dateLabel,
      priority: a.priority === "CRITICAL" ? "SAFETY_CRITICAL" : a.priority === "HIGH" ? "PRIORITY" : "ROUTINE",
      assignedGangOrSupervisor: a.assigned_crew || "Department Maintenance Squad",
      estimatedDurationHours: Math.round((a.duration_mins || 120) / 60),
      description: a.description || "Scheduled preventive infrastructure maintenance.",
      status: override ? override.status : statusText,
      rescheduleReason: override ? override.reason : undefined,
      createdAt: a.created_at || new Date().toISOString(),
      createdBy: "Central Maintenance Planning Cell",
      backendBlockStatus: "SANCTIONED",
      isCoboApproved: true,
      backendTaskId: a.id,
    };
  });

  // Map backend blocks into tasks with localOverrides
  const blockMapped: DepartmentTask[] = backendBlocks.map((b) => {
    const override = localOverrides[b.id];
    const isCoboApproved = b.status === "APPROVED" || b.status === "SELECTED";
    
    // Find the specific task for this department in bundled/associated tasks
    const deptTask = b.tasks?.find((t: any) => t.department_id === department) || 
      (b.task_id ? { id: b.task_id, status: b.task_status, title: b.task_title } : null);
    
    const isCompletedInDb = deptTask?.status === "COMPLETED";
    const initialStatus: TaskWorkflowStatus = isCompletedInDb
      ? "Completed"
      : isCoboApproved
      ? "Block Approved"
      : "Awaiting COBO Sanction";

    const taskTitle = deptTask?.title || b.task_title || (b.task_id ? `Assigned Track Block for ${b.task_id}` : `Possession: ${b.corridor_id} ${b.track_name}`);
    const secLoc = `${b.corridor_id} · ${b.section_name || b.section_id} · Track ${b.track_name} (KM ${formatKmValue(b.location_km)})`;
    const targetDate = `${b.date || "2026-09-25"} (${b.requested_start_time} - ${b.requested_end_time})`;

    return {
      id: b.id,
      department,
      cadence,
      title: taskTitle,
      sectionOrLocation: secLoc,
      targetDate,
      priority: b.task_priority === "CRITICAL" ? "SAFETY_CRITICAL" : b.task_priority === "HIGH" ? "PRIORITY" : "ROUTINE",
      assignedGangOrSupervisor: b.assigned_machine || "Track Maintenance Gang / Field Squad",
      estimatedDurationHours: Math.round((b.duration_mins || 120) / 60),
      description: b.conflict_summary || (b.is_multi_department ? `Joint block coordinated with ${b.participating_departments}` : "Operational maintenance possession window"),
      status: override ? override.status : initialStatus,
      rescheduleReason: override ? override.reason : undefined,
      createdAt: b.created_at || new Date().toISOString(),
      createdBy: b.proposed_by || "Divisional Operations Control",
      backendBlockStatus: b.status,
      isCoboApproved,
      backendTaskId: deptTask?.id || b.task_id,
      completed_at: deptTask?.completed_at,
    };
  });

  const tasks: DepartmentTask[] = [...plannedMapped, ...blockMapped];

  // Selected task drawer state
  const [selectedTask, setSelectedTask] = useState<DepartmentTask | null>(null);
  const [rescheduleReasonInput, setRescheduleReasonInput] = useState("");
  const [showRescheduleInput, setShowRescheduleInput] = useState(false);

  const handleUpdateStatus = async (taskId: string, newStatus: TaskWorkflowStatus, reason?: string) => {
    setLocalOverrides((prev) => ({
      ...prev,
      [taskId]: { status: newStatus, reason },
    }));

    const currentTask = tasks.find((t) => t.id === taskId);
    const realBackendTaskId = currentTask?.backendTaskId || (taskId.startsWith("TASK-") ? taskId : undefined);

    if (taskId.startsWith("ACT-")) {
      try {
        await api.updatePlannedActivityStatus(
          taskId,
          newStatus === "Completed" ? "COMPLETED" : "IN_PROGRESS"
        );
      } catch (e) {
        console.warn("Could not sync planned activity status to backend:", e);
      }
    } else if (realBackendTaskId) {
      if (newStatus === "Completed") {
        try {
          await api.completeTask(realBackendTaskId, {
            completed_by: `${user?.name || "Field Engineer"} (${department})`,
            notes: reason || `Work completed by ${department} field gang`,
          });
        } catch (e) {
          console.warn("Could not sync task completion to backend:", e);
        }
      } else {
        try {
          await api.updateTaskStatus(
            realBackendTaskId,
            newStatus === "Work Started" || newStatus === "Team Going" ? "IN_PROGRESS" : "PENDING",
            reason,
            `${user?.name || "Field Engineer"} (${department})`
          );
        } catch (e) {
          console.warn("Could not sync task status to backend:", e);
        }
      }
    }

    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) =>
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

  const getNextStatus = (current: TaskWorkflowStatus, isCoboApproved: boolean = true): TaskWorkflowStatus | null => {
    if (!isCoboApproved || current === "Awaiting COBO Sanction" || current === "Planned") {
      return null;
    }
    const idx = TASK_EXECUTION_STEPS.indexOf(current);
    if (idx >= 0 && idx < TASK_EXECUTION_STEPS.length - 1) {
      return TASK_EXECUTION_STEPS[idx + 1];
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
      {/* Top Header Strip (View Only — No Add Option) */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
            {cadence === "WEEKLY" ? <Calendar className="w-5 h-5" /> : <CalendarRange className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {cadence === "WEEKLY" ? "Weekly Assigned Tasks" : "Monthly Assigned Tasks"}
              </h2>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${badgeColorClass}`}>
                {departmentName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {cadence === "WEEKLY"
                ? "Weekly maintenance schedule and routine inspections assigned to this department"
                : "Monthly possession schedules, periodic overhauls, and major possession cycles"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-slate-500">
            Assigned Tasks: <strong className="text-slate-900 font-bold">{tasks.length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono font-bold">
            VIEW & EXECUTION MODE
          </span>
        </div>
      </div>

      {/* Task List / Empty State (Strictly Empty by default, No Add Option) */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
            {cadence === "WEEKLY" ? <Calendar className="w-7 h-7" /> : <CalendarRange className="w-7 h-7" />}
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            No {cadence === "WEEKLY" ? "Weekly" : "Monthly"} Tasks Assigned
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            There are currently no {cadence.toLowerCase()} maintenance tasks assigned to the{" "}
            <strong>{departmentName}</strong> department. Tasks issued by central division control will appear here for workflow tracking and field execution.
          </p>
          <div className="mt-4">
            <span className="inline-block text-[11px] font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Department users cannot manually create {cadence.toLowerCase()} tasks · Assigned by Division
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => {
            const isCompleted = task.status === "Completed";
            const isRescheduled = task.status === "Rescheduled";

            let statusBadgeClass = "bg-sky-100 text-sky-900 border-sky-300";
            if (isCompleted) statusBadgeClass = "bg-emerald-100 text-emerald-900 border-emerald-300";
            if (isRescheduled) statusBadgeClass = "bg-purple-100 text-purple-900 border-purple-300";
            if (task.status === "Team Going" || task.status === "Work Started")
              statusBadgeClass = "bg-amber-100 text-amber-900 border-amber-300";

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-400 p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                    <span className="font-bold text-slate-500">{task.id}</span>
                    <span className={`px-2 py-0.5 rounded font-bold border ${statusBadgeClass}`}>
                      {task.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                    {task.title}
                  </h3>

                  <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{task.sectionOrLocation}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.targetDate || "No target date"}</span>
                  </div>
                  <div className="flex items-center space-x-1 font-bold text-[#0b2545]">
                    <span>Manage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Details & Workflow Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-slate-200 text-slate-800">
                  {selectedTask.id}
                </span>
                <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded border ${badgeColorClass}`}>
                  {cadence === "WEEKLY" ? "Weekly" : "Monthly"}
                </span>
                <h3 className="font-bold text-slate-900 text-base">Task Details & Workflow</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Title & Status */}
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Assigned Maintenance Scope
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">{selectedTask.title}</h2>
              </div>

              {/* 5-Step Workflow Progression Stepper */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                  <span className="font-bold uppercase tracking-wider">Operational Workflow Progression</span>
                  <span>
                    Status: <strong className="text-slate-900">{selectedTask.status}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const currentIdx = LIFECYCLE_STEPS.indexOf(
                      selectedTask.status === "Rescheduled" ? "Awaiting COBO Sanction" : selectedTask.status
                    );
                    const isPassed = currentIdx >= idx && selectedTask.status !== "Rescheduled";
                    const isCurrent = selectedTask.status === step;

                    return (
                      <div
                        key={step}
                        className={`p-2 rounded-lg border text-xs flex flex-col items-center justify-center transition-all ${
                          isCurrent
                            ? "bg-[#0b2545] text-white border-[#0b2545] font-bold shadow-xs"
                            : isPassed
                            ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold"
                            : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}
                      >
                        <span className="text-[10px] block opacity-80">Step {idx + 1}</span>
                        <span className="leading-tight mt-0.5">{step}</span>
                      </div>
                    );
                  })}
                </div>

                {selectedTask.status === "Rescheduled" && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg text-xs space-y-1">
                    <div className="font-bold flex items-center space-x-1">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Task Status: Rescheduled / Postponed</span>
                    </div>
                    {selectedTask.rescheduleReason && (
                      <p className="text-purple-800 font-mono text-[11px]">
                        Reason: {selectedTask.rescheduleReason}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Task Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Location</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{selectedTask.sectionOrLocation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Target Date</span>
                  <span className="font-bold text-slate-900 mt-0.5 block font-mono">{selectedTask.targetDate || "Scheduled"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Duration</span>
                  <span className="font-bold text-slate-900 mt-0.5 block font-mono">
                    {selectedTask.estimatedDurationHours || 2} Hours
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Priority</span>
                  <span className="font-bold text-slate-900 mt-0.5 block font-mono">{selectedTask.priority}</span>
                </div>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1">
                    Scope of Work & Instructions
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed font-sans">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {/* Assigned Team & Audit */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500 pt-1">
                <span>
                  Assigned Gang: <strong className="text-slate-800">{selectedTask.assignedGangOrSupervisor || "Department Gang"}</strong>
                </span>
                <span>
                  Assigned by: <strong className="text-slate-800">{selectedTask.createdBy || "Division Control"}</strong>
                </span>
              </div>

              {/* Workflow Actions */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                  Update Workflow Status
                </div>

                {!selectedTask.isCoboApproved ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-xs text-amber-900">
                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold block text-amber-950 font-mono">
                        AWAITING COBO BLOCK SANCTION
                      </span>
                      <p className="text-amber-800 leading-relaxed">
                        This maintenance possession is in <strong>{selectedTask.backendBlockStatus || "PROPOSED"}</strong> status. Operational block sanction is held under the sole authority of the Chief of Block Officer (COBO) at the Joint Coordination Desk. Field teams cannot be dispatched until sanctioned.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Advance to next workflow step */}
                    {getNextStatus(selectedTask.status, true) && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedTask.id, getNextStatus(selectedTask.status, true)!)}
                        className="px-4 py-2 rounded-lg bg-[#0b2545] hover:bg-[#134074] text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>Dispatch / Advance: {getNextStatus(selectedTask.status, true)}</span>
                      </button>
                    )}

                    {/* Reschedule Button */}
                    {selectedTask.status !== "Completed" && (
                      <button
                        type="button"
                        onClick={() => setShowRescheduleInput(!showRescheduleInput)}
                        className="px-3 py-2 rounded-lg border border-purple-300 text-purple-900 bg-purple-50 hover:bg-purple-100 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Request Re-plan / Reschedule</span>
                      </button>
                    )}

                    {/* If already completed or rescheduled, option to re-open */}
                    {(selectedTask.status === "Completed" || selectedTask.status === "Rescheduled") && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedTask.id, "Block Approved")}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                      >
                        Re-open / Set to Approved
                      </button>
                    )}
                  </div>
                )}

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
                      placeholder="e.g. Unfavorable weather / Material shortage / Train regulation delay"
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
                            selectedTask.id,
                            "Rescheduled",
                            rescheduleReasonInput.trim() || "Rescheduled by department supervisor"
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
