import React from "react";
import { AuthProvider, useAuth, RolePermissions, SidebarLinkConfig } from "./AuthContext";

export type RoleId =
  | "CHIEF_BLOCK_OFFICER"
  | "CORRIDOR_MASTER"
  | "STATION_MASTER"
  | "TRACK_PWAY"
  | "SIGNAL_SNT"
  | "TRACTION_OHE"
  | "SECTION_CONTROLLER"
  | "TRD_ENGINEER"
  | "OHE_SUPERVISOR"
  | "PWAY_ENGINEER"
  | "OPERATIONS_MANAGER";

export type { RolePermissions, SidebarLinkConfig };

export interface RoleConfig {
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
}

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

export const useRole = () => {
  const auth = useAuth();
  return {
    currentRoleId: auth.user?.roleKey || "CHIEF_BLOCK_OFFICER",
    currentRole: auth.currentRole,
    setRoleById: (roleId: string) => {
      console.log("Switching role:", roleId);
    },
    hasPermission: auth.hasPermission,
    canAccessPath: auth.canAccessPath,
    user: auth.user,
    logout: auth.logout,
  };
};
