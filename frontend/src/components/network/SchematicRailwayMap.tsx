import React, { useState } from "react";
import { ProvenanceBadge } from "../common/ProvenanceBadge";
import { Layers, Building2, GitBranch, MapPin, X } from "lucide-react";

interface Props {
  corridors?: any[];
  onStationSelect?: (stationCode: string) => void;
}

// Normalized coordinate layout for Bhopal Division 5 Corridors & Major Stations
const STATION_COORDS: Record<
  string,
  { x: number; y: number; code: string; name: string; platforms: number; isJunction?: boolean; corridor: string; km: number }
> = {
  // CORR-01: Itarsi -> Bhopal (Southern Trunk)
  ET: { x: 380, y: 520, code: "ET", name: "Itarsi Junction", platforms: 8, isJunction: true, corridor: "CORR-01 (Itarsi–Bhopal)", km: 0.0 },
  NDPM: { x: 380, y: 450, code: "NDPM", name: "Narmadapuram", platforms: 2, corridor: "CORR-01 (Itarsi–Bhopal)", km: 18.0 },
  RKMP: { x: 380, y: 375, code: "RKMP", name: "Rani Kamlapati", platforms: 5, corridor: "CORR-01 (Itarsi–Bhopal)", km: 86.0 },
  BPL: { x: 380, y: 310, code: "BPL", name: "Bhopal Junction", platforms: 6, isJunction: true, corridor: "CORR-01 & CORR-02", km: 92.0 },

  // CORR-02: Bhopal -> Bina (Northern Trunk)
  BHS: { x: 380, y: 230, code: "BHS", name: "Vidisha", platforms: 3, corridor: "CORR-02 (Bhopal–Bina)", km: 54.0 },
  BAQ: { x: 380, y: 160, code: "BAQ", name: "Ganj Basoda", platforms: 3, corridor: "CORR-02 (Bhopal–Bina)", km: 94.0 },
  MABA: { x: 380, y: 110, code: "MABA", name: "Mandi Bamora", platforms: 2, corridor: "CORR-02 (Bhopal–Bina)", km: 126.0 },
  BINA: { x: 380, y: 60, code: "BINA", name: "Bina Junction", platforms: 5, isJunction: true, corridor: "CORR-02 & CORR-04", km: 143.0 },

  // CORR-03: Khandwa -> Itarsi (Trunk Feeder)
  KNW: { x: 100, y: 520, code: "KNW", name: "Khandwa Junction", platforms: 6, isJunction: true, corridor: "CORR-03 (Khandwa–Itarsi)", km: 0.0 },
  CAER: { x: 160, y: 520, code: "CAER", name: "Chhanera", platforms: 2, corridor: "CORR-03 (Khandwa–Itarsi)", km: 49.0 },
  KKN: { x: 220, y: 520, code: "KKN", name: "Khirkiya", platforms: 2, corridor: "CORR-03 (Khandwa–Itarsi)", km: 75.0 },
  HD: { x: 275, y: 520, code: "HD", name: "Harda", platforms: 3, corridor: "CORR-03 (Khandwa–Itarsi)", km: 124.0 },
  BPF: { x: 330, y: 520, code: "BPF", name: "Banapura", platforms: 2, corridor: "CORR-03 (Khandwa–Itarsi)", km: 156.0 },

  // CORR-04: Bina -> Guna (Branch Line)
  MNV: { x: 500, y: 60, code: "MNV", name: "Mungaoli", platforms: 2, corridor: "CORR-04 (Bina–Guna)", km: 32.0 },
  ASKN: { x: 610, y: 60, code: "ASKN", name: "Ashoknagar", platforms: 2, corridor: "CORR-04 (Bina–Guna)", km: 77.0 },
  GUNA: { x: 740, y: 60, code: "GUNA", name: "Guna Junction", platforms: 3, isJunction: true, corridor: "CORR-04 & CORR-05", km: 119.0 },

  // CORR-05: Guna -> Gwalior (Branch Line)
  BDWS: { x: 740, y: 150, code: "BDWS", name: "Badarwas", platforms: 2, corridor: "CORR-05 (Guna–Gwalior)", km: 48.0 },
  SVPI: { x: 740, y: 240, code: "SVPI", name: "Shivpuri", platforms: 2, corridor: "CORR-05 (Guna–Gwalior)", km: 102.0 },
  MOJ: { x: 740, y: 340, code: "MOJ", name: "Mohana", platforms: 2, corridor: "CORR-05 (Guna–Gwalior)", km: 152.0 },
  GWL: { x: 740, y: 450, code: "GWL", name: "Gwalior Junction", platforms: 5, isJunction: true, corridor: "CORR-05 (Guna–Gwalior)", km: 227.0 },
};

