import React from "react";
import { TrackDefinition, StationInfrastructureData } from "../../data/stationInfrastructure";
import {
  Ruler,
  ShieldCheck,
  Zap,
  Gauge,
  X,
  Footprints
} from "lucide-react";

interface PlatformSchematicProps {
  platformNumber: number;
  station: StationInfrastructureData;
  associatedTrack?: TrackDefinition;
  onClose?: () => void;
}

export const PlatformSchematic: React.FC<PlatformSchematicProps> = ({
  platformNumber,
  station,
  associatedTrack,
  onClose,
}) => {
  // Determine if island platform (serves multiple tracks or marked island)
  const isIsland = associatedTrack?.platformSide === "ISLAND" || (platformNumber > 1 && platformNumber < station.platformsCount);
  const trackName = associatedTrack?.name || `Platform ${platformNumber} Line`;
  const speedLimit = Math.min(associatedTrack?.speedLimitKmph || (platformNumber <= 2 ? 60 : 50), 60);
  const lengthMeters = associatedTrack?.lengthMeters || 650;
  const isElectrified = associatedTrack?.electrified ?? true;

  // Track coordinates for SVG
  const SVG_WIDTH = 880;
  const SVG_HEIGHT = isIsland ? 220 : 180;
  const PLATFORM_Y = isIsland ? 90 : 55;
  const PLATFORM_HEIGHT = 44;
  const START_X = 60;
  const END_X = SVG_WIDTH - 60;
  const DECK_WIDTH = END_X - START_X;

  const SLEEPER_STEP = 10;
  const SLEEPER_LEN = 20;
  const HALF_SLEEPER = SLEEPER_LEN / 2;
  const GAUGE = 11;
  const HALF_GAUGE = GAUGE / 2;

  // Sleepers for a line
  const renderSleepers = (trackY: number) => {
    const count = Math.floor(DECK_WIDTH / SLEEPER_STEP);
    const lines = [];
    for (let i = 0; i <= count; i++) {
      const sx = START_X + i * SLEEPER_STEP;
      lines.push(
        <line
          key={`slp-${trackY}-${i}`}
          x1={sx}
          y1={trackY - HALF_SLEEPER}
          x2={sx}
          y2={trackY + HALF_SLEEPER}
          stroke="#64748b"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      );
    }
    return lines;
  };

  const TRACK_UP_Y = PLATFORM_Y - 26;
  const TRACK_DOWN_Y = PLATFORM_Y + PLATFORM_HEIGHT + 26;

  return (
    <div className="bg-white rounded-2xl border border-sky-200 shadow-sm overflow-hidden font-sans space-y-4 p-5 animate-fade-in">
      {/* ------------------------------------------------------------- */}
      {/* 1. COMPACT HEADER WITH LEVEL 4 TITLE & CONTROLS               */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-lg bg-sky-800 text-white font-mono font-black text-sm">
            PF {platformNumber}
          </div>
          <div>
            <div className="text-[10px] font-mono text-sky-800 uppercase tracking-widest font-bold">
              NESTED INFRASTRUCTURE · PLATFORM SCHEMATIC
            </div>
            <h4 className="text-base sm:text-lg font-bold text-slate-900">
              {station.name.toUpperCase()} · PLATFORM {platformNumber} SPECIFICATION
            </h4>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 text-xs font-mono font-bold">
            {isIsland ? "ISLAND PLATFORM" : "SIDE PLATFORM"}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-bold flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VERIFIED CSR {lengthMeters}M</span>
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Close platform schematic"
              aria-label="Close platform schematic"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. COMPACT LIGHT SVG PLATFORM & TRACK SCHEMATIC              */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full overflow-x-auto bg-[#fbfcfd] rounded-xl border border-slate-200 p-2.5 relative">
        {/* Subtle engineering grid background */}
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto"
          style={{ minWidth: "680px" }}
        >
          {/* Concourse Boundary if Side Platform */}
          {!isIsland && (
            <g transform={`translate(${START_X}, 14)`}>
              <rect
                x={0}
                y={0}
                width={DECK_WIDTH}
                height={26}
                rx={4}
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <text
                x={DECK_WIDTH / 2}
                y={17}
                fill="#64748b"
                fontSize="11"
                fontFamily="'Inter', sans-serif"
                fontWeight="600"
                letterSpacing="0.02em"
                textAnchor="middle"
              >
                STATION CONCOURSE & AIR-PLAZA PEDESTRIAN INTERFACE
              </text>
            </g>
          )}

          {/* TOP TRACK (If Island Platform) */}
          {isIsland && (
            <g className="platform-top-track">
              {/* Ballast */}
              <rect
                x={START_X - 20}
                y={TRACK_UP_Y - 11}
                width={DECK_WIDTH + 40}
                height={22}
                rx={3}
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth={0.8}
              />
              {/* Sleepers */}
              {renderSleepers(TRACK_UP_Y)}
              {/* Dual Steel Rails */}
              <line
                x1={START_X - 20}
                y1={TRACK_UP_Y - HALF_GAUGE}
                x2={END_X + 20}
                y2={TRACK_UP_Y - HALF_GAUGE}
                stroke="#1e293b"
                strokeWidth={2}
              />
              <line
                x1={START_X - 20}
                y1={TRACK_UP_Y + HALF_GAUGE}
                x2={END_X + 20}
                y2={TRACK_UP_Y + HALF_GAUGE}
                stroke="#1e293b"
                strokeWidth={2}
              />
              {/* Track Tag */}
              <text
                x={START_X + 15}
                y={TRACK_UP_Y - 15}
                fill="#0f172a"
                fontSize="11"
                fontFamily="'Inter', sans-serif"
                fontWeight="600"
                letterSpacing="-0.01em"
              >
                BERTHING LINE A · BROAD GAUGE 1676MM
              </text>
            </g>
          )}

          {/* ==================================================== */}
          {/* PLATFORM SLAB & FACILITIES                           */}
          {/* ==================================================== */}
          <g className="platform-deck" transform={`translate(${START_X}, ${PLATFORM_Y})`}>
            {/* Concrete Slab Deck */}
            <rect
              x={0}
              y={0}
              width={DECK_WIDTH}
              height={PLATFORM_HEIGHT}
              rx={4}
              fill="#ffffff"
              stroke="#0284c7"
              strokeWidth={1.5}
            />

            {/* Tactile Yellow Safety Hazard Line (Bottom Track Edge) */}
            <line
              x1={4}
              y1={PLATFORM_HEIGHT - 4}
              x2={DECK_WIDTH - 4}
              y2={PLATFORM_HEIGHT - 4}
              stroke="#eab308"
              strokeWidth={2.5}
              strokeDasharray="6 3"
            />

            {/* Tactile Yellow Safety Hazard Line (Top Track Edge, if Island) */}
            {isIsland && (
              <line
                x1={4}
                y1={4}
                x2={DECK_WIDTH - 4}
                y2={4}
                stroke="#eab308"
                strokeWidth={2.5}
                strokeDasharray="6 3"
              />
            )}

            {/* Canopy Pillars / Roof Structural Grid */}
            {[0.15, 0.35, 0.5, 0.65, 0.85].map((pos, idx) => (
              <g key={`pillar-${idx}`} transform={`translate(${DECK_WIDTH * pos - 5}, ${PLATFORM_HEIGHT / 2 - 5})`}>
                <rect x={0} y={0} width={10} height={10} rx={2} fill="#e2e8f0" stroke="#64748b" strokeWidth={1} />
                <circle cx={5} cy={5} r={1.5} fill="#0284c7" />
              </g>
            ))}

            {/* FOB Ramp / Stairs Marker */}
            <g transform={`translate(${DECK_WIDTH * 0.5 - 55}, ${PLATFORM_HEIGHT / 2 - 9})`}>
              <rect x={0} y={0} width={110} height={18} rx={3} fill="#0284c7" fillOpacity={0.1} stroke="#0284c7" strokeWidth={1} />
              <text x={55} y={12.5} fill="#0369a1" fontSize="10" fontFamily="'Inter', sans-serif" fontWeight="600" letterSpacing="0.02em" textAnchor="middle">
                FOB OVERBRIDGE RAMP
              </text>
            </g>

            {/* Platform Text Center Spine */}
            <text
              x={DECK_WIDTH * 0.22}
              y={PLATFORM_HEIGHT / 2 + 4.5}
              fill="#0f172a"
              fontSize="13"
              fontFamily="'Inter', sans-serif"
              fontWeight="700"
              letterSpacing="0.05em"
              textAnchor="middle"
            >
              PLATFORM {platformNumber}
            </text>

            <text
              x={DECK_WIDTH * 0.78}
              y={PLATFORM_HEIGHT / 2 + 4.5}
              fill="#475569"
              fontSize="11"
              fontFamily="'Inter', sans-serif"
              fontWeight="600"
              letterSpacing="0.02em"
              textAnchor="middle"
            >
              24-COACH LHB CAPACITY ({lengthMeters}M CSR)
            </text>
          </g>

          {/* BOTTOM TRACK (Primary track adjacent to platform) */}
          <g className="platform-bottom-track">
            {/* Ballast */}
            <rect
              x={START_X - 20}
              y={TRACK_DOWN_Y - 11}
              width={DECK_WIDTH + 40}
              height={22}
              rx={3}
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth={0.8}
            />
            {/* Sleepers */}
            {renderSleepers(TRACK_DOWN_Y)}
            {/* Dual Steel Rails */}
            <line
              x1={START_X - 20}
              y1={TRACK_DOWN_Y - HALF_GAUGE}
              x2={END_X + 20}
              y2={TRACK_DOWN_Y - HALF_GAUGE}
              stroke="#1e293b"
              strokeWidth={2}
            />
            <line
              x1={START_X - 20}
              y1={TRACK_DOWN_Y + HALF_GAUGE}
              x2={END_X + 20}
              y2={TRACK_DOWN_Y + HALF_GAUGE}
              stroke="#1e293b"
              strokeWidth={2}
            />
            {/* Track Tag */}
            <text
              x={START_X + 15}
              y={TRACK_DOWN_Y + 24}
              fill="#0f172a"
              fontSize="11"
              fontFamily="'Inter', sans-serif"
              fontWeight="600"
              letterSpacing="-0.01em"
            >
              {trackName.toUpperCase()} · 60KG UIC RAIL
            </text>
          </g>
        </svg>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. PHYSICAL ATTRIBUTES SPECIFICATION GRID                      */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 uppercase font-semibold flex items-center space-x-1">
            <Ruler className="w-3.5 h-3.5 text-sky-700" />
            <span>Clear Length</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">{lengthMeters} M</div>
          <div className="text-xs text-slate-500 mt-0.5">24-Coach Broad Gauge</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 uppercase font-semibold flex items-center space-x-1">
            <Footprints className="w-3.5 h-3.5 text-sky-700" />
            <span>Deck Height</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">840 mm</div>
          <div className="text-xs text-slate-500 mt-0.5">High Level Passenger</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 uppercase font-semibold flex items-center space-x-1">
            <Gauge className="w-3.5 h-3.5 text-sky-700" />
            <span>Berth Speed</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">{speedLimit} km/h</div>
          <div className="text-xs text-slate-500 mt-0.5">Speed ceiling</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 uppercase font-semibold flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 text-sky-700" />
            <span>Electrification</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">
            {isElectrified ? "25 kV AC" : "Non-Elec"}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">50 Hz OHE Catenary</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 uppercase font-semibold">Safety Edge</div>
          <div className="text-base font-semibold text-amber-700 mt-1">Tactile Yellow</div>
          <div className="text-xs text-slate-500 mt-0.5">IS:3087 Hazard Edge</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 uppercase font-semibold">Access</div>
          <div className="text-base font-semibold text-slate-900 mt-1">FOB & Ramps</div>
          <div className="text-xs text-slate-500 mt-0.5">Air-Plaza Connected</div>
        </div>
      </div>
    </div>
  );
};
