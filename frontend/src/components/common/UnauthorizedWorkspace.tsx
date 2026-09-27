import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowRight, UserCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { EmptyState } from "../ui/EmptyState";
import { RoleBadge } from "../ui/Badge";

interface UnauthorizedWorkspaceProps {
  attemptedPath: string;
}

const WORKSPACE_NAMES: Record<string, string> = {
  "/operations-control": "Divisional Operations Control",
  "/baseline-comparison": "Department-Baseline Comparison & Impact Assessment",
  "/marey-diagram": "Live Marey Train-Time-Distance Diagram",
  "/block-planner": "CP-SAT Block Planning Engine",
  "/planner": "CP-SAT Block Planning Engine",
  "/coordination": "Inter-Department Joint Coordination Desk",
  "/control": "Master Central Network Map",
  "/corridors": "Corridor Control Workspace",
  "/station-master": "Station Master Workspace",
  "/pway-control": "Civil Engineering (P.Way) Workspace",
  "/snt-control": "Signal & Interlocking (S&T) Workspace",
  "/trd-control": "Traction & OHE (TRD) Workspace",
  "/train-pilot": "Train Pilot Workspace",
  "/maintenance": "Maintenance Tasks & Defect Registry",
  "/scenario-analysis": "Disruption & Scenario Simulation Lab",
  "/scenarios": "Disruption & Scenario Simulation Lab",
  "/scenario-lab": "Disruption & Scenario Simulation Lab",
  "/events": "Events Audit Log",
};

export const UnauthorizedWorkspace: React.FC<UnauthorizedWorkspaceProps> = ({ attemptedPath }) => {
  const { user, currentRole } = useAuth();
  const navigate = useNavigate();

  const cleanPath = attemptedPath.split("?")[0].replace(/\/$/, "");

  // Resolve human-readable workspace title
  let workspaceTitle = WORKSPACE_NAMES[cleanPath];
  if (!workspaceTitle) {
    if (cleanPath.startsWith("/corridors")) {
      workspaceTitle = "Corridor Control Workspace";
    } else if (cleanPath.startsWith("/station-master")) {
      workspaceTitle = "Station Master Workspace";
    } else {
      workspaceTitle = cleanPath || "Requested Workspace";
    }
  }

  const roleName = user?.roleTitle || currentRole.name;
  const deptName = user?.department || currentRole.department;
  const homeWorkspaceName = currentRole.tagline || currentRole.name;

  return (
    <div className="p-6 sm:p-12 min-h-[calc(100vh-10rem)] flex items-center justify-center font-sans">
      <EmptyState
        icon={<ShieldAlert className="w-8 h-8 text-[var(--brand-canvas-blue)] stroke-[1.75]" />}
        title="Workspace Access Boundary"
        description={`The ${workspaceTitle} (${cleanPath}) is reserved for authorized operational desks. You are currently logged in as ${user?.username || "GUEST"} (${roleName} · ${deptName}).`}
        actionLabel={`Return to ${homeWorkspaceName}`}
        onAction={() => navigate(currentRole.defaultPath)}
        secondaryAction={
          <div className="mt-1 flex items-center justify-center">
            {user?.username && <RoleBadge persona={user.username} size="sm" />}
          </div>
        }
        advisoryNote="Divisional Role Boundary: Workspaces are segregated by operational jurisdiction under WCR operating rules. Switch to an authorized account or return to your assigned workstation."
        className="max-w-xl border-[var(--border-subtle)]"
      />
    </div>
  );
};
