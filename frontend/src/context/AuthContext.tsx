import React, { createContext, useContext, useState, useEffect } from "react";

export type RoleKey =
  | "CHIEF_BLOCK_OFFICER"
  | "CORRIDOR_MASTER"
  | "STATION_MASTER"
  | "TRACK_PWAY"
  | "SIGNAL_SNT"
  | "TRACTION_OHE"
  | "TRAIN_PILOT";

export interface SidebarLinkConfig {
  path: string;
  label: string;
  iconName: string;
  badge?: string;
}

export interface RolePermissions {
  canApproveTrafficBlocks: boolean;
  canRequestBlocks: boolean;
  canOverrideDelays: boolean;
  canDispatchTrains: boolean;
  canRunScenarios: boolean;
  canSanctionBudgets: boolean;
}

export interface UserAccount {
  username: string;
  name: string;
  roleKey: RoleKey;
  roleTitle: string;
  department: string;
  division: string;
  zone: string;
  workspaceName: string;
  defaultPath: string;
  allowedPaths: string[];
  badgeColor: string;
  permissions: RolePermissions;
  sidebarLinks: SidebarLinkConfig[];
}

export interface DemoCredential {
  username: string;
  role: string;
  workspace: string;
  password: string;
  description: string;
}

// 8 Official SIH Demo Accounts
export const DEMO_ACCOUNTS_REGISTRY: Record<string, { user: UserAccount; passwords: string[] }> = {
  "COA-001": {
    passwords: ["coa@demo", "rail@demo", "demo123"],
    user: {
      username: "COA-001",
      name: "Chief of Block Operations (COA-001)",
      roleKey: "CHIEF_BLOCK_OFFICER",
      roleTitle: "Chief of Block Officer",
      department: "Operating Department (Master Control)",
      division: "Bhopal Division (BPL)",
      zone: "West Central Railway (WCR)",
      workspaceName: "Master Control",
      defaultPath: "/operations-control",
      allowedPaths: [
        "/operations-control",
        "/block-planner",
        "/coordination",
        "/control",
        "/corridors",
        "/maintenance",
        "/scenario-analysis",
        "/events",
        "/station-master",
      ],
      badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
      permissions: {
        canApproveTrafficBlocks: true,
        canRequestBlocks: true,
        canOverrideDelays: true,
        canDispatchTrains: true,
        canRunScenarios: true,
        canSanctionBudgets: true,
      },
      sidebarLinks: [
        { path: "/operations-control", label: "Operations & Decisions", iconName: "Monitor", badge: "Demo" },
        { path: "/block-planner", label: "Block Planner (CP-SAT)", iconName: "Cpu", badge: "8.0s" },
        { path: "/coordination", label: "Joint Coordination Desk", iconName: "GitMerge" },
        { path: "/control", label: "Master Network Map", iconName: "Layers" },
        { path: "/corridors", label: "Corridor Directory", iconName: "Activity" },
        { path: "/maintenance", label: "Maintenance Tasks", iconName: "Hammer", badge: "50" },
        { path: "/scenario-analysis", label: "Scenario Simulation", iconName: "BarChart3" },
      ],
    },
  },
  "COR-001": {
    passwords: ["cor@demo", "rail@demo", "demo123"],
    user: {
      username: "COR-001",
      name: "Corridor Master (COR-001)",
      roleKey: "CORRIDOR_MASTER",
      roleTitle: "Corridor Master",
      department: "Operating / Corridor Control",
      division: "Bhopal Division (BPL)",
      zone: "West Central Railway (WCR)",
      workspaceName: "Corridor Control",
      defaultPath: "/corridors",
      allowedPaths: ["/corridors", "/control"],
      badgeColor: "bg-blue-100 text-blue-900 border-blue-300",
      permissions: {
        canApproveTrafficBlocks: false,
        canRequestBlocks: false,
        canOverrideDelays: false,
        canDispatchTrains: false,
        canRunScenarios: false,
        canSanctionBudgets: false,
      },
      sidebarLinks: [
        { path: "/corridors", label: "Corridor Networks", iconName: "Activity" },
        { path: "/corridors/CORR-01?tab=infrastructure", label: "Section Infrastructure", iconName: "Building2" },
        { path: "/corridors/CORR-01?tab=index", label: "Index Section", iconName: "Sliders" },
        { path: "/corridors/CORR-01?tab=map", label: "Detailed Corridor Map", iconName: "Compass" },
        { path: "/corridors/CORR-01/block", label: "Block", iconName: "ShieldAlert" },
      ],
    },
  },
  "SM-001": {
    passwords: ["sm@demo", "rail@demo", "demo123"],
    user: {
      username: "SM-001",
      name: "Station Master (SM-001)",
      roleKey: "STATION_MASTER",
      roleTitle: "Station Master",
      department: "Station Operations (Yard / Platforms)",
      division: "Bhopal Division (BPL)",
      zone: "West Central Railway (WCR)",
      workspaceName: "Station Master Workspace",
      defaultPath: "/station-master",
      allowedPaths: ["/station-master", "/station-master/bhopal"],
      badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
      permissions: {
        canApproveTrafficBlocks: false,
        canRequestBlocks: false,
        canOverrideDelays: false,
        canDispatchTrains: false,
        canRunScenarios: false,
        canSanctionBudgets: false,
      },
      sidebarLinks: [
        { path: "/station-master", label: "Station Schematic Map", iconName: "Radio" },
        { path: "/station-master?tab=infrastructure", label: "Platforms & Tracks", iconName: "Building2", badge: "Base Map" },
        { path: "/station-master?tab=block", label: "Block", iconName: "ShieldAlert" },
      ],
    },
  },
  "PWAY-001": {
    passwords: ["pway@demo", "rail@demo", "demo123"],
    user: {
      username: "PWAY-001",
      name: "Senior Section Engineer - P.Way (PWAY-001)",
      roleKey: "TRACK_PWAY",
      roleTitle: "Track / P.Way",
      department: "Civil Engineering (Permanent Way)",
      division: "Bhopal Division (BPL)",
      zone: "West Central Railway (WCR)",
      workspaceName: "Track Infrastructure",
      defaultPath: "/pway-control",
      allowedPaths: ["/pway-control"],
      badgeColor: "bg-orange-100 text-orange-900 border-orange-300",
      permissions: {
        canApproveTrafficBlocks: false,
        canRequestBlocks: false,
        canOverrideDelays: false,
        canDispatchTrains: false,
        canRunScenarios: false,
        canSanctionBudgets: false,
      },
      sidebarLinks: [
        { path: "/pway-control", label: "Track Infrastructure Map", iconName: "Hammer" },
        { path: "/pway-control", label: "Permanent Way Assets", iconName: "Layers" },
      ],
    },
  },
  "PWAY-002": {
    passwords: ["pway@demo", "rail@demo", "demo123"],
    user: {
      username: "PWAY-002",
      name: "Junior Engineer - P.Way Track Unit (PWAY-002)",
      roleKey: "TRACK_PWAY",
      roleTitle: "Track / P.Way",
      department: "Civil Engineering (Vidisha Section)",
      division: "Bhopal Division (BPL)",
      zone: "West Central Railway (WCR)",
      workspaceName: "Track Infrastructure",
      defaultPath: "/pway-control",
      allowedPaths: ["/pway-control"],
      badgeColor: "bg-orange-100 text-orange-900 border-orange-300",
      permissions: {
        canApproveTrafficBlocks: false,
        canRequestBlocks: false,
        canOverrideDelays: false,
        canDispatchTrains: false,
        canRunScenarios: false,
        canSanctionBudgets: false,
      },
      sidebarLinks: [
        { path: "/pway-control", label: "Track Infrastructure Map", iconName: "Hammer" },
        { path: "/pway-control", label: "Permanent Way Assets", iconName: "Layers" },
      ],
    },
  },
  "SNT-001": {
    passwords: ["snt@demo", "rail@demo", "demo123"],
    user: {
      username: "SNT-001",
      name: "Divisional Signal Engineer (SNT-001)",
      roleKey: "SIGNAL_SNT",
      roleTitle: "Signal & S&T",
      department: "Signal & Telecommunications (S&T)",
      division: "Bhopal Division (BPL)",
      zone: "West Central Railway (WCR)",
      workspaceName: "Signal & S&T Infrastructure",
      defaultPath: "/snt-control",
      allowedPaths: ["/snt-control"],
      badgeColor: "bg-cyan-100 text-cyan-900 border-cyan-300",
      permissions: {
        canApproveTrafficBlocks: false,
        canRequestBlocks: false,
        canOverrideDelays: false,
        canDispatchTrains: false,
        canRunScenarios: false,
        canSanctionBudgets: false,
      },
      sidebarLinks: [
        { path: "/snt-control", label: "Signaling Network Map", iconName: "Radio" },
        { path: "/snt-control", label: "Interlocking & Points", iconName: "Sliders" },
      ],
    },
  },
  "TRD-001": {
    passwords: ["trd@demo", "rail@demo", "demo123"],
    user: {
      username: "TRD-001",
      name: "Divisional Electrical Engineer - TRD (TRD-001)",
      roleKey: "TRACTION_OHE",
      roleTitle: "Traction / OHE",
      department: "Electrical / Traction Distribution (TRD)",
      division: "Bhopal Division (BPL)",
      zone: "West Central Railway (WCR)",
      workspaceName: "Traction / OHE Infrastructure",
      defaultPath: "/trd-control",
      allowedPaths: ["/trd-control"],
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
      permissions: {
        canApproveTrafficBlocks: false,
        canRequestBlocks: false,
        canOverrideDelays: false,
        canDispatchTrains: false,
        canRunScenarios: false,
        canSanctionBudgets: false,
      },
      sidebarLinks: [
        { path: "/trd-control", label: "Traction & OHE Map", iconName: "Zap" },
        { path: "/trd-control", label: "TSS & Sectioning Posts", iconName: "Layers" },
      ],
    },
  },
  "TRD-002": {
    passwords: ["trd@demo", "rail@demo", "demo123"],
    user: {
      username: "TRD-002",
      name: "OHE Field Supervisor (TRD-002)",
      roleKey: "TRACTION_OHE",
      roleTitle: "Traction / OHE",
      department: "Electrical / TRD",
      division: "Bhopal Division (BPL)",
      zone: "West Central Railway (WCR)",
      workspaceName: "Traction / OHE Infrastructure",
      defaultPath: "/trd-control",
      allowedPaths: ["/trd-control"],
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
      permissions: {
        canApproveTrafficBlocks: false,
        canRequestBlocks: false,
        canOverrideDelays: false,
        canDispatchTrains: false,
        canRunScenarios: false,
        canSanctionBudgets: false,
      },
      sidebarLinks: [
        { path: "/trd-control", label: "Traction & OHE Map", iconName: "Zap" },
        { path: "/trd-control", label: "OHE Assets", iconName: "Layers" },
      ],
    },
  },
  "TRAIN-001": {
    passwords: ["train@demo", "rail@demo", "demo123"],
    user: {
      username: "TRAIN-001",
      name: "Loco Pilot (TRAIN-001)",
      roleKey: "TRAIN_PILOT",
      roleTitle: "Train Pilot",
      department: "Loco Running Operations / Crew Control",
      division: "Bhopal Division (BPL)",
      zone: "West Central Railway (WCR)",
      workspaceName: "Train Pilot Workspace",
      defaultPath: "/train-pilot",
      allowedPaths: ["/train-pilot"],
      badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
      permissions: {
        canApproveTrafficBlocks: false,
        canRequestBlocks: false,
        canOverrideDelays: false,
        canDispatchTrains: false,
        canRunScenarios: false,
        canSanctionBudgets: false,
      },
      sidebarLinks: [
        { path: "/train-pilot", label: "Activity Logging", iconName: "ClipboardEdit" },
      ],
    },
  },
};

