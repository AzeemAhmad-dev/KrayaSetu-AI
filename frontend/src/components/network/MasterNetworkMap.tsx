import React, { useState, useRef, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ProvenanceBadge } from "../common/ProvenanceBadge";
import { StationSchematicCanvas } from "../station/StationSchematicCanvas";
import { StationDetailsDrawer } from "../station/StationDetailsDrawer";
import {
  getStationInfrastructure,
  StationInfrastructureData,
  TrackDefinition
} from "../../data/stationInfrastructure";
import {
  Layers,
  Building2,
  GitBranch,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  ChevronRight,
  ExternalLink,
  Info,
  X,
  MapPin,
  ArrowDown,
  Activity,
  ShieldCheck
} from "lucide-react";

interface StationNode {
  code: string;
  name: string;
  hindiName?: string;
  x: number;
  y: number;
  platforms: number;
  category: "NSG-1" | "NSG-2" | "NSG-3" | "NSG-4" | "NSG-5" | "HALT";
  isJunction: boolean;
  corridors: string[];
  km: number;
  divergingRoutes?: string[];
  notes?: string;
}

interface CorridorPath {
  id: string;
  code: string;
  name: string;
  color: string;
  activeColor: string;
  trackConfig: string;
  distanceKm: number;
  speedKmph: number;
  electrification: string;
  stations: string[];
  pathD: string;
}

