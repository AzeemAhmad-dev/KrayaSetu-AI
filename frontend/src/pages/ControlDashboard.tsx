import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { CorridorData, BlockData } from "../types";
import { RoleBlockTable } from "../components/blocks/RoleBlockTable";
import { Calendar, ShieldAlert, RefreshCw } from "lucide-react";
import { MasterNetworkMap } from "../components/network/MasterNetworkMap";
import { VisualJunctionHubs, VERIFIED_JUNCTION_HUBS } from "../components/network/VisualJunctionHubs";
import { NetworkSectionsView } from "../components/network/NetworkSectionsView";
import { CoaBlockManagement } from "../components/network/CoaBlockManagement";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import {
  Layers,
  Building2,
  GitBranch,
  Monitor,
  Activity,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Compass
} from "lucide-react";

export type CoaWorkspaceTab = "map" | "corridors" | "junctions" | "sections" | "block";

export const ControlDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get("tab") as CoaWorkspaceTab) || "map";

  const [corridors, setCorridors] = useState<CorridorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkBlocks, setNetworkBlocks] = useState<BlockData[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  const loadNetworkBlocks = async () => {
    setLoadingBlocks(true);
    try {
      const data = await api.getBlocks();
      setNetworkBlocks(data);
    } catch (e) {
      console.warn("Could not load network blocks for Master Map", e);
    } finally {
      setLoadingBlocks(false);
    }
  };

  useEffect(() => {
    loadNetworkBlocks();
  }, []);


  useEffect(() => {
    api.getCorridors()
      .then(setCorridors)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTabChange = (tab: CoaWorkspaceTab) => {
    setSearchParams({ tab });
  };

  if (loading && corridors.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono">
        Loading Divisional Network Infrastructure...
      </div>
    );
  }

  const tabs: {
    key: CoaWorkspaceTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    {
      key: "map",
      label: "Master Network Map",
      icon: Monitor,
    },
    {
      key: "corridors",
      label: "Corridor Directory",
      icon: Activity,
      badge: `${corridors.length || 5}`,
    },
    {
      key: "junctions",
      label: "Visual Junction Hubs",
      icon: Building2,
      badge: `${VERIFIED_JUNCTION_HUBS.length}`,
    },
    {
      key: "sections",
      label: "Sections",
      icon: Layers,
    },
    {
      key: "block",
      label: "Block",
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans">
      {/* 1. TOP INFRASTRUCTURE HEADER */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#0b2545] text-white flex-shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Chief of Block Operations (COA) · Master Control Workspace
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                BHOPAL DIVISION RAILWAY NETWORK (WCR)
              </h1>
            </div>
          </div>

        </div>

        {/* Infrastructure Telemetry Strip */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-700">
            <div>
              Corridors: <strong>{corridors.length || 5} Corridors</strong>
            </div>
            <div>
              Route Coverage: <strong>765 Track KM</strong>
            </div>
            <div>
              Stations: <strong>76 Stations</strong>
            </div>
            <div>
              Traction: <strong>100% 25 kV AC 50 Hz OHE</strong>
            </div>
            <div>
              Interlocking: <strong>Electronic Interlocking (EI)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ASSIGNED WORKSPACE TOP-LEVEL NAVIGATION TABS */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5 select-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;

          return (
            <button
              key={`coa-tab-${tab.key}`}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 min-w-[150px] sm:min-w-[180px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all flex items-center justify-center sm:justify-start space-x-2 cursor-pointer ${
                isActive
                  ? "bg-[#0b2545] text-white shadow-sm"
                  : "bg-slate-50/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? "text-sky-300" : "text-slate-500"
                }`}
              />
              <span className="truncate">{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ml-auto ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENT */}
      {/* Tab 1: Master Network Map */}
      {currentTab === "map" && (
        <div className="space-y-5">
          <MasterNetworkMap />

          {/* 2. OPERATIONAL MIDDLE LAYER: Active / Scheduled Maintenance Tasks & Blocks */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-[#0b2545] text-white">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                    Active & Scheduled Maintenance Possessions ({networkBlocks.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Division-wide operational locks and coordinated possessions scheduled across all 5 corridors
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={loadNetworkBlocks}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingBlocks ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("block")}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#0b2545] hover:bg-sky-900 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Open Full Block Management →
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Total Blocks</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{networkBlocks.length}</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <div className="text-rose-700 text-[10px] uppercase font-bold">Critical Priority</div>
                <div className="text-lg font-black text-rose-900 mt-0.5">
                  {networkBlocks.filter(b => b.task_priority === "CRITICAL").length}
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="text-purple-700 text-[10px] uppercase font-bold">Multi-Department</div>
                <div className="text-lg font-black text-purple-900 mt-0.5">
                  {networkBlocks.filter(b => b.is_multi_department || (b.departments && b.departments.length > 1)).length}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-emerald-700 text-[10px] uppercase font-bold">Cleared / Selected</div>
                <div className="text-lg font-black text-emerald-900 mt-0.5">
                  {networkBlocks.filter(b => b.status === "SELECTED" || b.status === "APPROVED").length}
                </div>
              </div>
            </div>

            {/* Blocks Table or Empty State */}
            {networkBlocks.length > 0 ? (
              <RoleBlockTable
                blocks={networkBlocks}
                title="Divisional Network Planned Possessions"
                subtitle="Live Section 19 possessory schedule synchronized from Central Block Optimizer"
                showDepartmentColumn={true}
              />
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Possessory Blocks Currently Active</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Possessions generated and approved in the Block Planner will appear here across all 5 corridors as the single operational source of truth.
                </p>
              </div>
            )}
          </div>


          {/* Three Summary Directory Panels below the Master Network Map */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Panel 1: Corridor Directory Summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 font-semibold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-sky-700" />
                  <span>Corridor Directory ({corridors.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange("corridors")}
                  className="text-xs text-sky-700 hover:text-sky-900 font-bold"
                >
                  View All →
                </button>
              </div>

              <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[280px] text-xs">
                {corridors.map((c) => (
                  <div key={c.id} className="py-2.5 first:pt-0 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold font-mono text-slate-900">{c.code}</span>
                        <span className="text-xs text-slate-800 font-medium truncate max-w-[160px]">{c.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">
                        {c.total_distance_km} KM · {c.track_configuration.replace(/_/g, " ")}
                      </div>
                    </div>

                    <Link
                      to={`/corridors/${c.id}`}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-[#0b2545] hover:text-white rounded border border-slate-300 font-semibold transition-colors"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: Major Junction Infrastructure Hubs Summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 font-semibold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-sky-700" />
                  <span>Major Junction Hubs</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange("junctions")}
                  className="text-xs text-sky-700 hover:text-sky-900 font-bold"
                >
                  View All →
                </button>
              </div>

              <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[280px] text-xs">
                {VERIFIED_JUNCTION_HUBS.slice(0, 5).map((j) => (
                  <div key={j.code} className="py-2.5 first:pt-0 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5 font-semibold">
                        <span className="text-slate-900">{j.name}</span>
                        <span className="font-mono text-sky-800 font-bold">({j.code})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px] font-mono">
                        {j.interchangeType}
                      </div>
                    </div>
                    <span className="text-sky-700 font-mono font-bold text-xs bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      {j.platforms} PF
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 3: Network Engineering & Track Standards */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 font-semibold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Engineering Track Standards</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange("sections")}
                  className="text-xs text-sky-700 hover:text-sky-900 font-bold"
                >
                  Sections →
                </button>
              </div>

              <div className="p-3.5 space-y-2.5 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Rail Profile</div>
                  <div className="font-semibold text-slate-900 mt-0.5">60 kg / 90 UTS Continuous Welded Rail (LWR/CWR)</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Sleeper & Ballast</div>
                  <div className="font-semibold text-slate-900 mt-0.5">Prestressed Concrete (PSC-1660/km) · 300mm Cushion</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Traction Architecture</div>
                  <div className="font-semibold text-slate-900 mt-0.5">25 kV AC 50 Hz Traction with OHE Auto-Tensioning</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Corridor Directory */}
      {currentTab === "corridors" && (
        <div className="space-y-5">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-800 font-mono">
                CORRIDOR DIRECTORY · DIVISIONAL ROUTE INVENTORY
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-1">
                Active Railway Corridors ({corridors.length} Corridors)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Full directory of all 5 operational corridors in Bhopal Division with track geometry and speed ceilings.
              </p>
            </div>
            <ProvenanceBadge type="REAL_PUBLIC" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {corridors.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-[#0b2545] text-white">
                      {c.id}
                    </span>
                    <span className="text-xs font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      {c.track_configuration.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {c.name}
                    </h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Code: {c.code} · Type: {c.type}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {c.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono pt-1">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-slate-500 text-[9px] uppercase font-bold">Distance</div>
                      <div className="font-bold text-slate-900 mt-0.5">{c.total_distance_km} KM</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-slate-500 text-[9px] uppercase font-bold">Max Speed</div>
                      <div className="font-bold text-sky-800 mt-0.5">{c.max_permissible_speed_kmph} km/h</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-slate-500 text-[9px] uppercase font-bold">Traction</div>
                      <div className="font-bold text-emerald-700 mt-0.5">25 kV AC</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
                  <Link
                    to={`/corridors/${c.id}`}
                    className="w-full py-2 px-3 bg-[#0b2545] hover:bg-sky-900 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <span>Open Corridor Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Visual Junction Hubs */}
      {currentTab === "junctions" && <VisualJunctionHubs />}

      {/* Tab 4: Sections */}
      {currentTab === "sections" && <NetworkSectionsView />}

      {/* Tab 5: Block */}
      {currentTab === "block" && <CoaBlockManagement />}
    </div>
  );
};
