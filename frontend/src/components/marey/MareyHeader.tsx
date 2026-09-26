import React from "react";
import { TRAIN_CATEGORIES } from "../../data/bhopalRegionConfig";
import { getISTDateString, addDaysToDateString } from "../../utils/istDate";

interface MareyHeaderProps {
  theme: "vintage" | "dark";
  onThemeToggle: () => void;
  activeDirection: string;
  onDirectionChange: (dir: string) => void;
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showScheduledPaths: boolean;
  onToggleScheduledPaths: () => void;
  showBlocks: boolean;
  onToggleBlocks: () => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  referenceTimeStr: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
  isToday: boolean;
  totalTrainsCount: number;
  totalBlocksCount: number;
  isLoading: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

export const MareyHeader: React.FC<MareyHeaderProps> = ({
  theme,
  onThemeToggle,
  activeDirection,
  onDirectionChange,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  showScheduledPaths,
  onToggleScheduledPaths,
  showBlocks,
  onToggleBlocks,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetView,
  referenceTimeStr,
  selectedDate,
  onDateChange,
  isToday,
  totalTrainsCount,
  totalBlocksCount,
  isLoading,
  onRefresh,
  onExport,
}) => {
  const isVintage = theme === "vintage";

  return (
    <header
      className={`border-b select-none transition-colors duration-200 ${
        isVintage
          ? "bg-[#faf6ee] text-[#1c1917] border-[#d6cfbe]"
          : "bg-[#0b1120] text-[#f1f5f9] border-[#1e293b]"
      }`}
    >
      {/* 1. ARCHIVAL RAILWAY TITLE BAR (Reference Image Top Style) */}
      <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 ${
        isVintage ? "border-[#e5ded0] bg-[#f4eee1]" : "border-[#1e293b] bg-[#070b14]"
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-serif text-sm font-bold shadow-sm ${
            isVintage ? "bg-[#3f2a1d] text-[#faf6ee]" : "bg-emerald-600 text-white"
          }`}>
            IR
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-serif tracking-widest text-lg md:text-xl font-bold uppercase">
                Bhopal — Itarsi — Bina • Train-Control Marey Diagram
              </h1>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-wider ${
                isVintage ? "bg-[#e2d7c3] text-[#4a3b32]" : "bg-blue-900/60 text-blue-300 border border-blue-700/40"
              }`}>
                WTT 24-HR
              </span>
            </div>
            <p className={`text-xs font-serif italic tracking-wide ${
              isVintage ? "text-[#57493a]" : "text-slate-400"
            }`}>
              INDIAN RAILWAYS • CENTRAL BLOCK & TRAIN TIMETABLE DIVISION (BINA JN 0.00 KM — ITARSI JN 231.00 KM)
            </p>
          </div>
        </div>

        {/* Multi-Day Operational Date Navigator & Live Clock */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Multi-Day Date Navigator */}
          <div className={`flex items-center space-x-1.5 p-1 rounded-lg border text-xs font-mono ${
            isVintage ? "bg-[#f0e8d8] border-[#c9beaa]" : "bg-slate-900 border-slate-700"
          }`}>
            <span className="text-[10px] font-bold uppercase px-1.5 opacity-70">DATE:</span>
            {(() => {
              const todayStr = getISTDateString();
              const tomorrowStr = addDaysToDateString(todayStr, 1);
              const plusTwoStr = addDaysToDateString(todayStr, 2);

              return (
                <>
                  <button
                    type="button"
                    onClick={() => onDateChange(todayStr)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      selectedDate === todayStr
                        ? isVintage
                          ? "bg-[#3f2a1d] text-[#faf6ee] shadow-xs"
                          : "bg-emerald-600 text-white shadow-xs"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => onDateChange(tomorrowStr)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      selectedDate === tomorrowStr
                        ? isVintage
                          ? "bg-[#3f2a1d] text-[#faf6ee] shadow-xs"
                          : "bg-emerald-600 text-white shadow-xs"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    +1 Day
                  </button>
                  <button
                    type="button"
                    onClick={() => onDateChange(plusTwoStr)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      selectedDate === plusTwoStr
                        ? isVintage
                          ? "bg-[#3f2a1d] text-[#faf6ee] shadow-xs"
                          : "bg-emerald-600 text-white shadow-xs"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    +2 Days
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => onDateChange(e.target.value)}
                    className={`px-1.5 py-0.5 rounded text-xs border font-mono font-bold ${
                      isVintage
                        ? "bg-[#faf6ee] text-[#1c1917] border-[#baa891]"
                        : "bg-slate-800 text-slate-100 border-slate-600"
                    }`}
                  />
                </>
              );
            })()}
          </div>

          {/* Telemetry & Reference Time Clock */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded border text-xs font-mono ${
            isVintage ? "bg-[#f0e8d8] border-[#c9beaa] text-[#2e261f]" : "bg-slate-900 border-slate-700 text-slate-200"
          }`}>
            {isToday ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-bold">NTES:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">LIVE SYNC</span>
                <span className="text-stone-400">|</span>
                <span className="font-semibold text-rose-700 dark:text-rose-400">NOW: {referenceTimeStr} IST</span>
              </>
            ) : (
              <>
                <span className="font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {selectedDate > getISTDateString() ? "FUTURE TIMETABLE" : "HISTORICAL ARCHIVE"}
                </span>
                <span className="text-stone-400">|</span>
                <span className="font-semibold">{selectedDate}</span>
              </>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={onThemeToggle}
            className={`px-3 py-1.5 rounded text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
              isVintage
                ? "bg-[#efe7d5] hover:bg-[#e4d9c3] text-[#3e342a] border-[#b8ab96]"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600"
            }`}
            title="Toggle between Vintage Archival Dispatcher and Dark Night Control-Room theme"
          >
            <span>{isVintage ? "🌙 Dark Room" : "📜 Vintage Parchment"}</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
              isLoading
                ? "opacity-50 cursor-not-allowed"
                : isVintage
                ? "bg-[#efe7d5] hover:bg-[#e4d9c3] text-[#3e342a] border-[#b8ab96]"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600"
            }`}
            title="Refresh train positions and active maintenance blocks"
          >
            <span className={isLoading ? "animate-spin inline-block" : ""}>🔄</span>
            <span>Sync</span>
          </button>

          {/* Export PNG */}
          <button
            onClick={onExport}
            className={`px-3 py-1.5 rounded text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
              isVintage
                ? "bg-[#4a3828] hover:bg-[#382a1e] text-[#f7f2e7] border-[#382a1e]"
                : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700"
            }`}
            title="Export high-resolution Marey Diagram image"
          >
            <span>📷 Export</span>
          </button>
        </div>
      </div>

      {/* 2. OPERATIONAL CONTROLS & FILTER BAR */}
      <div className="px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search & Category & Direction Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search train, number, loco..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-52 px-3 py-1.5 pl-8 rounded text-xs border outline-none font-sans transition-colors ${
                isVintage
                  ? "bg-[#f5efe2] border-[#cfc4b0] text-[#1c1917] placeholder-[#8a7a6a] focus:border-[#735843]"
                  : "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500"
              }`}
            />
            <span className="absolute left-2.5 top-1.5 text-stone-400">🔍</span>
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1.5 text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Direction Filter */}
          <div className="flex items-center space-x-1 border rounded p-0.5 border-[#cfc4b0] dark:border-slate-700">
            {["ALL", "UP", "DOWN"].map((dir) => (
              <button
                key={dir}
                onClick={() => onDirectionChange(dir)}
                className={`px-2.5 py-1 rounded font-mono font-medium transition-colors ${
                  activeDirection === dir
                    ? isVintage
                      ? "bg-[#4a3828] text-[#faf6ee] shadow-sm"
                      : "bg-blue-600 text-white shadow-sm"
                    : isVintage
                    ? "hover:bg-[#ebe2cf] text-[#57493a]"
                    : "hover:bg-slate-800 text-slate-400"
                }`}
              >
                {dir === "ALL" ? "All Tracks" : dir === "UP" ? "UP (Towards ET)" : "DN (Towards BINA)"}
              </button>
            ))}
          </div>

          {/* Train Category Filter */}
          <select
            value={activeCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={`px-2.5 py-1.5 rounded font-medium border outline-none cursor-pointer ${
              isVintage
                ? "bg-[#f5efe2] border-[#cfc4b0] text-[#2b2219]"
                : "bg-slate-900 border-slate-700 text-slate-200"
            }`}
          >
            <option value="ALL">All Categories ({totalTrainsCount})</option>
            {Object.entries(TRAIN_CATEGORIES).map(([catKey, catVal]) => (
              <option key={catKey} value={catKey}>
                {catVal.name}
              </option>
            ))}
          </select>

          {/* Toggles */}
          <label className="flex items-center space-x-1.5 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              checked={showBlocks}
              onChange={onToggleBlocks}
              className="rounded accent-amber-600 w-3.5 h-3.5"
            />
            <span>Blocks Overlay ({totalBlocksCount})</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              checked={showScheduledPaths}
              onChange={onToggleScheduledPaths}
              className="rounded accent-blue-600 w-3.5 h-3.5"
            />
            <span>Predicted / Sched Paths</span>
          </label>
        </div>

        {/* Zoom & View Reset */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center border rounded overflow-hidden border-[#cfc4b0] dark:border-slate-700">
            <button
              onClick={onZoomOut}
              className={`px-2.5 py-1 font-mono font-bold hover:bg-black/5 dark:hover:bg-white/10 ${
                zoomLevel <= 0.6 ? "opacity-40 cursor-not-allowed" : ""
              }`}
              title="Zoom Out"
            >
              −
            </button>
            <span className="px-2 py-1 font-mono text-[11px] min-w-[3rem] text-center border-x border-[#cfc4b0] dark:border-slate-700">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={onZoomIn}
              className={`px-2.5 py-1 font-mono font-bold hover:bg-black/5 dark:hover:bg-white/10 ${
                zoomLevel >= 3.0 ? "opacity-40 cursor-not-allowed" : ""
              }`}
              title="Zoom In"
            >
              +
            </button>
          </div>

          <button
            onClick={onResetView}
            className={`px-2.5 py-1 rounded border font-medium transition-colors ${
              isVintage
                ? "bg-[#f5efe2] hover:bg-[#ece3d1] border-[#cfc4b0] text-[#3d3126]"
                : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
            }`}
            title="Reset Pan and Zoom to Full Corridor View"
          >
            Reset View
          </button>
        </div>
      </div>

      {/* 3. VISUAL LEGEND BAR (Exact styling matching reference image) */}
      <div className={`px-6 py-2 border-t flex flex-wrap items-center justify-between text-[11px] gap-3 ${
        isVintage ? "bg-[#f5eee1] border-[#e8dfcf] text-[#4d4033]" : "bg-[#090d18] border-[#1e293b] text-slate-400"
      }`}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono">
          <span className="font-bold uppercase tracking-wider text-[10px]">Train Lines:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-5 h-0.5 bg-[#b91c1c] inline-block font-bold"></span>
            <span>Vande Bharat / Shatabdi (130)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-5 h-0.5 bg-[#1d4ed8] inline-block"></span>
            <span>Superfast / Express (110)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-5 h-0.5 bg-[#0f766e] inline-block"></span>
            <span>Mail / Express (100)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-5 h-0.5 bg-[#b45309] inline-block"></span>
            <span>Passenger / MEMU (75)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-5 h-0.5 bg-[#334155] inline-block"></span>
            <span>Freight (BOXN/BCN 65)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-5 h-0 border-b border-dashed border-[#b91c1c] inline-block"></span>
            <span className="italic">Dashed = Scheduled/Future</span>
          </div>
        </div>

        {/* 4 Block Types Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
          <span className="font-bold uppercase tracking-wider text-[10px]">Blocks:</span>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-indigo-700/80 inline-block border border-indigo-500"></span>
            <span className="font-bold text-indigo-700 dark:text-indigo-400">🏛️ Ruling</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600/80 inline-block border border-emerald-500"></span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">📋 Planned</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-600/80 inline-block border border-rose-500"></span>
            <span className="font-bold text-rose-700 dark:text-rose-400">🚨 Emergent</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500/80 inline-block border border-amber-500"></span>
            <span className="font-bold text-amber-700 dark:text-amber-400">👥 Shadow (Multi-dept)</span>
          </div>
        </div>
      </div>
    </header>
  );
};
