import React from "react";
import {
  Building2,
  X,
  Gauge,
  Ruler,
  Zap,
  GitBranch,
  Layers,
  ShieldCheck,
  Info
} from "lucide-react";
import { ProvenanceBadge } from "../common/ProvenanceBadge";

interface StationDetailsDrawerProps {
  element: any | null;
  onClose: () => void;
  stationName: string;
  stationCode: string;
}

export const StationDetailsDrawer: React.FC<StationDetailsDrawerProps> = ({
  element,
  onClose,
  stationName,
  stationCode,
}) => {
  if (!element) return null;

  const isTurnout = !!element.isTurnout;

  return (
    <div className="w-full lg:w-80 xl:w-96 bg-white rounded-xl border border-slate-200 shadow-md flex flex-col flex-shrink-0 font-sans overflow-hidden animate-fade-in">
      {/* Drawer Header */}
      <div className="p-4 bg-[#0b2545] text-white border-b border-[#134074] flex items-center justify-between">
        <div className="flex items-center space-x-2.5 truncate">
          <div className="p-1.5 rounded-md bg-white/10 text-white flex-shrink-0">
            {isTurnout ? (
              <GitBranch className="w-4 h-4 text-sky-300" />
            ) : (
              <Building2 className="w-4 h-4 text-sky-300" />
            )}
          </div>
          <div className="truncate">
            <div className="text-xs font-semibold uppercase text-sky-300 tracking-wider">
              {isTurnout ? "Turnout / Point Asset" : element.platformNumber ? "Platform Specification" : "Track Infrastructure"}
            </div>
            <div className="font-bold text-sm text-white truncate">
              {isTurnout
                ? `${element.id} (${element.type})`
                : element.name || `Platform ${element.platformNumber || 1}`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-2 cursor-pointer"
          aria-label="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body Content */}
      <div className="p-4 overflow-y-auto space-y-4 max-h-[520px] text-xs">
        {/* ==================================================== */}
        {/* TRACK / PLATFORM INFRASTRUCTURE VIEW                 */}
        {/* ==================================================== */}
        {!isTurnout && (
          <div className="space-y-3.5">
            {/* Classification & Station */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Asset Identity & Location
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {element.name}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Station: <strong className="text-slate-900">{stationName} <span className="font-mono">({stationCode})</span></strong> · Track ID: <code className="font-mono font-bold text-sky-800">{element.id}</code>
              </div>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 uppercase font-semibold flex items-center space-x-1">
                  <Ruler className="w-3.5 h-3.5 text-slate-400" />
                  <span>Clear Length</span>
                </div>
                <div className="font-bold font-mono text-slate-900 text-sm mt-1">{element.lengthMeters} meters</div>
                <div className="text-xs text-slate-500 mt-0.5">Full rake capacity</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 uppercase font-semibold flex items-center space-x-1">
                  <Gauge className="w-3.5 h-3.5 text-slate-400" />
                  <span>Permitted Speed</span>
                </div>
                <div className="font-bold font-mono text-slate-900 text-sm mt-1">{Math.min(element.speedLimitKmph || 60, 60)} km/h</div>
                <div className="text-xs text-slate-500 mt-0.5">Sectional ceiling</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 uppercase font-semibold flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Traction</span>
                </div>
                <div className="font-bold text-slate-900 text-sm mt-1">{element.electrified !== false ? "25kV AC OHE" : "Non-Elec"}</div>
                <div className="text-xs text-slate-500 mt-0.5">50 Hz Single Phase</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 uppercase font-semibold flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-sky-500" />
                  <span>Line Type</span>
                </div>
                <div className="font-bold text-slate-900 text-sm mt-1">{element.trackType || "MAIN"}</div>
                <div className="text-xs text-slate-500 mt-0.5">{element.platformSide ? `${element.platformSide} Platform` : "Through Line"}</div>
              </div>
            </div>

            {/* Platform Specifics */}
            {element.platformNumber && (
              <div className="p-3 bg-sky-50/70 rounded-xl border border-sky-200">
                <div className="text-xs text-sky-900 uppercase font-bold tracking-wider">
                  Platform #{element.platformNumber} Attributes
                </div>
                <div className="text-xs text-sky-950 mt-1 space-y-1 font-sans leading-relaxed">
                  <div>Configuration: <strong>{element.platformSide || "Island"} Platform</strong></div>
                  <div>Surface: <strong>High-Level Concrete Slab with Tactile Edge</strong></div>
                  <div>Access: <strong>Foot Overbridge (FOB) & Ramp Connectivity</strong></div>
                </div>
              </div>
            )}

            {/* Engineering Notes */}
            {element.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs leading-relaxed">
                <strong className="text-slate-900">Engineering Note:</strong> {element.notes}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TURNOUT / POINT MACHINE INFRASTRUCTURE VIEW          */}
        {/* ==================================================== */}
        {isTurnout && (
          <div className="space-y-3.5">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                Point Machine & Crossover Asset
              </div>
              <div className="font-bold text-slate-900 text-sm">{element.name}</div>
              <div className="text-xs text-slate-600 mt-1 font-mono">
                Asset ID: <code>{element.id}</code> · Type: <strong>{element.type}</strong>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-mono space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">From Track:</span>
                <span className="font-bold text-slate-900">{element.fromTrackId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">To Track:</span>
                <span className="font-bold text-slate-900">{element.toTrackId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Turnout Angle:</span>
                <span className="font-bold text-slate-900">1 in 12 Fan-Shaped</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Switch Type:</span>
                <span className="font-bold text-slate-900">Thick Web Switch (TWS)</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
