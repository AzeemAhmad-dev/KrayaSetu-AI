import React from "react";
import { Link } from "react-router-dom";
import { getAllCorridors } from "../data/corridorsData";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { CorridorWorkspaceNav } from "../components/corridor/CorridorWorkspaceNav";
import { ArrowRight, Compass, Layers, ShieldCheck } from "lucide-react";

export const CorridorsPage: React.FC = () => {
  const corridors = getAllCorridors();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans">
      {/* 1. TOP HEADER */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base font-black tracking-widest text-sky-800 uppercase font-mono">
                CORRIDOR CONTROL
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                Bhopal Division · West Central Railway
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
              Divisional Railway Corridors
            </h1>
            <p className="text-xs text-slate-600 font-sans mt-0.5">
              Five active verified railway corridors covering 76 researched stations, junctions, loops, and halts across the central trunk network.
            </p>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-mono text-slate-700">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              Network: <strong className="text-slate-900 font-bold">765 Total Route KM</strong>
            </div>
            <div>
              Traction: <strong className="text-slate-900 font-bold">100% 25 kV AC OHE Electrified</strong>
            </div>
            <div>
              Locations: <strong className="text-slate-900 font-bold">76 Stations & Halts</strong>
            </div>
            <div>
              Gauge: <strong className="text-slate-900 font-bold">Broad Gauge (1676mm)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Corridor Workspace Navigation */}
      <CorridorWorkspaceNav activeTab="NETWORKS" currentCorridorId="CORR-01" />

      {/* 2. THE FIVE ACTIVE CORRIDOR WORKSPACE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {corridors.map((c, idx) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-sky-500 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
          >
            <div>
              {/* Corridor ID & Track Type Badge */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#0b2545] text-white">
                    {c.id}
                  </span>
                  <span className="text-xs text-slate-500 font-mono font-bold">{c.code}</span>
                </div>
                <span className="text-xs font-mono font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                  {c.track_configuration.replace(/_/g, " ")}
                </span>
              </div>

              {/* Corridor Title */}
              <h2 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                <Link to={`/corridors/${c.id}`}>
                  {idx + 1}. {c.name}
                </Link>
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
                {c.description}
              </p>

              {/* Station Progression Chips */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center justify-between">
                  <span>Major Interchanges:</span>
                  <span className="text-slate-600 font-bold">{c.locations.length} Locations</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                  {c.locations
                    .filter((l) => l.is_major)
                    .map((stn, sIdx, arr) => (
                      <React.Fragment key={`chip-${c.id}-${stn.code}`}>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                          {stn.name}
                        </span>
                        {sIdx < arr.length - 1 && (
                          <span className="text-slate-400 font-bold">→</span>
                        )}
                      </React.Fragment>
                    ))}
                </div>
              </div>
            </div>

            {/* Bottom Specs & Action Link */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <div className="text-slate-600 text-xs">
                <strong className="text-slate-900 font-bold">{c.total_distance_km} KM</strong> · Speed: <strong className="text-slate-900 font-bold">{c.max_permissible_speed_kmph} km/h</strong>
              </div>

              <Link
                to={`/corridors/${c.id}`}
                className="inline-flex items-center text-xs sm:text-sm font-bold text-sky-600 hover:text-sky-800 space-x-1 group-hover:translate-x-0.5 transition-transform"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
