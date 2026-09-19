import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { EventLogData } from "../types";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { History, Filter, Search, ShieldCheck } from "lucide-react";

export const EventsHistoryPage: React.FC = () => {
  const [events, setEvents] = useState<EventLogData[]>([]);
  const [filterEntity, setFilterEntity] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [filterEntity]);

  const loadEvents = async () => {
    try {
      const res = await api.getEvents(100, filterEntity === "ALL" ? undefined : filterEntity);
      setEvents(res);
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      e.actor.toLowerCase().includes(q) ||
      e.entity_id.toLowerCase().includes(q) ||
      (e.reason && e.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Operational Audit Trail & Event Ledger
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Immutable log of AI assessments, human approvals, overrides, blocks & movements
          </p>
        </div>
        <ProvenanceBadge type="DERIVED" />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Filter Entity:</span>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="p-1.5 border border-slate-300 rounded bg-slate-50 font-medium text-xs"
          >
            <option value="ALL">All Entities</option>
            <option value="FAULT">Faults & Observations</option>
            <option value="BLOCK">Maintenance Blocks</option>
            <option value="SCENARIO">Scenario Transitions</option>
            <option value="SYSTEM">System & Setup</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search actor, action or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs w-64"
            />
          </div>
          <button
            onClick={loadEvents}
            className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-mono uppercase text-[11px]">
              <tr>
                <th className="p-2.5 pl-4">Timestamp (UTC/IST)</th>
                <th className="p-2.5">Actor / Role</th>
                <th className="p-2.5">Entity</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">State Transition</th>
                <th className="p-2.5">Reason / Rationale</th>
                <th className="p-2.5 pr-4">Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2.5 pl-4 font-mono text-slate-500 whitespace-nowrap">
                    {e.timestamp ? new Date(e.timestamp).toLocaleTimeString("en-IN", { hour12: false }) : "—"}
                  </td>
                  <td className="p-2.5">
                    <span className="font-bold text-slate-800 block">{e.actor}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{e.role}</span>
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-700">
                    {e.entity}: {e.entity_id}
                  </td>
                  <td className="p-2.5 font-mono text-sky-800 font-semibold">{e.action}</td>
                  <td className="p-2.5 font-mono text-[11px]">
                    {e.previous_state ? (
                      <span>
                        <span className="text-slate-400">{e.previous_state}</span> &rarr;{" "}
                        <span className="font-bold text-slate-800">{e.new_state}</span>
                      </span>
                    ) : (
                      <span className="font-bold text-slate-800">{e.new_state}</span>
                    )}
                  </td>
                  <td className="p-2.5 text-slate-600 text-[11px] max-w-xs truncate" title={e.reason || ""}>
                    {e.reason || "—"}
                  </td>
                  <td className="p-2.5 pr-4">
                    <ProvenanceBadge type={e.provenance} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

