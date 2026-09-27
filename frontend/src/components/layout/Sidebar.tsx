import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
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
  TrendingUp,
  Compass,
  AlertTriangle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
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
  Compass: Compass,
};

export const Sidebar: React.FC = () => {
  const { user, currentRole } = useAuth();
  const location = useLocation();

  // Collapsible sidebar state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("krayasetu_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("krayasetu_sidebar_collapsed", String(next));
      } catch (e) {
        console.error("Failed to save sidebar state:", e);
      }
      return next;
    });
  };

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
      <aside className="w-64 bg-[var(--surface-card)] border-r border-[var(--border-subtle)] flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] shadow-xs items-center justify-center p-4">
        <div className="animate-pulse text-[var(--text-muted)] text-xs font-mono font-semibold">
          Resolving Persona Permissions...
        </div>
      </aside>
    );
  }

  const linkCount = currentRole.sidebarLinks.length;

  // Exact statutory safety protocol text per role (G&SR preservation) with generic fallback
  const getSafetyDirective = (roleKey?: string): string => {
    switch (roleKey) {
      case "CHIEF_BLOCK_OFFICER":
        return "Chief of Block Officer line-clear governs all physical block possessions and train precedence.";
      case "CORRIDOR_MASTER":
        return "Corridor Master monitors section throughput and resolves corridor bottleneck conflicts.";
      case "STATION_MASTER":
        return "Platform holding times and yard loop clearances must be reported prior to granting station approach.";
      case "TRACK_PWAY":
        return "Track machine blocks require banner flag protection and detonators 600m & 1200m from work site.";
      case "SIGNAL_SNT":
        return "S&T Disconnection Notice (T/351) requires Station Master consent and manual point clamping.";
      case "TRACTION_OHE":
        return "25kV power isolation must be verified via earth discharge rods before any tower wagon work commences.";
      case "TRAIN_PILOT":
        return "Promptly report visual track abnormalities, OHE sags/flashes, or signal anomalies for engineering verification.";
      default:
        return "Follow General & Subsidiary Rules (G&SR). All movements subject to divisional operating rules and line-clear clearances.";
    }
  };

  const safetyDirectiveText = getSafetyDirective(user?.roleKey);

  return (
    <aside
      className={`${
        isCollapsed ? "w-16" : "w-64"
      } bg-[var(--surface-card)] border-r border-[var(--border-subtle)] flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] shadow-xs select-none transition-all duration-200 ease-in-out`}
    >
      {/* Current Workspace Info / Header */}
      {isCollapsed ? (
        <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 flex flex-col items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)] transition-colors border border-[var(--border-subtle)]"
            title="Expand Sidebar"
            aria-label="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span
            className={`px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[10px] font-bold border font-mono uppercase text-center ${currentRole.badgeColor}`}
            title={`${currentRole.name} · ${currentRole.department}`}
          >
            {currentRole.name.slice(0, 3)}
          </span>
        </div>
      ) : (
        <div className="p-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 flex-shrink-0">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-[var(--radius-xs)] text-xs font-bold border font-mono uppercase ${currentRole.badgeColor}`}
            >
              {currentRole.name}
            </span>
            <div className="flex items-center space-x-1">
              {user?.username && (
                <span className="font-mono text-xs font-bold text-[var(--text-secondary)] bg-[var(--surface-tertiary)] px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--border-subtle)]">
                  {user.username}
                </span>
              )}
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-1 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)] transition-colors border border-[var(--border-subtle)] ml-1"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="text-sm font-bold text-[var(--text-primary)] truncate" title={currentRole.department}>
            {currentRole.department}
          </div>
          <div className="text-xs text-[var(--text-muted)] font-mono truncate mt-0.5">
            {currentRole.division} · {currentRole.zone}
          </div>
        </div>
      )}

      {/* Role-Specific Nav Links */}
      <nav className={`p-2.5 space-y-1.5 ${linkCount >= 6 ? "flex-1 overflow-y-auto" : "flex-shrink-0"}`}>
        {!isCollapsed && (
          <div className="px-2.5 py-1 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
            Assigned Workspaces ({linkCount})
          </div>
        )}

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

          if (isCollapsed) {
            return (
              <Link
                key={`${link.path}-${idx}`}
                to={targetPath}
                title={link.label}
                className={`flex items-center justify-center p-2.5 rounded-[var(--radius-lg)] text-sm transition-all duration-150 relative group ${
                  isLinkActive
                    ? "bg-[var(--brand-navy)] text-white shadow-xs font-bold border border-[var(--brand-navy-border)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] font-medium border border-transparent"
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isLinkActive ? "text-sky-300" : "text-[var(--text-muted)]"
                  }`}
                />
                {link.badge && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-sky-500 ring-1 ring-white" />
                )}
              </Link>
            );
          }

          return (
            <Link
              key={`${link.path}-${idx}`}
              to={targetPath}
              className={`flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-lg)] text-sm transition-all duration-150 ${
                isLinkActive
                  ? "bg-[var(--brand-navy)] text-white dark:text-white shadow-xs font-bold border border-[var(--brand-navy-border)] dark:border-slate-700"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] font-medium border border-transparent"
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isLinkActive ? "text-sky-300" : "text-[var(--text-muted)]"
                  }`}
                />
                <span className="truncate">{link.label}</span>
              </div>

              {link.badge && (
                <span
                  className={`ml-1.5 px-2 py-0.5 rounded-[var(--radius-xs)] text-xs font-mono font-bold tracking-tight ${
                    isLinkActive
                      ? "bg-white/20 text-white border border-white/20"
                      : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                  }`}
                >
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Operational Safety Protocol Callout */}
      {isCollapsed ? (
        <div
          className="m-2 p-2 rounded-[var(--radius-lg)] bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] text-[var(--status-warning-text)] flex flex-col items-center justify-center cursor-help"
          title={`Operational Safety Protocol (G&SR): ${safetyDirectiveText}`}
        >
          <AlertTriangle className="w-5 h-5 text-[var(--status-warning)]" />
          <span className="text-[9px] font-mono font-bold mt-1">G&SR</span>
        </div>
      ) : (
        <div
          className={`m-2.5 rounded-[var(--radius-xl)] bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] text-[var(--status-warning-text)] text-xs shadow-xs transition-all ${
            linkCount === 1
              ? "flex-1 flex flex-col justify-between p-4 space-y-3"
              : linkCount <= 3
              ? "flex-1 flex flex-col justify-between p-3.5 space-y-2.5"
              : "p-3 space-y-1.5 flex-shrink-0"
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 font-bold text-[var(--status-warning-text)]">
                <AlertTriangle className="w-4 h-4 text-[var(--status-warning)] flex-shrink-0" />
                <span>Operational Safety Protocol</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-card)]/80 text-[var(--status-warning-text)] border border-[var(--status-warning-border)] font-bold">
                G&SR
              </span>
            </div>

            <p className="text-xs leading-relaxed text-[var(--status-warning-text)] font-sans">
              {safetyDirectiveText}
            </p>
          </div>

          {linkCount === 1 && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-card)]/80 border border-[var(--status-warning-border)]/80 text-[11px] font-mono text-[var(--text-secondary)] space-y-2">
              <div className="font-bold text-[var(--text-primary)] flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Loco Pilot Safety Checkpoints:</span>
              </div>
              <ul className="space-y-1 text-[var(--text-muted)] pl-1">
                <li>• Brake pipe pressure ≥ 5.0 kg/cm²</li>
                <li>• Acknowledge caution orders & TSRs</li>
                <li>• Continuous VCD vigilance cycling</li>
                <li>• Report rail burns or OHE sparks</li>
              </ul>
            </div>
          )}

          <div className="pt-2 border-t border-[var(--status-warning-border)]/60 text-[10px] font-mono text-[var(--status-warning-text)] flex items-center justify-between">
            <span className="opacity-90">
              {linkCount === 1 ? "BPL Control Desk VHF" : "Statutory Directive"}
            </span>
            <span className="font-bold">
              {linkCount === 1 ? "Ch. 12 (150.1 MHz)" : "WCR / BPL Div (2026)"}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
