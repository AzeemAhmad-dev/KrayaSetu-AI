import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Network,
  Building2,
  ListFilter,
  Compass,
  ShieldAlert,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../ui";

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
      label: "Corridor Networks",
      icon: Network,
      description: "All 5 Divisional Corridors",
    },
    {
      key: "INFRASTRUCTURE",
      label: "Section Infrastructure",
      icon: Building2,
      description: "Station & Track Specifications",
    },
    {
      key: "INDEX",
      label: "Index Section",
      icon: ListFilter,
      description: "Sequential Route Progression",
    },
    {
      key: "MAP",
      label: "Detailed Corridor Map",
      icon: Compass,
      description: "High-Resolution Infrastructure Map",
    },
    {
      key: "BLOCK",
      label: "Block Management",
      icon: ShieldAlert,
      description: "Possession Windows & Track Work",
    },
  ];

  return (
    <div className="bg-white px-4 pt-1 rounded-2xl border border-[var(--border-subtle)] shadow-xs select-none min-w-0">
      <Tabs
        value={activeTab}
        onValueChange={(val) => handleTabClick(val as CorridorWorkspaceTabKey)}
        variant="underlined"
        className="min-w-0 w-full"
      >
        <TabsList className="w-full min-w-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={`tab-${tab.key}`}
                value={tab.key}
                icon={<Icon className="w-4 h-4" />}
                className="py-3 px-3 text-xs sm:text-sm font-bold tracking-wide"
              >
                <span>{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
};
