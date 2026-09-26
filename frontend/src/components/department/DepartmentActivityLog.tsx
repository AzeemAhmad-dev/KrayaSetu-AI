import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { EventLogData } from "../../types";
import { History, ShieldCheck, Search, RefreshCw, CheckCircle2, Send } from "lucide-react";

interface DepartmentActivityLogProps {
  department: "PWAY" | "TRD" | "SNT";
  departmentName: string;
  accentColor?: "orange" | "cyan" | "amber";
}

export const DepartmentActivityLog: React.FC<DepartmentActivityLogProps> = ({
  department,
  departmentName,
  accentColor = "orange",
}) => {
  const [events, setEvents] = useState<EventLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents(100, undefined, department);
      setEvents(data);
    } catch (err) {
      console.error("Failed to load department logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [department]);

  const filtered = events.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.action && e.action.toLowerCase().includes(q)) ||
      (e.actor && e.actor.toLowerCase().includes(q)) ||
      (e.entity_id && e.entity_id.toLowerCase().includes(q)) ||
      ((e as any).task_id && (e as any).task_id.toLowerCase().includes(q)) ||
      ((e as any).block_id && (e as any).block_id.toLowerCase().includes(q)) ||
      (e.reason && e.reason.toLowerCase().includes(q))
    );
  });

  const getActionBadge = (action: string, newState: string) => {
    if (action.includes("APPROVED") || newState === "APPROVED" || action.includes("CONFIRMED")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center space-x-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
          <span>{action}</span>
        </span>
      );
    }
    if (action.includes("COMPLETED") || newState === "COMPLETED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center space-x-1">
          <ShieldCheck className="w-3 h-3 text-blue-700" />
          <span>COMPLETED</span>
        </span>
      );
    }
    if (action.includes("SUBMITTED") || newState === "PENDING_APPROVAL") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center space-x-1">
          <Send className="w-3 h-3 text-amber-700" />
          <span>SUBMITTED</span>
        </span>
      );
    }
    if (action.includes("REJECTED")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-900 border border-red-300">
          REJECTED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
        {action}
      </span>
    );
  };

  const badgeColorClass =
    accentColor === "orange"
      ? "bg-orange-100 text-orange-900 border-orange-300"
      : accentColor === "cyan"
      ? "bg-cyan-100 text-cyan-900 border-cyan-300"
      : "bg-amber-100 text-amber-900 border-amber-300";

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Department Activity &amp; Task Audit Log
              </h2>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${badgeColorClass}`}>
                {departmentName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable operational audit trail for {departmentName} tasks, block clearances, and engineer approvals
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search Task ID, Actor, Action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs w-56 font-mono"
            />
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Log"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Timestamp (IST)</th>
                <th className="py-2.5 px-3">Task ID / Entity</th>
                <th className="py-2.5 px-3">Parent Block</th>
                <th className="py-2.5 px-3">Responsible User / Role</th>
                <th className="py-2.5 px-3">Action &amp; State</th>
                <th className="py-2.5 px-3">Reason / Operational Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                    <History className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <span>No activity logs found for {departmentName}.</span>
                  </td>
                </tr>
              ) : (
                filtered.map((e: any) => {
                  const dateStr = e.timestamp ? new Date(e.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—";
                  const taskId = e.task_id || (e.entity === "TASK" ? e.entity_id : null);
                  const blockId = e.block_id || (e.entity === "BLOCK" ? e.entity_id : null);

                  return (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {taskId ? (
                          <div className="flex flex-col">
                            <span className="text-sky-900">{taskId}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{e.entity}</span>
                          </div>
                        ) : (
                          <span>{e.entity_id}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {blockId ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold">
                            {blockId}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{e.actor}</div>
                        <div className="text-[10px] font-mono text-slate-500">{e.role}</div>
                      </td>
                      <td className="py-3 px-3">
                        {getActionBadge(e.action, e.new_state)}
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs text-[11px]">
                        <p className="line-clamp-2">{e.reason || "—"}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
