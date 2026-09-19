import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getStationInfrastructure } from "../data/stationInfrastructure";
import { StationSchematicCanvas } from "../components/station/StationSchematicCanvas";
import { StationDetailsDrawer } from "../components/station/StationDetailsDrawer";
import { StationSelectionModal } from "../components/station/StationSelectionModal";
import { StationControlTab } from "../components/station/StationControlTab";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import {
  Building2,
  ArrowRightLeft,
  Layers,
  Ruler,
  Gauge,
  Zap,
  GitBranch,
  ShieldCheck,
  Compass,
  Sliders,
  ShieldAlert
} from "lucide-react";

const STATION_CODE_ALIAS: Record<string, string> = {
  BHOPAL: "BPL",
  ITARSI: "ET",
  RKMP: "RKMP",
  BINA: "BINA",
  KHANDWA: "KNW",
  VIDISHA: "BHS",
  GWALIOR: "GWL",
};

export const StationMasterPage: React.FC = () => {
  const { stationCode: paramCode } = useParams<{ stationCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Normalize station code
  const currentCode = useMemo(() => {
    const raw = (paramCode || localStorage.getItem("krayasetu_selected_station") || "BHS").toUpperCase();
    return STATION_CODE_ALIAS[raw] || raw;
  }, [paramCode]);

  // Tab state: "infrastructure" (Station Layout & Infrastructure) vs "block" (Block Workspace)
  const isBlockRoute = location.pathname.endsWith("/block") || searchParams.get("tab") === "block";
  const [activeTab, setActiveTab] = useState<"infrastructure" | "block">(
    isBlockRoute ? "block" : "infrastructure"
  );

  useEffect(() => {
    if (location.pathname.endsWith("/block") || searchParams.get("tab") === "block") {
      setActiveTab("block");
    } else if (searchParams.get("tab") === "infrastructure") {
      setActiveTab("infrastructure");
    }
  }, [location.pathname, searchParams]);

  const [selectedElement, setSelectedElement] = useState<any | null>(null);
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);

  // Load infrastructure definition for current station
  const infrastructure = useMemo(() => {
    return getStationInfrastructure(currentCode);
  }, [currentCode]);

  useEffect(() => {
    localStorage.setItem("krayasetu_selected_station", currentCode);
    // Auto-select first platform track on load for immediate asset view
    if (infrastructure.tracks.length > 0) {
      setSelectedElement(infrastructure.tracks[0]);
    }
  }, [currentCode, infrastructure]);

  const handleTabChange = (tab: "infrastructure" | "block") => {
    setActiveTab(tab);
    setSearchParams(tab === "block" ? { tab: "block" } : {});
  };

  const handleStationSwitch = (newStationCode: string) => {
    setIsStationModalOpen(false);
    setSelectedElement(null);
    localStorage.setItem("krayasetu_selected_station", newStationCode);
    const suffix = activeTab === "block" ? "?tab=block" : "";
    navigate(`/station-master/${newStationCode.toUpperCase()}${suffix}`);
  };

  const platforms = infrastructure.tracks.filter((t) => t.platformNumber);
  const otherTracks = infrastructure.tracks.filter((t) => !t.platformNumber);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans">
      {/* ============================================================== */}
      {/* 1. COMMAND HEADER & TYPOGRAPHY HIERARCHY                        */}
      {/* ============================================================== */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            {/* LEVEL 1: STATION MASTER */}
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base font-bold tracking-wider text-sky-800 uppercase">
                STATION MASTER
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Indian Railways · Bhopal Division
              </span>
            </div>

            {/* LEVEL 2: RANI KAMLAPATI (RKMP) */}
            <div className="flex flex-wrap items-baseline gap-3 pt-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 font-sans">
                {infrastructure.name.toUpperCase()} <span className="font-mono">({infrastructure.code})</span>
              </h1>
              {infrastructure.hindiName && (
                <span className="text-lg sm:text-xl font-bold text-slate-500 font-sans">
                  · {infrastructure.hindiName}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-sky-100 text-sky-900 border border-sky-300 shadow-xs">
                {infrastructure.category.split(" ")[0]}
              </span>
            </div>
          </div>

          {/* Action: Station Selection Switcher */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsStationModalOpen(true)}
              className="px-4 py-2 bg-[#0b2545] hover:bg-sky-900 text-white text-xs font-semibold rounded-xl border border-[#0b2545] shadow-sm flex items-center space-x-2 transition-all cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4 text-sky-300" />
              <span>Switch Station</span>
            </button>
          </div>
        </div>

        {/* Infrastructure Engineering Specs Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-mono">
          <div className="flex flex-wrap items-center gap-4 sm:gap-7 text-slate-700">
            <div>
              Division: <strong className="text-slate-900 font-bold">{infrastructure.division}</strong> ({infrastructure.zone})
            </div>
            <div>
              Platforms: <strong className="text-slate-900 font-bold">{infrastructure.platformsCount} Passenger Bays</strong>
            </div>
            <div>
              Total Lines: <strong className="text-slate-900 font-bold">{infrastructure.tracks.length} Tracks</strong>
            </div>
            <div>
              Chainage: <strong className="text-slate-900 font-bold">KM {infrastructure.chainageKm}</strong>
            </div>
            <div>
              Traction: <strong className="text-slate-900 font-bold">25 kV AC 50Hz OHE</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. STATION MASTER WORKSPACE TABS                                */}
      {/* ============================================================== */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {/* Main Station Layout & Infrastructure Tab */}
          <button
            type="button"
            onClick={() => handleTabChange("infrastructure")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "infrastructure"
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Station Layout & Infrastructure</span>
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
              activeTab === "infrastructure" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              Main
            </span>
          </button>

          {/* New Separate Top-Level Block Tab */}
          <button
            type="button"
            onClick={() => handleTabChange("block")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "block"
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Block</span>
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
              activeTab === "block" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              Workspace
            </span>
          </button>
        </div>

        <div className="text-xs font-mono text-slate-500 hidden sm:block pr-2">
          {activeTab === "infrastructure"
            ? "Interactive Track Schematic & Asset Inventory"
            : "Weekly/Monthly Blocks & Issue / Block Requests"}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. TAB 1: STATION INFRASTRUCTURE & SCHEMATIC                    */}
      {/* ============================================================== */}
      {activeTab === "infrastructure" && (
        <div className="space-y-6">
          {/* LEVEL 3: STATION LAYOUT (Hero Railway Schematic) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900 font-sans flex items-center space-x-2">
                  <Compass className="w-5 h-5 text-sky-700" />
                  <span>STATION LAYOUT</span>
                </h2>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Top-down engineering schematic of permanent way tracks, concrete platform bays, through lines, loops, sidings, and turnouts.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Interactive Engineering Canvas</span>
              </div>
            </div>

            {/* Map Hero Container */}
            <div className="flex flex-col lg:flex-row gap-5 items-start">
              <div className="flex-1 w-full overflow-hidden">
                <StationSchematicCanvas
                  infrastructure={infrastructure}
                  selectedElement={selectedElement}
                  onSelectElement={(el) => setSelectedElement(el)}
                />
              </div>

              {/* Right Asset Inspection Drawer */}
              {selectedElement && (
                <StationDetailsDrawer
                  element={selectedElement}
                  onClose={() => setSelectedElement(null)}
                  stationName={infrastructure.name}
                  stationCode={infrastructure.code}
                />
              )}
            </div>
          </div>

          {/* PHYSICAL ASSET DIRECTORIES (Clean infrastructure inventory) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {/* Panel 1: Platform Specifications */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 font-semibold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-sky-700" />
                  <span>Platform Berths ({platforms.length})</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Passenger Decks
                </span>
              </div>

              <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[280px] text-xs">
                {platforms.map((p) => (
                  <div
                    key={`panel-pf-${p.id}`}
                    className="py-2.5 first:pt-0 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors"
                    onClick={() => setSelectedElement(p)}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">Platform {p.platformNumber}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.platformSide || "Island"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5 font-sans">
                        Length: <strong className="text-slate-900 font-mono">{p.lengthMeters}m CSR</strong> · Speed: <strong className="text-slate-900 font-mono">{Math.min(p.speedLimitKmph, 60)} km/h</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-[#0b2545] hover:text-white rounded border border-slate-300 font-semibold transition-colors cursor-pointer"
                    >
                      View Spec
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: Through Lines & Yard */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 font-semibold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-sky-700" />
                  <span>Through Lines & Yard ({otherTracks.length})</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Loops & Sidings
                </span>
              </div>

              <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[280px] text-xs">
                {otherTracks.map((t) => (
                  <div
                    key={`panel-track-${t.id}`}
                    className="py-2.5 first:pt-0 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors"
                    onClick={() => setSelectedElement(t)}
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                      <div className="text-xs text-slate-600 mt-0.5 font-sans">
                        {t.trackType} · <strong className="text-slate-900 font-mono">{t.lengthMeters}m CSR</strong> · {t.electrified ? "25kV OHE" : "Non-Elec"}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-[#0b2545] hover:text-white rounded border border-slate-300 font-semibold transition-colors cursor-pointer"
                    >
                      View Spec
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 3: Turnouts & Interlocking */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 font-semibold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                  <GitBranch className="w-4 h-4 text-sky-700" />
                  <span>Turnouts & Interlocking ({infrastructure.turnouts.length})</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Point Machines
                </span>
              </div>

              <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[280px] text-xs">
                {infrastructure.turnouts.map((turnout) => (
                  <div
                    key={`panel-to-${turnout.id}`}
                    className="py-2.5 first:pt-0 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors"
                    onClick={() =>
                      setSelectedElement({
                        ...turnout,
                        isTurnout: true,
                        typeName: "TURNOUT / POINT MACHINE",
                        notes: `Point asset ${turnout.id}. Angle 1 in 12 layout with Thick Web Switch (TWS) and IRS point machine.`,
                      })
                    }
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{turnout.name}</div>
                      <div className="text-xs text-slate-600 mt-0.5 font-sans">
                        {turnout.type} · Connects <span className="font-mono font-bold text-slate-800">{turnout.fromTrackId}</span> ⇄ <span className="font-mono font-bold text-slate-800">{turnout.toTrackId}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-[#0b2545] hover:text-white rounded border border-slate-300 font-semibold transition-colors cursor-pointer"
                    >
                      View Spec
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. TAB 2: STATION BLOCK WORKSPACE                             */}
      {/* ============================================================== */}
      {activeTab === "block" && (
        <StationControlTab
          stationCode={currentCode}
          stationName={infrastructure.name}
          infrastructure={infrastructure}
        />
      )}

      {/* Station Switcher Modal */}
      {isStationModalOpen && (
        <StationSelectionModal
          isOpen={isStationModalOpen}
          currentStationCode={currentCode}
          onSelectStation={handleStationSwitch}
          onClose={() => setIsStationModalOpen(false)}
        />
      )}
    </div>
  );
};