// Verified Railway Network Geometry for Bhopal Division (West Central Railway)
export const VERIFIED_NETWORK_STATIONS: Record<string, StationNode> = {
  // CORR-03: Khandwa to Itarsi (Trunk Feeder)
  KNW: {
    code: "KNW",
    name: "Khandwa Junction",
    hindiName: "खंडवा जंक्शन",
    x: 180,
    y: 650,
    platforms: 6,
    category: "NSG-3",
    isJunction: true,
    corridors: ["CORR-03"],
    km: 0.0,
    divergingRoutes: ["CR: Towards Bhusawal / Mumbai", "WR: Towards Sanawad / Mhow / Indore"],
    notes: "Central Railway / West Central Railway border interchange junction."
  },
  KKN: {
    code: "KKN",
    name: "Khirkiya",
    hindiName: "खिड़किया",
    x: 270,
    y: 650,
    platforms: 2,
    category: "NSG-5",
    isJunction: false,
    corridors: ["CORR-03"],
    km: 75.0
  },
  HD: {
    code: "HD",
    name: "Harda",
    hindiName: "हरदा",
    x: 350,
    y: 650,
    platforms: 3,
    category: "NSG-4",
    isJunction: false,
    corridors: ["CORR-03"],
    km: 124.0,
    notes: "District Headquarters station on Mumbai-Howrah trunk line."
  },
  BPF: {
    code: "BPF",
    name: "Banapura",
    hindiName: "बानापुरा",
    x: 420,
    y: 650,
    platforms: 2,
    category: "NSG-5",
    isJunction: false,
    corridors: ["CORR-03"],
    km: 156.0
  },

  // CORR-01: Itarsi to Bhopal (Southern Trunk)
  ET: {
    code: "ET",
    name: "Itarsi Junction",
    hindiName: "इटारसी जंक्शन",
    x: 500,
    y: 650,
    platforms: 8,
    category: "NSG-1",
    isJunction: true,
    corridors: ["CORR-01", "CORR-03"],
    km: 0.0,
    divergingRoutes: ["CR/SR: Towards Nagpur / Chennai", "WCR/NCR: Towards Jabalpur / Prayagraj / Howrah"],
    notes: "Major 4-way Central India quad junction hub. Platforms 1 to 8 with Electric Loco Shed (ELS)."
  },
  NDPM: {
    code: "NDPM",
    name: "Narmadapuram",
    hindiName: "नर्मदापुरम",
    x: 500,
    y: 575,
    platforms: 2,
    category: "NSG-4",
    isJunction: false,
    corridors: ["CORR-01"],
    km: 18.0,
    notes: "Narmada River major bridge approach."
  },
  BNI: {
    code: "BNI",
    name: "Budni",
    hindiName: "बुधनी",
    x: 500,
    y: 525,
    platforms: 2,
    category: "NSG-5",
    isJunction: false,
    corridors: ["CORR-01"],
    km: 25.0,
    notes: "Southern gateway to Vindhyachal Ghat section (Midghat)."
  },
  MDDP: {
    code: "MDDP",
    name: "Mandideep",
    hindiName: "मंडीदीप",
    x: 500,
    y: 450,
    platforms: 2,
    category: "NSG-4",
    isJunction: false,
    corridors: ["CORR-01"],
    km: 74.0,
    notes: "Major industrial container and freight yard depot."
  },
  RKMP: {
    code: "RKMP",
    name: "Rani Kamlapati",
    hindiName: "रानी कमलापति",
    x: 500,
    y: 395,
    platforms: 5,
    category: "NSG-2",
    isJunction: true,
    corridors: ["CORR-01"],
    km: 86.0,
    notes: "World-class redeveloped modern terminal hub (formerly Habibganj)."
  },
  BPL: {
    code: "BPL",
    name: "Bhopal Junction",
    hindiName: "भोपाल जंक्शन",
    x: 500,
    y: 340,
    platforms: 6,
    category: "NSG-1",
    isJunction: true,
    corridors: ["CORR-01", "CORR-02"],
    km: 92.0,
    divergingRoutes: ["WR: Towards Ujjain / Indore / Ahmedabad"],
    notes: "Divisional Headquarters interchange. Electronic interlocking network hub."
  },

  // CORR-02: Bhopal to Bina (Northern Trunk)
  SCI: {
    code: "SCI",
    name: "Sanchi",
    hindiName: "सांची",
    x: 545,
    y: 295,
    platforms: 2,
    category: "NSG-5",
    isJunction: false,
    corridors: ["CORR-02"],
    km: 44.0,
    notes: "UNESCO World Heritage cultural station."
  },
  BHS: {
    code: "BHS",
    name: "Vidisha",
    hindiName: "विदिशा",
    x: 580,
    y: 255,
    platforms: 3,
    category: "NSG-3",
    isJunction: false,
    corridors: ["CORR-02"],
    km: 54.0,
    notes: "Major passenger and agricultural trading block station."
  },
  BAQ: {
    code: "BAQ",
    name: "Ganj Basoda",
    hindiName: "गंज बासोदा",
    x: 630,
    y: 200,
    platforms: 3,
    category: "NSG-4",
    isJunction: false,
    corridors: ["CORR-02"],
    km: 94.0
  },
  MABA: {
    code: "MABA",
    name: "Mandi Bamora",
    hindiName: "मंडी बामोरा",
    x: 670,
    y: 155,
    platforms: 2,
    category: "NSG-5",
    isJunction: false,
    corridors: ["CORR-02"],
    km: 126.0
  },
  BINA: {
    code: "BINA",
    name: "Bina Junction",
    hindiName: "बीना जंक्शन",
    x: 710,
    y: 110,
    platforms: 5,
    category: "NSG-2",
    isJunction: true,
    corridors: ["CORR-02", "CORR-04"],
    km: 143.0,
    divergingRoutes: ["NCR: Towards Jhansi / Agra / New Delhi", "WCR/SECR: Towards Katni / Saugor / Bilaspur"],
    notes: "Major 4-way trunk junction gateway connecting Delhi, Mumbai, Katni, and Kota."
  },

  // CORR-04: Bina to Guna (Branch Line)
  MNV: {
    code: "MNV",
    name: "Mungaoli",
    hindiName: "मुंगावली",
    x: 600,
    y: 110,
    platforms: 2,
    category: "NSG-5",
    isJunction: false,
    corridors: ["CORR-04"],
    km: 32.0
  },
  ASKN: {
    code: "ASKN",
    name: "Ashok Nagar",
    hindiName: "अशोक नगर",
    x: 480,
    y: 110,
    platforms: 2,
    category: "NSG-4",
    isJunction: false,
    corridors: ["CORR-04"],
    km: 77.0,
    notes: "District headquarters station."
  },
  GUNA: {
    code: "GUNA",
    name: "Guna Junction",
    hindiName: "गुना जंक्शन",
    x: 360,
    y: 110,
    platforms: 3,
    category: "NSG-3",
    isJunction: true,
    corridors: ["CORR-04", "CORR-05"],
    km: 119.0,
    divergingRoutes: ["WCR: Towards Ruthiyai / Kota / Maksi"],
    notes: "Key interchange connecting West Central trunk with Gwalior and Kota."
  },

  // CORR-05: Guna to Gwalior (North Link)
  BDWS: {
    code: "BDWS",
    name: "Badarwas",
    hindiName: "बदरवास",
    x: 390,
    y: 75,
    platforms: 2,
    category: "NSG-5",
    isJunction: false,
    corridors: ["CORR-05"],
    km: 48.0
  },
  SVPI: {
    code: "SVPI",
    name: "Shivpuri",
    hindiName: "शिवपुरी",
    x: 440,
    y: 45,
    platforms: 2,
    category: "NSG-4",
    isJunction: false,
    corridors: ["CORR-05"],
    km: 102.0,
    notes: "Historic district headquarters station in Madhav National Park region."
  },
  MOJ: {
    code: "MOJ",
    name: "Mohana",
    hindiName: "मोहना",
    x: 500,
    y: 25,
    platforms: 2,
    category: "NSG-5",
    isJunction: false,
    corridors: ["CORR-05"],
    km: 152.0
  },
  GWL: {
    code: "GWL",
    name: "Gwalior Junction",
    hindiName: "ग्वालियर जंक्शन",
    x: 590,
    y: 20,
    platforms: 5,
    category: "NSG-2",
    isJunction: true,
    corridors: ["CORR-05"],
    km: 227.0,
    divergingRoutes: ["NCR: Towards Agra Cantt / New Delhi", "NCR: Towards Dabra / Jhansi"],
    notes: "Northern terminal interchange on Delhi-Mumbai trunk line."
  }
};

