import React from "react";
import { ProvenanceBadge } from "../common/ProvenanceBadge";
import { Train, ShieldAlert, ArrowRight, Clock, CheckCircle } from "lucide-react";

interface Props {
  station: any;
  platformsLayout: any[];
  loopLinesLayout: any[];
  presentTrains: any[];
  holdingTrains: any[];
  incomingTrains: any[];
}

export const StationYardSchematic: React.FC<Props> = ({
  station,
  platformsLayout,
  loopLinesLayout,
  presentTrains,
  holdingTrains,
  incomingTrains,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Station Yard Header */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-800 text-sm tracking-wide">
            {station.name} ({station.code}) · VERIFIED YARD & PLATFORM OCCUPANCY
          </span>
          <ProvenanceBadge type="REAL_PUBLIC" />
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-semibold">
            {station.platforms} Platforms
          </span>
          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
            {station.loop_lines} Loops
          </span>
          <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-semibold">
            {station.sidings} Sidings
          </span>
        </div>
      </div>

      {/* Schematic Yard Tracks */}
      <div className="p-4 bg-[#f8fafc] border-b border-slate-200">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono flex items-center justify-between">
          <span>Live Track & Platform Schematic</span>
          <ProvenanceBadge type="SIMULATED" size="sm" />
        </div>

        <div className="space-y-3">
          {/* Platforms 1 to N */}
          {platformsLayout.map((p) => {
            const isOcc = p.status === "OCCUPIED";
            return (
              <div
                key={p.platform_number}
                className="flex items-center space-x-3 bg-white p-2.5 rounded border border-slate-200 shadow-2xs"
              >
                {/* Platform Label */}
                <div className="w-24 flex-shrink-0 flex items-center space-x-1.5">
                  <div className="w-6 h-6 rounded bg-[#0b2545] text-white flex items-center justify-center font-bold text-xs font-mono">
                    PF{p.platform_number}
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Platform {p.platform_number}</span>
                </div>

                {/* Track Line Representation */}
                <div className="flex-1 relative flex items-center">
                  <div className="w-full h-1 bg-slate-300 rounded relative">
                    <div className="absolute inset-0 border-t border-b border-slate-400 border-dashed" />
                  </div>

                  {/* Occupying Train or Clearance */}
                  {isOcc ? (
                    <div className="absolute left-1/3 transform -translate-x-1/2 bg-sky-700 text-white px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 shadow-xs">
                      <Train className="w-3.5 h-3.5 text-sky-200" />
                      <span>{p.occupied_by}</span>
                      <span className="text-[10px] bg-sky-900/80 px-1.5 py-0.2 rounded ml-1 font-mono">
                        OCCUPIED
                      </span>
                    </div>
                  ) : (
                    <div className="absolute left-1/2 transform -translate-x-1/2 bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-mono flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>CLEAR / AVAILABLE</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loop Holding Lines */}
          {loopLinesLayout.map((l) => {
            const isHolding = l.status === "HOLDING_FREIGHT";
            return (
              <div
                key={l.loop_number}
                className="flex items-center space-x-3 bg-amber-50/50 p-2.5 rounded border border-amber-200 shadow-2xs"
              >
                <div className="w-24 flex-shrink-0 flex items-center space-x-1.5">
                  <div className="w-6 h-6 rounded bg-amber-700 text-white flex items-center justify-center font-bold text-xs font-mono">
                    L{l.loop_number}
                  </div>
                  <span className="text-[11px] font-bold text-amber-900">Loop Line {l.loop_number}</span>
                </div>

                <div className="flex-1 relative flex items-center">
                  <div className="w-full h-1 bg-amber-300 rounded relative" />
                  {isHolding ? (
                    <div className="absolute left-1/3 transform -translate-x-1/2 bg-amber-600 text-white px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 shadow-xs">
                      <Train className="w-3.5 h-3.5 text-amber-200" />
                      <span>{l.occupied_by}</span>
                      <span className="text-[10px] bg-amber-900/80 px-1.5 py-0.2 rounded ml-1 font-mono">
                        HELD FOR PATH
                      </span>
                    </div>
                  ) : (
                    <div className="absolute left-1/2 transform -translate-x-1/2 bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 rounded text-[11px] font-mono">
                      LOOP VACANT
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incoming & Held Movements Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 text-xs">
        {/* Incoming Traffic */}
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
            <span className="flex items-center">
              <ArrowRight className="w-3.5 h-3.5 text-sky-600 mr-1" />
              Approaching Section Trains ({incomingTrains.length})
            </span>
            <ProvenanceBadge type="SIMULATED" size="sm" />
          </div>
          {incomingTrains.length > 0 ? (
            <div className="space-y-1.5">
              {incomingTrains.map((tr) => (
                <div
                  key={tr.train_number}
                  className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold font-mono text-slate-800">
                      {tr.train_number} · {tr.train_name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Loc: {tr.current_location} ({tr.direction} Line)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">
                      ETA {tr.estimated_time}
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${
                        tr.delay_minutes > 15 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      +{tr.delay_minutes}m delay
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-slate-400">No incoming trains detected within 35 km</span>
          )}
        </div>

        {/* Operational Holds & Precedence */}
        <div className="bg-amber-50/50 p-3 rounded border border-amber-200">
          <div className="font-bold text-amber-900 mb-2 flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 text-amber-600 mr-1" />
              Active Stabling / Freight Holds ({holdingTrains.length})
            </span>
            <ProvenanceBadge type="SYNTHETIC" size="sm" />
          </div>
          {holdingTrains.length > 0 ? (
            <div className="space-y-1.5">
              {holdingTrains.map((ht) => (
                <div
                  key={ht.train_number}
                  className="bg-white p-2 rounded border border-amber-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-amber-900">
                      {ht.train_number} ({ht.train_name})
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-mono font-bold">
                      {ht.current_track}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    <span className="font-semibold text-slate-700">Reason:</span> {ht.hold_reason || "Regulating for high-priority express pass"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-slate-400">No active holding events at this yard</span>
          )}
        </div>
      </div>
    </div>
  );
};
