import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { getCorridorData, getAllCorridors, DetailedCorridor, CorridorLocation } from "../data/corridorsData";
import { getStationInfrastructure, TrackDefinition } from "../data/stationInfrastructure";
import { DetailedCorridorMapCanvas } from "../components/corridor/DetailedCorridorMapCanvas";
import { RailwayStationSchematic } from "../components/station/RailwayStationSchematic";
import { PlatformSchematic } from "../components/station/PlatformSchematic";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { CorridorWorkspaceNav, CorridorWorkspaceTabKey } from "../components/corridor/CorridorWorkspaceNav";
import { CorridorBlockManagement } from "../components/corridor/CorridorBlockManagement";
import { formatDistanceKm, formatKmBadge } from "../utils/formatDistance";
import {
  ArrowLeft,
  Layers,
  Building2,
  Gauge,
  Zap,
  Ruler,
  GitBranch,
  ShieldCheck,
  Search,
  MapPin,
  Compass,
  ListFilter,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export const CorridorDetailPage: React.FC = () => {
  const { corridorId = "CORR-01" } = useParams<{ corridorId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const allCorridors = getAllCorridors();

  // Fetch structured corridor definition
  const corridor = useMemo(() => {
    return getCorridorData(corridorId);
  }, [corridorId]);

  // Derived active tab from route pathname or URL query parameter
  const isBlockRoute = location.pathname.endsWith("/block");
  const tabParam = (searchParams.get("tab") || "").toLowerCase();
  const activeTab: CorridorWorkspaceTabKey =
    isBlockRoute || tabParam === "block"
      ? "BLOCK"
      : tabParam === "infrastructure"
      ? "INFRASTRUCTURE"
      : tabParam === "index"
      ? "INDEX"
      : "MAP";

  const handleTabChange = (tab: "INFRASTRUCTURE" | "INDEX" | "MAP" | "BLOCK") => {
    if (tab === "BLOCK") {
      navigate(`/corridors/${corridorId}/block`);
    } else {
      navigate(`/corridors/${corridorId}?tab=${tab.toLowerCase()}`);
    }
  };

  const [selectedLocationCode, setSelectedLocationCode] = useState<string>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<CorridorLocation | null>(null);
  const [isStationExpanded, setIsStationExpanded] = useState<boolean>(true);
  const [selectedPlatformNumber, setSelectedPlatformNumber] = useState<number | null>(null);
  const [selectedPlatformTrack, setSelectedPlatformTrack] = useState<TrackDefinition | undefined>(undefined);

  // Initialize selected location on corridor change
  useEffect(() => {
    if (corridor.locations.length > 0) {
      setSelectedLocation(corridor.locations[0]);
      setSelectedLocationCode("ALL");
      setIsStationExpanded(true);
      setSelectedPlatformNumber(null);
      setSelectedPlatformTrack(undefined);
    }
  }, [corridor]);

  // Load Station Infrastructure Data for the selected location
  const stationInfrastructure = useMemo(() => {
    if (!selectedLocation) return null;
    return getStationInfrastructure(selectedLocation.code, selectedLocation);
  }, [selectedLocation]);

  // Handle dropdown filter change
  const handleFilterChange = (code: string) => {
    setSelectedLocationCode(code);
    if (code === "ALL") {
      if (corridor.locations.length > 0) {
        setSelectedLocation(corridor.locations[0]);
        setIsStationExpanded(true);
        setSelectedPlatformNumber(null);
        setSelectedPlatformTrack(undefined);
      }
    } else {
      const loc = corridor.locations.find((l) => l.code === code);
      if (loc) {
        setSelectedLocation(loc);
        setIsStationExpanded(true);
        setSelectedPlatformNumber(null);
        setSelectedPlatformTrack(undefined);
      }
    }
  };

  const handleMapSelectLocation = (loc: CorridorLocation) => {
    if (selectedLocation?.code === loc.code) {
      // Toggle collapse if clicking same station
      setIsStationExpanded((prev) => !prev);
    } else {
      setSelectedLocation(loc);
      setSelectedLocationCode(loc.code);
      setIsStationExpanded(true);
      setSelectedPlatformNumber(null);
      setSelectedPlatformTrack(undefined);
    }
  };

  const handleSelectPlatform = (platNum: number, track?: TrackDefinition) => {
    if (selectedPlatformNumber === platNum) {
      // Toggle collapse platform detail
      setSelectedPlatformNumber(null);
      setSelectedPlatformTrack(undefined);
    } else {
      setSelectedPlatformNumber(platNum);
      setSelectedPlatformTrack(track);
    }
  };

  const majorLocations = corridor.locations.filter((l) => l.is_major);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans">
      {/* ============================================================== */}
      {/* 1. COMMAND HEADER & TYPOGRAPHY HIERARCHY                        */}
      {/* ============================================================== */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            {/* LEVEL 1: CORRIDOR CONTROL (Large and bold) */}
            <div className="flex items-center space-x-2.5">
              <Link
                to="/corridors"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200"
                title="Back to All 5 Corridors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="text-sm sm:text-base font-black tracking-widest text-sky-800 uppercase font-mono">
                CORRIDOR CONTROL
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                Indian Railways · Bhopal Division
              </span>
            </div>

            {/* LEVEL 2: ORIGIN → DESTINATION (Large and prominent) */}
            <div className="flex flex-wrap items-baseline gap-3 pt-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 font-sans">
                {corridor.origin.toUpperCase()} → {corridor.destination.toUpperCase()}
              </h1>
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-extrabold bg-sky-100 text-sky-900 border border-sky-300 shadow-xs">
                {corridor.id} · {corridor.code}
              </span>
            </div>
            <p className="text-sm text-slate-600 font-sans max-w-4xl pt-1 leading-relaxed">
              {corridor.description}
            </p>
          </div>

          {/* Provenance Badge & Corridor Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Corridor Quick Switcher */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">CORRIDOR:</span>
              <select
                value={corridor.id}
                onChange={(e) => {
                  const targetId = e.target.value;
                  if (activeTab === "BLOCK") {
                    navigate(`/corridors/${targetId}/block`);
                  } else {
                    navigate(`/corridors/${targetId}?tab=${activeTab.toLowerCase()}`);
                  }
                }}
                aria-label="Switch Corridor"
                className="bg-transparent text-xs sm:text-sm font-mono font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {allCorridors.map((c) => (
                  <option key={`corr-sel-${c.id}`} value={c.id}>
                    {c.id} · {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-mono">
          <div className="flex flex-wrap items-center gap-4 sm:gap-7 text-slate-700">
            <div>
              Configuration: <strong className="text-slate-900 font-bold">{corridor.track_configuration.replace(/_/g, " ")}</strong>
            </div>
            <div>
              Total Length: <strong className="text-slate-900 font-bold">{formatDistanceKm(corridor.total_distance_km)}</strong>
            </div>
            <div>
              Speed Ceiling: <strong className="text-slate-900 font-bold">{corridor.max_permissible_speed_kmph} km/h</strong>
            </div>
            <div>
              Traction: <strong className="text-slate-900 font-bold">{corridor.voltage}</strong>
            </div>
            <div>
              Locations: <strong className="text-slate-900 font-bold">{corridor.locations.length} Stations & Halts</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DEDICATED CORRIDOR WORKSPACE NAVIGATION                     */}
      {/* Corridor Networks | Section Infrastructure | Index Section | Detailed Corridor Map */}
      {/* ============================================================== */}
      <div className="space-y-3">
        <CorridorWorkspaceNav
          activeTab={activeTab}
          currentCorridorId={corridor.id}
          onTabChange={handleTabChange}
        />

        {/* Location Dropdown Filter & Active View Metadata (Visible on MAP, INFRASTRUCTURE, INDEX) */}
        {activeTab !== "BLOCK" && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="text-xs font-mono text-slate-500 flex items-center space-x-1.5">
              <span className="font-bold text-slate-700 uppercase">
                {activeTab === "MAP"
                  ? "DETAILED CORRIDOR MAP WORKSPACE"
                  : activeTab === "INFRASTRUCTURE"
                  ? "SECTION INFRASTRUCTURE SPECIFICATIONS"
                  : "INDEX SECTION · ROUTE PROGRESSION"}
              </span>
              <span>·</span>
              <span>{corridor.name} ({formatDistanceKm(corridor.total_distance_km)})</span>
            </div>

            {/* Location Dropdown Filter */}
            <div className="flex items-center space-x-2">
              <ListFilter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">LOCATION:</span>
              <select
                value={selectedLocationCode}
                onChange={(e) => handleFilterChange(e.target.value)}
                aria-label="Filter corridor locations"
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">ALL LOCATIONS ({corridor.locations.length})</option>
                {corridor.locations.map((loc) => (
                  <option key={`opt-${loc.code}`} value={loc.code}>
                    {loc.sequence}. {loc.name} ({loc.code}) · {formatKmBadge(loc.km)} {loc.is_major ? "★" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. PRIMARY CONTENT AREA: MAP, INFRASTRUCTURE, OR INDEX         */}
      {/* ============================================================== */}
      {activeTab === "MAP" && (
        <div className="space-y-5">
          {/* Detailed Corridor Schematic Canvas (Hero Workspace with Increased Height & Controls) */}
          <div className="w-full">
            <DetailedCorridorMapCanvas
              corridor={corridor}
              selectedLocation={selectedLocation}
              onSelectLocation={handleMapSelectLocation}
            />
          </div>

          {/* Selected Station Infrastructure Panel */}
          {selectedLocation && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4 font-sans animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-[#0b2545] text-white">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono text-slate-500 uppercase tracking-wider font-bold">
                      Selected Location Infrastructure Specification
                    </div>
                    {/* LEVEL 4: STATION NAME */}
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-black text-slate-900">
                        {selectedLocation.name.toUpperCase()}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300">
                        {selectedLocation.code}
                      </span>
                      <span className="text-xs font-mono text-slate-500 font-semibold">
                        · {formatKmBadge(selectedLocation.km)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infrastructure Attribute Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5 font-mono">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-600 uppercase font-bold">Platforms</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedLocation.platforms}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Passenger bays</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-600 uppercase font-bold">Total Tracks</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedLocation.tracks}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Running lines</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-600 uppercase font-bold">Loops</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedLocation.loops}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Passing loops</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-600 uppercase font-bold">Sidings</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedLocation.sidings}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Freight/Stabling</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-600 uppercase font-bold">Traction</div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {selectedLocation.electrified ? "25 kV AC" : "Non-Elec"}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Overhead OHE</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-600 uppercase font-bold">Speed Ceiling</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedLocation.speed_kmph}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">km/h permissible</div>
                </div>
              </div>

              {/* Engineering notes & provenance */}
              {selectedLocation.notes && (
                <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-200 text-xs sm:text-sm text-sky-950 font-sans leading-relaxed">
                  <strong>Engineering & Yard Characteristics:</strong> {selectedLocation.notes}
                </div>
              )}

              {/* Expand / Collapse Schematic Action Bar */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsStationExpanded((prev) => !prev)}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-mono font-bold flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  {isStationExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 text-sky-700" />
                      <span>COLLAPSE STATION SCHEMATIC</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 text-sky-700" />
                      <span>EXPAND STATION SCHEMATIC ({selectedLocation.name.toUpperCase()})</span>
                    </>
                  )}
                </button>

                <span className="text-xs font-mono text-slate-500 font-medium">
                  {isStationExpanded ? "Showing verified dual-rail & sleeper schematic" : "Click to view visual track schematic"}
                </span>
              </div>
            </div>
          )}

          {/* Expanded Nested Station Infrastructure Schematic */}
          {selectedLocation && isStationExpanded && stationInfrastructure && (
            <div className="space-y-4 animate-fade-in">
              <RailwayStationSchematic
                station={stationInfrastructure}
                selectedPlatformNumber={selectedPlatformNumber}
                onSelectPlatform={handleSelectPlatform}
                selectedTrackId={selectedPlatformTrack?.id}
                onSelectTrack={(track) => {
                  if (track.platformNumber) {
                    handleSelectPlatform(track.platformNumber, track);
                  }
                }}
              />

              {/* Platform Detail Schematic */}
              {selectedPlatformNumber !== null && (
                <div className="animate-fade-in pt-1">
                  <PlatformSchematic
                    platformNumber={selectedPlatformNumber}
                    station={stationInfrastructure}
                    associatedTrack={selectedPlatformTrack}
                    onClose={() => {
                      setSelectedPlatformNumber(null);
                      setSelectedPlatformTrack(undefined);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION INFRASTRUCTURE TAB */}
      {activeTab === "INFRASTRUCTURE" && (
        <div className="space-y-5">
          {/* Station Quick Selector Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                Section Stations & Halts ({corridor.locations.length} Locations):
              </span>
              <span className="text-xs font-mono text-slate-500 font-medium">
                Click any station to view its infrastructure layout
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {corridor.locations.map((loc) => (
                <button
                  key={`quick-stn-${loc.code}`}
                  type="button"
                  onClick={() => handleMapSelectLocation(loc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedLocation?.code === loc.code
                      ? "bg-[#0b2545] text-white shadow-xs"
                      : loc.is_major
                      ? "bg-sky-50 text-sky-900 border border-sky-300 hover:bg-sky-100"
                      : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {loc.sequence}. {loc.name} ({loc.code}) {loc.is_major ? "★" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Station Infrastructure Panel */}
          {selectedLocation && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4 font-sans animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-[#0b2545] text-white">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">
                      Section Station Infrastructure
                    </div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                        {selectedLocation.name.toUpperCase()}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300">
                        {selectedLocation.code}
                      </span>
                      <span className="text-xs sm:text-sm font-mono text-slate-500 font-bold">
                        · {formatKmBadge(selectedLocation.km)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infrastructure Attribute Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5 font-mono">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-bold">Platforms</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedLocation.platforms}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Passenger bays</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-bold">Total Tracks</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedLocation.tracks}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Running lines</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-bold">Loops</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedLocation.loops}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Passing loops</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-bold">Sidings</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedLocation.sidings}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Freight/Stabling</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-bold">Traction</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {selectedLocation.electrified ? "25 kV AC" : "Non-Elec"}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Overhead OHE</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-bold">Speed Ceiling</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedLocation.speed_kmph}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">km/h permissible</div>
                </div>
              </div>

              {selectedLocation.notes && (
                <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-200 text-xs sm:text-sm text-sky-950 font-sans leading-relaxed">
                  <strong>Engineering & Yard Characteristics:</strong> {selectedLocation.notes}
                </div>
              )}
            </div>
          )}

          {/* Station Track Layout Schematic */}
          {selectedLocation && stationInfrastructure && (
            <div className="space-y-4 animate-fade-in">
              <RailwayStationSchematic
                station={stationInfrastructure}
                selectedPlatformNumber={selectedPlatformNumber}
                onSelectPlatform={handleSelectPlatform}
                selectedTrackId={selectedPlatformTrack?.id}
                onSelectTrack={(track) => {
                  if (track.platformNumber) {
                    handleSelectPlatform(track.platformNumber, track);
                  }
                }}
              />

              {/* Nested Platform Detail */}
              {selectedPlatformNumber !== null && (
                <div className="animate-fade-in pt-1">
                  <PlatformSchematic
                    platformNumber={selectedPlatformNumber}
                    station={stationInfrastructure}
                    associatedTrack={selectedPlatformTrack}
                    onClose={() => {
                      setSelectedPlatformNumber(null);
                      setSelectedPlatformTrack(undefined);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* INDEX SECTION TAB */}
      {activeTab === "INDEX" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 font-sans">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 font-sans flex items-center space-x-2">
              <Layers className="w-5 h-5 text-sky-700" />
              <span>INDEX SECTION · COMPLETE ROUTE STRUCTURE</span>
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Verified sequential railway progression from {corridor.origin} to {corridor.destination} across {corridor.locations.length} locations.
            </p>
          </div>

          {/* Sequential Route Tree Progression */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto">
            <div className="flex items-center min-w-[1200px] py-2">
              {corridor.locations.map((loc, idx) => (
                <React.Fragment key={`tree-${loc.code}`}>
                  <div
                    onClick={() => handleMapSelectLocation(loc)}
                    className={`flex flex-col items-center p-2 rounded-xl cursor-pointer transition-all ${
                      selectedLocation?.code === loc.code
                        ? "bg-[#0b2545] text-white shadow-md scale-105"
                        : loc.is_major
                        ? "bg-white border-2 border-sky-500 text-slate-900 hover:bg-sky-50"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">{loc.code}</div>
                    <div className="text-xs font-bold text-center truncate max-w-[90px] mt-0.5">
                      {loc.name}
                    </div>
                    <div className={`text-xs font-mono mt-0.5 ${selectedLocation?.code === loc.code ? "text-sky-300" : "text-slate-500 font-medium"}`}>
                      {formatKmBadge(loc.km)}
                    </div>
                  </div>
                  {idx < corridor.locations.length - 1 && (
                    <div className="flex-1 h-0.5 bg-slate-300 min-w-[20px] mx-1 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-400" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Complete Researched Locations Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-xs sm:text-sm font-mono border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-left text-xs uppercase font-extrabold tracking-wider">
                  <th className="py-3 px-3">Seq</th>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Station / Location Name</th>
                  <th className="py-3 px-3">Chainage</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Platforms</th>
                  <th className="py-3 px-3 text-center">Tracks</th>
                  <th className="py-3 px-3 text-center">Loops</th>
                  <th className="py-3 px-3 text-center">Sidings</th>
                  <th className="py-3 px-3">Speed</th>
                  <th className="py-3 px-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {corridor.locations.map((loc) => (
                  <tr
                    key={`tbl-${loc.code}`}
                    onClick={() => handleMapSelectLocation(loc)}
                    className={`cursor-pointer hover:bg-sky-50/70 transition-colors ${
                      selectedLocation?.code === loc.code ? "bg-sky-50 font-bold" : ""
                    }`}
                  >
                    <td className="py-3 px-3 text-slate-400 font-bold">{loc.sequence}</td>
                    <td className="py-3 px-3 font-bold text-sky-800">{loc.code}</td>
                    <td className="py-3 px-3 font-sans font-bold text-slate-900 text-sm">
                      {loc.name} {loc.is_major && <span className="text-amber-500 ml-1">★</span>}
                    </td>
                    <td className="py-3 px-3 font-medium">{formatKmBadge(loc.km)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        loc.category === "MAJOR_JUNCTION"
                          ? "bg-purple-100 text-purple-800"
                          : loc.category === "MAJOR_STATION"
                          ? "bg-sky-100 text-sky-800"
                          : loc.category === "HALT"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {loc.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{loc.platforms}</td>
                    <td className="py-3 px-3 text-center">{loc.tracks}</td>
                    <td className="py-3 px-3 text-center">{loc.loops}</td>
                    <td className="py-3 px-3 text-center">{loc.sidings}</td>
                    <td className="py-3 px-3 font-medium">{loc.speed_kmph} km/h</td>
                    <td className="py-3 px-3">
                      <span className="text-emerald-700 font-bold text-xs">
                        ✓ {loc.verification_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. PRIMARY CONTENT AREA: CORRIDOR BLOCK MANAGEMENT              */}
      {/* ============================================================== */}
      {activeTab === "BLOCK" && (
        <CorridorBlockManagement corridor={corridor} />
      )}
    </div>
  );
};