export const DEMO_CREDENTIALS_LIST: DemoCredential[] = [
  { username: "COA-001", role: "Chief of Block Officer", workspace: "Master Control", password: "coa@demo", description: "Master network infrastructure, 5 corridors, major junctions & division boundaries" },
  { username: "COR-001", role: "Corridor Master", workspace: "Corridor Control", password: "cor@demo", description: "Corridor & section infrastructure, track arrangements, stations line string" },
  { username: "SM-001", role: "Station Master", workspace: "Station Master", password: "sm@demo", description: "Station schematic layout, physical platforms, loops, sidings & turnouts" },
  { username: "PWAY-001", role: "Track / P.Way", workspace: "Track Infrastructure", password: "pway@demo", description: "Track network, 60kg rail profile, PSC sleepers, bridges & permanent way assets" },
  { username: "SNT-001", role: "Signal & S&T", workspace: "Signal & S&T Infrastructure", password: "snt@demo", description: "Electronic Interlocking (EI), signal locations, point machines & axle counters" },
  { username: "TRD-001", role: "Traction / OHE", workspace: "Traction / OHE Infrastructure", password: "trd@demo", description: "25kV AC traction infrastructure, Traction Substations (TSS) & feeding zones" },
  { username: "TRAIN-001", role: "Train Pilot", workspace: "Train Pilot Workspace", password: "train@demo", description: "En-route driver activity logging, visual track/OHE/signal observations & department routing" },
];

