import React from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Radio,
  Calendar,
  CalendarRange,
  GitMerge,
  Users,
  Wrench,
  Cpu,
  Clock,
  AlertTriangle,
  Zap,
  FileCheck,
  Layers,
  BarChart3,
  ShieldAlert,
  Building2,
  Train,
  Hammer,
  Sliders,
  ClipboardEdit,
  TrendingUp
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Monitor: LayoutDashboard,
  Activity: Activity,
  Radio: Radio,
  Building2: Building2,
  Calendar: Calendar,
  CalendarRange: CalendarRange,
  GitMerge: GitMerge,
  Users: Users,
  Wrench: Wrench,
  Cpu: Cpu,
  Clock: Clock,
  Zap: Zap,
  FileCheck: FileCheck,
  Layers: Layers,
  BarChart3: BarChart3,
  Train: Train,
  Hammer: Hammer,
  Sliders: Sliders,
  ShieldAlert: ShieldAlert,
  ClipboardEdit: ClipboardEdit,
  TrendingUp: TrendingUp,
};

export const Sidebar: React.FC = () => {
  const { user, currentRole } = useAuth();
  const location = useLocation();

  // Dynamically resolve active corridor ID for Corridor Master role
  const activeCorridorId =
    location.pathname.match(/\/corridors\/([A-Za-z0-9_-]+)/)?.[1] ||
    localStorage.getItem("krayasetu_selected_corridor") ||
    "CORR-01";

  // Dynamically resolve active station code for Station Master role
  const activeStationCode =
    location.pathname.match(/\/station-master\/([A-Za-z0-9_-]+)/)?.[1] ||
    localStorage.getItem("krayasetu_selected_station") ||
    "RKMP";

  if (!currentRole) {
    return (
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] shadow-xs items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm font-mono font-semibold">Resolving Persona Permissions...</div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] shadow-xs">
      {/* Current Workspace Info */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className={`px-2.5 py-0.5 rounded text-xs font-bold border font-mono uppercase ${currentRole.badgeColor}`}>
            {currentRole.name}
          </span>
          {user?.username && (
            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
              {user.username}
            </span>
          )}
        </div>
        <div className="text-sm font-bold text-slate-900 truncate">
          {currentRole.department}
        </div>
        <div className="text-xs text-slate-500 font-mono truncate mt-0.5">
          {currentRole.division} · {currentRole.zone}
        </div>
      </div>

      {/* Role-Specific Nav Links */}
      <nav className="p-2.5 space-y-1.5 flex-1">
        <div className="px-2.5 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Assigned Workspaces
        </div>
        {currentRole.sidebarLinks.map((link, idx) => {
          const Icon = ICON_MAP[link.iconName] || LayoutDashboard;

          // Replace CORR-01 with active corridor ID if Corridor Master
          let targetPath = link.path;
          if (
            (user?.roleKey === "CORRIDOR_MASTER" || currentRole.id === "CORRIDOR_MASTER") &&
            targetPath.includes("/corridors/CORR-01")
          ) {
            targetPath = targetPath.replace("/corridors/CORR-01", `/corridors/${activeCorridorId}`);
          }

          // Replace /station-master with active station code if Station Master
          if (
            (user?.roleKey === "STATION_MASTER" || currentRole.id === "STATION_MASTER") &&
            targetPath.startsWith("/station-master")
          ) {
            targetPath = targetPath.replace(
              /^\/station-master/,
              `/station-master/${activeStationCode.toUpperCase()}`
            );
          }

          // Determine active status considering query params (e.g. ?tab=corridors)
          const currentFullPath = `${location.pathname}${location.search}`;
          let isLinkActive = false;

          if (targetPath.includes("?")) {
            isLinkActive = currentFullPath === targetPath;
          } else if (targetPath === "/control") {
            isLinkActive =
              location.pathname === "/control" &&
              (!location.search || location.search === "?tab=map");
          } else if (targetPath.startsWith("/station-master/")) {
            isLinkActive =
              location.pathname === targetPath &&
              (!location.search || location.search === "?tab=infrastructure");
          } else if (targetPath === "/corridors") {
            isLinkActive = location.pathname === "/corridors";
          } else {
            isLinkActive = location.pathname === targetPath || location.pathname.startsWith(targetPath + "/");
          }

          return (
            <Link
              key={`${link.path}-${idx}`}
              to={targetPath}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isLinkActive
                  ? "bg-[#0b2545] text-white shadow-xs font-semibold"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium"
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isLinkActive ? "text-sky-300" : "text-slate-500"}`} />
                <span className="truncate">{link.label}</span>
              </div>
              {link.badge && (
                <span className={`ml-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  isLinkActive ? "bg-white/20 text-white" : "bg-sky-100 text-sky-800 border border-sky-200"
                }`}>
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Domain notice box tailored for the role */}
      <div className="p-3 m-2.5 bg-amber-50/90 rounded-xl border border-amber-200 text-amber-900 text-xs">
        <div className="flex items-center space-x-1.5 font-bold text-amber-900 mb-1">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Operational Safety Protocol</span>
        </div>
        <p className="text-xs leading-relaxed text-amber-800">
          {user?.roleKey === "CHIEF_BLOCK_OFFICER" &&
            "Chief of Block Officer line-clear governs all physical block possessions and train precedence."}
          {user?.roleKey === "CORRIDOR_MASTER" &&
            "Corridor Master monitors section throughput and resolves corridor bottleneck conflicts."}
          {user?.roleKey === "STATION_MASTER" &&
            "Platform holding times and yard loop clearances must be reported prior to granting station approach."}
          {user?.roleKey === "TRACK_PWAY" &&
            "Track machine blocks require banner flag protection and detonators 600m & 1200m from work site."}
          {user?.roleKey === "SIGNAL_SNT" &&
            "S&T Disconnection Notice (T/351) requires Station Master consent and manual point clamping."}
          {user?.roleKey === "TRACTION_OHE" &&
            "25kV power isolation must be verified via earth discharge rods before any tower wagon work commences."}
          {user?.roleKey === "TRAIN_PILOT" &&
            "Promptly report visual track abnormalities, OHE sags/flashes, or signal anomalies for engineering verification."}
          {!user && "All movements subject to divisional operating rules and line-clear clearances."}
        </p>
      </div>
    </aside>
  );
};