export const VERIFIED_CORRIDORS: CorridorPath[] = [
  {
    id: "CORR-01",
    code: "ET-BPL",
    name: "Itarsi – Bhopal (Southern Trunk)",
    color: "#0284c7",
    activeColor: "#0284c7",
    trackConfig: "Triple Line / Double Line",
    distanceKm: 92.0,
    speedKmph: 130,
    electrification: "25 kV AC 50 Hz OHE",
    stations: ["ET", "NDPM", "BNI", "MDDP", "RKMP", "BPL"],
    pathD: "M 500,650 L 500,575 L 500,525 L 500,450 L 500,395 L 500,340"
  },
  {
    id: "CORR-02",
    code: "BPL-BINA",
    name: "Bhopal – Bina (Northern Trunk)",
    color: "#0369a1",
    activeColor: "#0369a1",
    trackConfig: "Double Line (Trunk)",
    distanceKm: 143.0,
    speedKmph: 130,
    electrification: "25 kV AC 50 Hz OHE",
    stations: ["BPL", "SCI", "BHS", "BAQ", "MABA", "BINA"],
    pathD: "M 500,340 L 545,295 L 580,255 L 630,200 L 670,155 L 710,110"
  },
  {
    id: "CORR-03",
    code: "KNW-ET",
    name: "Khandwa – Itarsi (Trunk Feeder)",
    color: "#0f766e",
    activeColor: "#0f766e",
    trackConfig: "Double Line (Trunk Feeder)",
    distanceKm: 184.0,
    speedKmph: 110,
    electrification: "25 kV AC 50 Hz OHE",
    stations: ["KNW", "KKN", "HD", "BPF", "ET"],
    pathD: "M 180,650 L 270,650 L 350,650 L 420,650 L 500,650"
  },
  {
    id: "CORR-04",
    code: "BINA-GUNA",
    name: "Bina – Guna (Branch Line)",
    color: "#6d28d9",
    activeColor: "#6d28d9",
    trackConfig: "Single Line with Doubling",
    distanceKm: 119.0,
    speedKmph: 100,
    electrification: "25 kV AC 50 Hz OHE",
    stations: ["BINA", "MNV", "ASKN", "GUNA"],
    pathD: "M 710,110 L 600,110 L 480,110 L 360,110"
  },
  {
    id: "CORR-05",
    code: "GUNA-GWL",
    name: "Guna – Gwalior (North Link)",
    color: "#b45309",
    activeColor: "#b45309",
    trackConfig: "Single Line (Branch)",
    distanceKm: 227.0,
    speedKmph: 100,
    electrification: "25 kV AC 50 Hz OHE",
    stations: ["GUNA", "BDWS", "SVPI", "MOJ", "GWL"],
    pathD: "M 360,110 L 390,75 L 440,45 L 500,25 L 590,20"
  }
];