interface AuthContextValue {
  user: UserAccount | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => { success: boolean; error?: string; defaultPath?: string; user?: UserAccount };
  logout: () => void;
  hasPermission: (perm: keyof RolePermissions) => boolean;
  canAccessPath: (path: string) => boolean;
  // Backwards-compatibility helpers
  currentRole: {
    id: string;
    name: string;
    department: string;
    division: string;
    zone: string;
    tagline: string;
    badgeColor: string;
    defaultPath: string;
    allowedPaths: string[];
    permissions: RolePermissions;
    sidebarLinks: SidebarLinkConfig[];
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_AUTH_USER = "krayasetu_auth_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTH_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.username && DEMO_ACCOUNTS_REGISTRY[parsed.username]) {
          return DEMO_ACCOUNTS_REGISTRY[parsed.username].user;
        }
      }
    } catch (e) {
      console.warn("Could not load auth user from storage", e);
    }
    // Default fallback demo user if nothing in storage
    return DEMO_ACCOUNTS_REGISTRY["COA-001"].user;
  });

  const login = (username: string, password: string): { success: boolean; error?: string; defaultPath?: string; user?: UserAccount } => {
    const cleanUser = username.trim().toUpperCase();
    const accountEntry = DEMO_ACCOUNTS_REGISTRY[cleanUser];

    if (!accountEntry) {
      return { success: false, error: "Invalid username or password." };
    }

    const cleanPass = password.trim();
    const isPasswordValid = accountEntry.passwords.includes(cleanPass) || cleanPass === "rail@demo" || cleanPass === "demo123";

    if (!isPasswordValid) {
      return { success: false, error: "Invalid username or password." };
    }

    const authenticatedUser = accountEntry.user;
    setUser(authenticatedUser);
    localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(authenticatedUser));

    return { success: true, defaultPath: authenticatedUser.defaultPath, user: authenticatedUser };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_AUTH_USER);
  };

  const hasPermission = (perm: keyof RolePermissions): boolean => {
    if (!user) return false;
    return !!user.permissions[perm];
  };

  const canAccessPath = (path: string): boolean => {
    if (!user) return false;
    const clean = path.split("?")[0];
    // Master accounts and core demonstration paths are universally accessible
    if (user.username === "COA-001") return true;
    const universalDemoPaths = [
      "/operations-control",
      "/block-planner",
      "/coordination",
      "/maintenance",
      "/scenario-analysis",
      "/events",
      "/control",
      "/corridors",
    ];
    if (universalDemoPaths.some((p) => clean === p || clean.startsWith(`${p}/`))) {
      return true;
    }
    return user.allowedPaths.some((p) => clean === p || clean.startsWith(`${p}/`));
  };

  // Backwards compatibility role object
  const currentRole = user
    ? {
        id: user.roleKey,
        name: user.roleTitle,
        department: user.department,
        division: user.division,
        zone: user.zone,
        tagline: user.workspaceName,
        badgeColor: user.badgeColor,
        defaultPath: user.defaultPath,
        allowedPaths: user.allowedPaths,
        permissions: user.permissions,
        sidebarLinks: user.sidebarLinks,
      }
    : {
        id: "CHIEF_BLOCK_OFFICER",
        name: "Chief of Block Officer",
        department: "Operating Department (Master Control)",
        division: "Bhopal Division (BPL)",
        zone: "West Central Railway (WCR)",
        tagline: "Master Control",
        badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
        defaultPath: "/control",
        allowedPaths: ["/control"],
        permissions: {
          canApproveTrafficBlocks: true,
          canRequestBlocks: true,
          canOverrideDelays: true,
          canDispatchTrains: true,
          canRunScenarios: true,
          canSanctionBudgets: true,
        },
        sidebarLinks: [],
      };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        hasPermission,
        canAccessPath,
        currentRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Backwards-compatible useRole hook
export const useRole = useAuth;
