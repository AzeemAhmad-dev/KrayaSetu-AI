import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Network,
  Building2,
  ListFilter,
  Compass,
  ShieldAlert,
} from "lucide-react";

export type CorridorWorkspaceTabKey =
  | "NETWORKS"
  | "INFRASTRUCTURE"
  | "INDEX"
  | "MAP"
  | "BLOCK";

interface CorridorWorkspaceNavProps {
  activeTab: CorridorWorkspaceTabKey;
  currentCorridorId?: string;
  onTabChange?: (tab: "INFRASTRUCTURE" | "INDEX" | "MAP" | "BLOCK") => void;
}

export const CorridorWorkspaceNav: React.FC<CorridorWorkspaceNavProps> = ({
  activeTab,
  currentCorridorId = "CORR-01",
  onTabChange,
}) => {
  const navigate = useNavigate();

  const handleTabClick = (key: CorridorWorkspaceTabKey) => {
    if (key === "NETWORKS") {
      navigate("/corridors");
    } else if (key === "BLOCK") {
      navigate(`/corridors/${currentCorridorId}/block`);
    } else if (onTabChange) {
      onTabChange(key);
    } else {
      navigate(`/corridors/${currentCorridorId}?tab=${key.toLowerCase()}`);
    }
  };

  const tabs: {
    key: CorridorWorkspaceTabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }[] = [
    {
      key: "NETWORKS",
      label: "CORRIDOR NETWORKS",
      icon: Network,
      description: "All 5 Divisional Corridors",
    },
    {
      key: "INFRASTRUCTURE",
      label: "SECTION INFRASTRUCTURE",
      icon: Building2,
      description: "Station and Track Specifications",
    },
    {
      key: "INDEX",
      label: "INDEX SECTION",
      icon: ListFilter,
      description: "Sequential Route Progression",
    },
    {
      key: "MAP",
      label: "DETAILED CORRIDOR MAP",
      icon: Compass,
      description: "High-Resolution Infrastructure Map",
    },
    {
      key: "BLOCK",
      label: "BLOCK",
      icon: ShieldAlert,
      description: "Corridor Block Management & Issues",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-1.5 flex flex-wrap items-center gap-1.5 select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={`tab-${tab.key}`}
            type="button"
            onClick={() => handleTabClick(tab.key)}
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
            <div className="flex flex-col text-left truncate">
              <span className="text-xs sm:text-sm font-bold tracking-wide truncate">{tab.label}</span>
              <span
                className={`text-xs font-medium truncate hidden md:inline-block mt-0.5 ${
                  isActive ? "text-sky-200" : "text-slate-500"
                }`}
              >
                {tab.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