export const MasterNetworkMap: React.FC = () => {
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(null);
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>("BPL");
  const [hoveredStationCode, setHoveredStationCode] = useState<string | null>(null);
  const [filterJunctionsOnly, setFilterJunctionsOnly] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any | null>(null);

  // Pan and Zoom transform state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomDetailRef = useRef<HTMLDivElement>(null);

  const selectedStation = selectedStationCode ? VERIFIED_NETWORK_STATIONS[selectedStationCode] : null;
  const selectedCorridor = selectedCorridorId ? VERIFIED_CORRIDORS.find((c) => c.id === selectedCorridorId) : null;

  // Load infrastructure definition for selected station
  const stationInfra = useMemo<StationInfrastructureData | null>(() => {
    if (!selectedStationCode) return null;
    return getStationInfrastructure(selectedStationCode);
  }, [selectedStationCode]);

  // Reset selected sub-element when active station switches
  useEffect(() => {
    setSelectedElement(null);
  }, [selectedStationCode]);

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.6));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleClearSelection = () => {
    setSelectedStationCode(null);
    setSelectedCorridorId(null);
    setSelectedElement(null);
  };

  const handleSelectStation = (code: string | null, shouldScroll = true) => {
    setSelectedStationCode(code);
    setSelectedElement(null);
    if (code && shouldScroll) {
      setTimeout(() => {
        bottomDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(Math.max(prev + zoomDelta, 0.6), 2.5));
  };

  // Major junction hubs for quick selection
  const majorJunctions = useMemo(() => {
    return Object.values(VERIFIED_NETWORK_STATIONS).filter((s) => s.isJunction);
  }, []);

  const platforms = useMemo(() => {
    return stationInfra ? stationInfra.tracks.filter((t) => t.platformNumber) : [];
  }, [stationInfra]);

  const otherTracks = useMemo(() => {
    return stationInfra ? stationInfra.tracks.filter((t) => !t.platformNumber) : [];
  }, [stationInfra]);

  return (
    <div className="space-y-5 font-sans select-none">
      {/* ============================================================== */}
      {/* 1. MAP TELEMETRY & COMMAND STRIP                               */}
      {/* ============================================================== */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-bold tracking-wider text-sky-800 uppercase font-mono">
              MASTER NETWORK MAP · DIVISIONAL SCHEMATIC
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              Bhopal Division (WCR)
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
            Interconnected Railway Corridors & Major Junction Hubs
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Clear Selection Button */}
          {(selectedStationCode !== null || selectedCorridorId !== null) && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-200 hover:border-rose-200 flex items-center space-x-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Selection</span>
            </button>
          )}

          {/* Filter: Junctions Only */}
          <button
            type="button"
            onClick={() => setFilterJunctionsOnly(!filterJunctionsOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              filterJunctionsOnly
                ? "bg-[#0b2545] text-white border-[#0b2545] shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
            }`}
          >
            {filterJunctionsOnly ? "✓ Showing Major Junctions" : "Filter: Major Junctions Only"}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. CORRIDOR SELECTION PILL BAR                                 */}
      {/* ============================================================== */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-[11px] font-bold text-slate-500 uppercase px-2">Corridors:</span>

        <button
          type="button"
          onClick={() => setSelectedCorridorId(null)}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            selectedCorridorId === null
              ? "bg-[#0b2545] text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All Network (5 Corridors)
        </button>

        {VERIFIED_CORRIDORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCorridorId(c.id === selectedCorridorId ? null : c.id)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              selectedCorridorId === c.id
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: c.color }}
            />
            <span>{c.id}</span>
            <span className="hidden md:inline text-slate-400 font-normal">({c.code})</span>
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* 3. HERO MASTER NETWORK MAP (PRIMARY CAD CANVAS)                */}
      {/* ============================================================== */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative min-h-[600px] select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* Subtle Grid Blueprint Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        {/* Floating Zoom & Pan Controls (Top-Left) */}
        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-xs rounded-xl border border-slate-200 shadow-md p-1.5 flex items-center space-x-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="px-2.5 font-mono text-xs font-bold text-slate-700">
            {Math.round(zoom * 100)}%
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {(selectedStationCode !== null || selectedCorridorId !== null) && (
            <>
              <div className="h-4 w-px bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                title="Clear Selection"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deselect</span>
              </button>
            </>
          )}
        </div>

        {/* Floating Active Station / Corridor HUD (Top-Right) */}
        <div className="absolute top-4 right-4 z-20 max-w-sm">
          {selectedStation ? (
            <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-sky-300 shadow-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-900 font-mono">
                    ACTIVE CONTEXT
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                  title="Clear Selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-black text-slate-900 text-sm">
                    {selectedStation.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {selectedStation.isJunction ? "Major Junction Hub" : "Block Station"} · {selectedStation.platforms} PF
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-[#0b2545] text-white">
                  {selectedStation.code}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  bottomDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="w-full py-1.5 px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 border border-sky-200 transition-colors cursor-pointer"
              >
                <span>Inspect Station Infrastructure Below</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : selectedCorridor ? (
            <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-slate-200 shadow-md p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedCorridor.color }}
                  />
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedCorridor.id} · {selectedCorridor.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCorridorId(null)}
                  className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                {selectedCorridor.distanceKm} KM · {selectedCorridor.trackConfig} · Max {selectedCorridor.speedKmph} km/h
              </div>
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200 shadow-xs px-3 py-2 text-xs text-slate-500 font-mono hidden sm:flex items-center space-x-2">
              <Info className="w-3.5 h-3.5 text-sky-700 flex-shrink-0" />
              <span>Click any station or junction node to inspect infrastructure below</span>
            </div>
          )}
        </div>

        {/* Compass Rose & Engineering Scale (Bottom-Left) */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 space-y-1">
          <div className="flex items-center space-x-1.5 font-bold text-slate-800">
            <Compass className="w-4 h-4 text-sky-700" />
            <span>NORTH ↑ (GEOGRAPHIC ACCURACY)</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Broad Gauge (1676mm) · 25 kV AC 50 Hz OHE · Electronic Interlocking
          </div>
        </div>

        {/* Interactive SVG Canvas */}
        <svg
          viewBox="0 0 880 720"
          className="w-full h-full min-h-[600px]"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
        >
          <defs>
            <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.15" />
            </filter>
            <filter id="selectedGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* ============================================================== */}
          {/* 1. DIVERGING EXTERNAL TRUNK ROUTE STUBS                        */}
          {/* ============================================================== */}
          {/* From KNW to Bhusawal / Mumbai (CR) */}
          <g className="diverging-route">
            <line x1={180} y1={650} x2={100} y2={690} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 3" />
            <text x={90} y={705} fill="#64748b" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
              CR: Towards Bhusawal / Mumbai →
            </text>
          </g>
          {/* From KNW to Indore / Mhow (WR) */}
          <g className="diverging-route">
            <line x1={180} y1={650} x2={110} y2={610} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 3" />
            <text x={100} y={600} fill="#64748b" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
              WR: Towards Indore / Mhow →
            </text>
          </g>
          {/* From ET to Nagpur / Chennai (CR/SR) */}
          <g className="diverging-route">
            <line x1={500} y1={650} x2={500} y2={710} stroke="#94a3b8" strokeWidth={2.5} strokeDasharray="5 3" />
            <text x={510} y={708} fill="#64748b" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
              CR/SR: Towards Nagpur / Chennai ↓
            </text>
          </g>
          {/* From ET to Jabalpur / Howrah (WCR) */}
          <g className="diverging-route">
            <line x1={500} y1={650} x2={600} y2={650} stroke="#94a3b8" strokeWidth={2.5} strokeDasharray="5 3" />
            <text x={610} y={654} fill="#64748b" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
              WCR: Towards Jabalpur / Howrah →
            </text>
          </g>
          {/* From BPL to Ujjain / Indore / WR */}
          <g className="diverging-route">
            <line x1={500} y1={340} x2={370} y2={340} stroke="#94a3b8" strokeWidth={2.5} strokeDasharray="5 3" />
            <text x={245} y={336} fill="#64748b" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
              WR: Towards Ujjain / Indore ←
            </text>
          </g>
          {/* From BINA to Katni / Bilaspur (WCR) */}
          <g className="diverging-route">
            <line x1={710} y1={110} x2={810} y2={110} stroke="#94a3b8" strokeWidth={2.5} strokeDasharray="5 3" />
            <text x={760} y={100} fill="#64748b" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
              WCR: Towards Katni / Bilaspur →
            </text>
          </g>
          {/* From BINA to Jhansi / New Delhi (NCR) */}
          <g className="diverging-route">
            <line x1={710} y1={110} x2={710} y2={40} stroke="#94a3b8" strokeWidth={2.5} strokeDasharray="5 3" />
            <text x={715} y={45} fill="#64748b" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
              NCR: Towards Jhansi / New Delhi ↑
            </text>
          </g>
          {/* From GUNA to Ruthiyai / Kota (WCR) */}
          <g className="diverging-route">
            <line x1={360} y1={110} x2={260} y2={110} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 3" />
            <text x={160} y={105} fill="#64748b" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
              WCR: Towards Ruthiyai / Kota ←
            </text>
          </g>
          {/* From GWL to Agra / New Delhi (NCR) */}
          <g className="diverging-route">
            <line x1={590} y1={20} x2={670} y2={20} stroke="#94a3b8" strokeWidth={2.5} strokeDasharray="5 3" />
            <text x={680} y={24} fill="#64748b" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
              NCR: Towards Agra / New Delhi →
            </text>
          </g>

          {/* ============================================================== */}
          {/* 2. CORRIDOR PATHS (DUAL TRACK + BALLAST BED)                   */}
          {/* ============================================================== */}
          {VERIFIED_CORRIDORS.map((c) => {
            const isCorridorSelected = selectedCorridorId === c.id;
            const isOtherCorridorSelected = selectedCorridorId !== null && !isCorridorSelected;

            return (
              <g
                key={`corridor-path-${c.id}`}
                className="cursor-pointer group"
                onClick={() => setSelectedCorridorId(isCorridorSelected ? null : c.id)}
                opacity={isOtherCorridorSelected ? 0.35 : 1}
              >
                {/* Wide invisible stroke for easy click hit area */}
                <path
                  d={c.pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={28}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Ballast bed track foundation */}
                <path
                  d={c.pathD}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth={isCorridorSelected ? 14 : 10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Solid Steel Rail */}
                <path
                  d={c.pathD}
                  fill="none"
                  stroke={isCorridorSelected ? c.activeColor : "#334155"}
                  strokeWidth={isCorridorSelected ? 4.5 : 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Electrification 25kV OHE indicator centerline */}
                <path
                  d={c.pathD}
                  fill="none"
                  stroke={isCorridorSelected ? "#ffffff" : c.color}
                  strokeWidth={isCorridorSelected ? 2 : 1.2}
                  strokeDasharray="6 4"
                />
              </g>
            );
          })}

          {/* ============================================================== */}
          {/* 3. STATIONS & JUNCTION NODES (CLICKABLE CAD ELEMENTS)          */}
          {/* ============================================================== */}
          {Object.values(VERIFIED_NETWORK_STATIONS).map((stn) => {
            if (filterJunctionsOnly && !stn.isJunction) return null;

            const isSelected = selectedStationCode === stn.code;
            const isHovered = hoveredStationCode === stn.code;
            const isAssociatedWithCorridor =
              selectedCorridorId === null ||
              selectedCorridor?.stations.includes(stn.code);

            const nodeOpacity = isAssociatedWithCorridor ? 1 : 0.3;

            return (
              <g
                key={`stn-node-${stn.code}`}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectStation(stn.code);
                }}
                onMouseEnter={() => setHoveredStationCode(stn.code)}
                onMouseLeave={() => setHoveredStationCode(null)}
                opacity={nodeOpacity}
              >
                {/* Hit target circle */}
                <circle
                  cx={stn.x}
                  cy={stn.y}
                  r={stn.isJunction ? 26 : 20}
                  fill="transparent"
                />

                {/* Hover Aura Ring */}
                {isHovered && !isSelected && (
                  <circle
                    cx={stn.x}
                    cy={stn.y}
                    r={stn.isJunction ? 18 : 13}
                    fill="#e0f2fe"
                    fillOpacity={0.6}
                    stroke="#0284c7"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                )}

                {/* Outer Selection Pulsing Ring */}
                {isSelected && (
                  <>
                    <circle
                      cx={stn.x}
                      cy={stn.y}
                      r={stn.isJunction ? 20 : 15}
                      fill="#0284c7"
                      fillOpacity={0.15}
                      stroke="#0284c7"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      filter="url(#selectedGlow)"
                    />
                    <circle
                      cx={stn.x}
                      cy={stn.y}
                      r={stn.isJunction ? 14 : 10}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth={2}
                    />
                  </>
                )}

                {/* Major Junction Outer Hexagon/Ring Indicator */}
                {stn.isJunction && (
                  <circle
                    cx={stn.x}
                    cy={stn.y}
                    r={12}
                    fill="none"
                    stroke={isSelected ? "#0284c7" : "#0f172a"}
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                  />
                )}

                {/* Node Solid Circle */}
                <circle
                  cx={stn.x}
                  cy={stn.y}
                  r={stn.isJunction ? 8.5 : 5.5}
                  fill={
                    isSelected
                      ? "#0284c7"
                      : isHovered
                      ? "#0369a1"
                      : stn.isJunction
                      ? "#0b2545"
                      : "#ffffff"
                  }
                  stroke={
                    isSelected
                      ? "#ffffff"
                      : stn.isJunction
                      ? "#0f172a"
                      : "#475569"
                  }
                  strokeWidth={stn.isJunction ? 2.5 : 2}
                  filter="url(#nodeShadow)"
                />

                {/* Center Hub Pip */}
                <circle
                  cx={stn.x}
                  cy={stn.y}
                  r={stn.isJunction ? 2.5 : 1.5}
                  fill={isSelected ? "#ffffff" : stn.isJunction ? "#38bdf8" : "#0f172a"}
                />

                {/* Station Label Background Pill for High Contrast */}
                <rect
                  x={stn.x + (stn.isJunction ? 14 : 9)}
                  y={stn.y - 8}
                  width={stn.name.length * (stn.isJunction ? 7.8 : 6.8) + (stn.isJunction ? 42 : 12)}
                  height={17}
                  rx={4}
                  fill={isSelected ? "#0b2545" : isHovered ? "#f1f5f9" : "#ffffff"}
                  fillOpacity={isSelected ? 0.95 : isHovered ? 0.9 : 0.8}
                  stroke={isSelected ? "#0284c7" : isHovered ? "#cbd5e1" : "transparent"}
                  strokeWidth={1}
                />

                {/* Station Label */}
                <text
                  x={stn.x + (stn.isJunction ? 18 : 13)}
                  y={stn.y + 4}
                  fill={isSelected ? "#ffffff" : isHovered ? "#0284c7" : stn.isJunction ? "#0f172a" : "#334155"}
                  fontSize={stn.isJunction ? "11" : "9.5"}
                  fontWeight={stn.isJunction ? "800" : "600"}
                  fontFamily="'Inter', sans-serif"
                  className="select-none pointer-events-none"
                >
                  {stn.name}
                  {stn.isJunction && (
                    <tspan fill={isSelected ? "#38bdf8" : "#64748b"} fontSize="9" fontWeight="700" dx="4">
                      [{stn.code}]
                    </tspan>
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ============================================================== */}
      {/* 4. STATION-SPECIFIC INFORMATION AREA (BOTTOM DETAIL PANEL)     */}
      {/* ============================================================== */}
      <div ref={bottomDetailRef} className="space-y-5 pt-2">
        {selectedStationCode && stationInfra ? (
          <div className="space-y-5">
            {/* 4A. SELECTED STATION CONTEXT CARD */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-sky-800 font-mono">
                    <Building2 className="w-4 h-4 text-sky-700" />
                    <span>Selected Station</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">{stationInfra.division} · {stationInfra.zone}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {stationInfra.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-lg text-sm font-mono font-bold bg-[#0b2545] text-white">
                      {stationInfra.code}
                    </span>
                    {stationInfra.hindiName && (
                      <span className="text-slate-500 font-sans text-sm font-medium">
                        ({stationInfra.hindiName})
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-mono mt-1">
                    {selectedStation?.isJunction ? "Major Interchange Junction Hub" : "Permanent Way Block Station"} · Category: {stationInfra.category} · Chainage: {stationInfra.chainageKm} KM
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Selection</span>
                  </button>
                </div>
              </div>

              {/* Station Infrastructure Telemetry Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Platforms</span>
                  <strong className="text-slate-900 font-mono text-sm">{stationInfra.platformsCount} Passenger PF</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Total Tracks</span>
                  <strong className="text-slate-900 font-mono text-sm">{stationInfra.tracks.length} Lines</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Passing Loops</span>
                  <strong className="text-slate-900 font-mono text-sm">{stationInfra.loopsCount} Loops</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Goods Sidings</span>
                  <strong className="text-slate-900 font-mono text-sm">{stationInfra.sidingsCount} Sidings</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Speed Ceiling</span>
                  <strong className="text-sky-800 font-mono text-sm">60 km/h Max Yard</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Signaling / RRI</span>
                  <strong className="text-emerald-700 font-mono text-xs truncate block">{stationInfra.rriType || "Electronic Interlocking"}</strong>
                </div>
              </div>
            </div>

            {/* 4B. STATION INFRASTRUCTURE SCHEMATIC VIEW */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 font-sans flex items-center space-x-2">
                    <Compass className="w-5 h-5 text-sky-700" />
                    <span>Station Infrastructure — {stationInfra.name} ({stationInfra.code})</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Engineering drawing schematic of permanent way tracks, concrete platform bays, through lines, loops, sidings, and turnouts.
                  </p>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Interactive Engineering Canvas · Click any line/platform to inspect details</span>
                </div>
              </div>

              {/* Schematic Canvas Container + Drawer */}
              <div className="flex flex-col lg:flex-row gap-5 items-start">
                <div className="flex-1 w-full overflow-hidden">
                  <StationSchematicCanvas
                    infrastructure={stationInfra}
                    selectedElement={selectedElement}
                    onSelectElement={(el) => setSelectedElement(el)}
                  />
                </div>

                {selectedElement && (
                  <StationDetailsDrawer
                    element={selectedElement}
                    onClose={() => setSelectedElement(null)}
                    stationName={stationInfra.name}
                    stationCode={stationInfra.code}
                  />
                )}
              </div>
            </div>

            {/* 4C. RELEVANT STATION INFRASTRUCTURE INFORMATION */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              {/* Panel 1: Platform Specifications */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-semibold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                    <Building2 className="w-4 h-4 text-sky-700" />
                    <span>Platform Berths ({platforms.length})</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Passenger Decks</span>
                </div>

                <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[280px] text-xs">
                  {platforms.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedElement(p)}
                      className={`py-2.5 first:pt-0 flex items-center justify-between cursor-pointer rounded-lg px-2 -mx-2 transition-colors ${
                        selectedElement?.id === p.id ? "bg-sky-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 flex items-center space-x-2">
                          <span className="px-1.5 py-0.5 bg-sky-100 text-sky-900 rounded font-mono text-[10px]">
                            PF {p.platformNumber}
                          </span>
                          <span className="truncate max-w-[180px]">{p.name}</span>
                        </div>
                        <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                          {p.lengthMeters}m CSR · Deck: {p.platformSide || "Island"} · Max {Math.min(p.speedLimitKmph || 60, 60)} km/h
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {p.electrified ? "25kV AC" : "Non-Elec"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel 2: P.Way Running Lines & Loops */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-semibold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-sky-700" />
                    <span>Running Tracks & Loops ({otherTracks.length})</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Lines & Sidings</span>
                </div>

                <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[280px] text-xs">
                  {otherTracks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedElement(t)}
                      className={`py-2.5 first:pt-0 flex items-center justify-between cursor-pointer rounded-lg px-2 -mx-2 transition-colors ${
                        selectedElement?.id === t.id ? "bg-sky-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 flex items-center space-x-2">
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-[10px]">
                            {t.trackType}
                          </span>
                          <span className="truncate max-w-[180px]">{t.name}</span>
                        </div>
                        <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                          {t.lengthMeters}m CSR · Speed {Math.min(t.speedLimitKmph || 60, 60)} km/h
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {t.defaultStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel 3: Interlocking Points & Turnouts */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-semibold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                    <GitBranch className="w-4 h-4 text-sky-700" />
                    <span>Interlocking Points ({stationInfra.turnouts.length})</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Turnouts / Crossovers</span>
                </div>

                <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[280px] text-xs">
                  {stationInfra.turnouts.length > 0 ? (
                    stationInfra.turnouts.map((tn) => (
                      <div
                        key={tn.id}
                        onClick={() => setSelectedElement({ ...tn, isTurnout: true })}
                        className={`py-2.5 first:pt-0 flex items-center justify-between cursor-pointer rounded-lg px-2 -mx-2 transition-colors ${
                          selectedElement?.id === tn.id ? "bg-sky-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span className="font-mono text-sky-800">{tn.id}</span>
                            <span className="text-slate-700">({tn.name})</span>
                          </div>
                          <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                            {tn.type} · Position: {tn.xPercent}%
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-slate-500 text-xs">
                      Solid State Interlocking (SSI) automatic routing
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 4D. EMPTY / PLACEHOLDER STATE (NO STATION SELECTED) */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-800 flex items-center justify-center mx-auto border border-sky-100 shadow-xs">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide font-mono">
                NO STATION SELECTED
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Click any railway station or major junction node on the Master Network Map above to inspect its engineering track schematic and physical infrastructure.
              </p>
            </div>

            <div className="pt-2 max-w-2xl mx-auto">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-2.5">
                Quick Select Major Junction Hubs
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {majorJunctions.map((stn) => (
                  <button
                    key={`quick-${stn.code}`}
                    type="button"
                    onClick={() => handleSelectStation(stn.code)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-[#0b2545] hover:text-white text-slate-800 border border-slate-200 hover:border-[#0b2545] transition-all cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                  >
                    <span className="font-mono text-sky-700 font-bold">[{stn.code}]</span>
                    <span>{stn.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded font-mono">
                      {stn.platforms} PF
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