export const SchematicRailwayMap: React.FC<Props> = ({
  onStationSelect,
}) => {
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>("BPL");

  const selectedStation = selectedStationCode ? STATION_COORDS[selectedStationCode] : null;

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col font-sans select-none">
      {/* Map Header Controls */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-slate-900">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-sky-800 text-white">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 font-mono uppercase tracking-wider">
              Bhopal Division · 5 Active Corridors Network Map
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              765 Route KM · 5 Corridors · 100% Electrified 25 kV AC OHE
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Map + Side Details Panel */}
      <div className="flex flex-col lg:flex-row items-stretch">
        {/* SVG Canvas Map */}
        <div className="flex-1 p-4 overflow-x-auto relative flex items-center justify-center min-h-[440px] bg-[#fbfcfd]">
          {/* Subtle grid background */}
          <div
            className="absolute inset-0 opacity-[0.35] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <svg
            viewBox="0 0 980 580"
            className="w-full h-auto"
            style={{ minWidth: "820px", maxHeight: "560px" }}
          >
            {/* ==================================================== */}
            {/* CORRIDOR 1: ITARSI (ET) -> BHOPAL (BPL)              */}
            {/* ==================================================== */}
            <g className="corridor-1">
              <line x1={380} y1={520} x2={380} y2={310} stroke="#f1f5f9" strokeWidth={12} strokeLinecap="round" />
              <line x1={380} y1={520} x2={380} y2={310} stroke="#1e293b" strokeWidth={3} strokeLinecap="round" />
              <line x1={386} y1={520} x2={386} y2={310} stroke="#0284c7" strokeWidth={1.5} strokeDasharray="6 3" />
              <text x={396} y={420} fill="#475569" fontSize="10" fontFamily="'Inter', sans-serif" fontWeight="600" letterSpacing="0.02em" transform="rotate(90 396 420)">
                CORR-01: ITARSI–BHOPAL (92 KM)
              </text>
            </g>

            {/* ==================================================== */}
            {/* CORRIDOR 2: BHOPAL (BPL) -> BINA (BINA)              */}
            {/* ==================================================== */}
            <g className="corridor-2">
              <line x1={380} y1={310} x2={380} y2={60} stroke="#f1f5f9" strokeWidth={12} strokeLinecap="round" />
              <line x1={380} y1={310} x2={380} y2={60} stroke="#1e293b" strokeWidth={3} strokeLinecap="round" />
              <line x1={386} y1={310} x2={386} y2={60} stroke="#0284c7" strokeWidth={1.5} strokeDasharray="6 3" />
              <text x={396} y={180} fill="#475569" fontSize="10" fontFamily="'Inter', sans-serif" fontWeight="600" letterSpacing="0.02em" transform="rotate(90 396 180)">
                CORR-02: BHOPAL–BINA (143 KM)
              </text>
            </g>

            {/* ==================================================== */}
            {/* CORRIDOR 3: KHANDWA (KNW) -> ITARSI (ET)             */}
            {/* ==================================================== */}
            <g className="corridor-3">
              <line x1={100} y1={520} x2={380} y2={520} stroke="#f1f5f9" strokeWidth={11} strokeLinecap="round" />
              <line x1={100} y1={520} x2={380} y2={520} stroke="#1e293b" strokeWidth={3} strokeLinecap="round" />
              <text x={240} y={542} fill="#475569" fontSize="10" fontFamily="'Inter', sans-serif" fontWeight="600" letterSpacing="0.02em" textAnchor="middle">
                CORR-03: KHANDWA–ITARSI (184 KM)
              </text>
            </g>

            {/* ==================================================== */}
            {/* CORRIDOR 4: BINA (BINA) -> GUNA (GUNA)               */}
            {/* ==================================================== */}
            <g className="corridor-4">
              <line x1={380} y1={60} x2={740} y2={60} stroke="#f1f5f9" strokeWidth={10} strokeLinecap="round" />
              <line x1={380} y1={60} x2={740} y2={60} stroke="#1e293b" strokeWidth={2.5} strokeLinecap="round" />
              <text x={560} y={48} fill="#475569" fontSize="10" fontFamily="'Inter', sans-serif" fontWeight="600" letterSpacing="0.02em" textAnchor="middle">
                CORR-04: BINA–GUNA (119 KM)
              </text>
            </g>

            {/* ==================================================== */}
            {/* CORRIDOR 5: GUNA (GUNA) -> GWALIOR (GWL)             */}
            {/* ==================================================== */}
            <g className="corridor-5">
              <line x1={740} y1={60} x2={740} y2={450} stroke="#f1f5f9" strokeWidth={10} strokeLinecap="round" />
              <line x1={740} y1={60} x2={740} y2={450} stroke="#1e293b" strokeWidth={2.5} strokeLinecap="round" />
              <text x={754} y={260} fill="#475569" fontSize="10" fontFamily="'Inter', sans-serif" fontWeight="600" letterSpacing="0.02em" transform="rotate(90 754 260)">
                CORR-05: GUNA–GWALIOR (227 KM)
              </text>
            </g>

            {/* ==================================================== */}
            {/* STATIONS & JUNCTION NODES                            */}
            {/* ==================================================== */}
            {Object.values(STATION_COORDS).map((stn) => {
              const isSelected = selectedStationCode === stn.code;
              const isJunction = !!stn.isJunction;

              return (
                <g
                  key={stn.code}
                  className="station-node cursor-pointer group"
                  onClick={() => {
                    setSelectedStationCode(stn.code);
                    if (onStationSelect) onStationSelect(stn.code);
                  }}
                >
                  {/* Outer selection ring */}
                  {isSelected && (
                    <circle cx={stn.x} cy={stn.y} r={isJunction ? 14 : 11} fill="none" stroke="#0284c7" strokeWidth={2} />
                  )}

                  {/* Node Circle */}
                  <circle
                    cx={stn.x}
                    cy={stn.y}
                    r={isJunction ? 9 : 6}
                    fill={isSelected ? "#0284c7" : isJunction ? "#0f172a" : "#ffffff"}
                    stroke={isSelected ? "#38bdf8" : "#0f172a"}
                    strokeWidth={2}
                  />

                  {/* Station Code & Name Label */}
                  <text
                    x={stn.x + (stn.x >= 740 ? 14 : 12)}
                    y={stn.y + 4}
                    fill={isSelected ? "#0369a1" : isJunction ? "#0f172a" : "#334155"}
                    fontSize={isJunction ? 11.5 : 10.5}
                    fontWeight={isJunction ? "700" : "600"}
                    fontFamily="'Inter', sans-serif"
                  >
                    {stn.name} ({stn.code})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Side Infrastructure Inspector Panel */}
        {selectedStation && (
          <div className="w-full lg:w-80 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-4 text-slate-900 flex flex-col justify-between text-xs font-sans">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-sky-700" />
                  <span className="font-bold text-sm text-slate-900 font-mono">
                    {selectedStation.name}
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-300">
                  {selectedStation.code}
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-xs">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Station Classification</div>
                  <div className="font-bold text-sky-900 text-sm">
                    {selectedStation.isJunction ? "MAJOR RAILWAY JUNCTION" : "PASSENGER BLOCK STATION"}
                  </div>
                  <div className="text-[11px] text-slate-500">Bhopal Division · West Central Railway</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <div className="text-[10px] text-slate-500 font-bold">Platforms</div>
                    <div className="font-black text-slate-900 text-xs mt-0.5">{selectedStation.platforms} Platforms</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <div className="text-[10px] text-slate-500 font-bold">Chainage</div>
                    <div className="font-black text-slate-900 text-xs mt-0.5">KM {selectedStation.km.toFixed(1)}</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-xs">
                  <div className="text-[10px] text-slate-500 font-bold">Corridor Association</div>
                  <div className="font-bold text-slate-800">{selectedStation.corridor}</div>
                  <div className="text-[11px] text-emerald-700 font-sans font-semibold">
                    ✓ Electrified 25 kV AC 50 Hz Traction
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
