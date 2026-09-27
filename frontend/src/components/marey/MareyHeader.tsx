import React from "react";
import { TRAIN_CATEGORIES } from "../../data/bhopalRegionConfig";
import { getISTDateString, addDaysToDateString } from "../../utils/istDate";
import { Button } from "../ui/Button";
import { Tabs, TabsList, TabsTrigger } from "../ui/Tabs";

interface MareyHeaderProps {
  theme?: "vintage" | "dark" | "light";
  onThemeToggle?: () => void;
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
  theme = "vintage",
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
  const isVintage = theme !== "dark";

  return (
    <header
      className={`border-b select-none transition-colors duration-200 ${
        isVintage
          ? "bg-[#faf6ee] text-[#1c1917] border-[#d6cfbe]"
          : "bg-[var(--surface-card)] text-[var(--text-primary)] border-[var(--border-subtle)]"
      }`}
    >
      {/* 1. ARCHIVAL RAILWAY TITLE BAR */}
      <div
        className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 ${
          isVintage
            ? "border-[#e5ded0] bg-[#f4eee1]"
            : "border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)]"
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-serif text-sm font-bold shadow-sm ${
              isVintage ? "bg-[#3f2a1d] text-[#faf6ee]" : "bg-[var(--brand-navy)] text-white"
            }`}
          >
            IR
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className={`font-serif tracking-widest text-lg md:text-xl font-bold uppercase ${
                isVintage ? "text-[#1c1917]" : "text-[var(--text-primary)]"
              }`}>
                Bhopal — Itarsi — Bina • Train-Control Marey Diagram
              </h1>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-wider ${
                  isVintage
                    ? "bg-[#e2d7c3] text-[#4a3b32]"
                    : "bg-[var(--brand-navy-border)] text-white border border-[var(--brand-navy-border)]"
                }`}
              >
                WTT 24-HR
              </span>
            </div>
            <p
              className={`text-xs font-serif italic tracking-wide ${
                isVintage ? "text-[#57493a]" : "text-[var(--text-muted)]"
              }`}
            >
              INDIAN RAILWAYS • CENTRAL BLOCK & TRAIN TIMETABLE DIVISION (BINA JN 0.00 KM — ITARSI JN 231.00 KM)
            </p>
          </div>
        </div>

        {/* Multi-Day Operational Date Navigator & Live Clock */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Multi-Day Date Navigator */}
          <div
            className={`flex items-center space-x-1.5 p-1 rounded-lg border text-xs font-mono ${
              isVintage
                ? "bg-[#f0e8d8] border-[#c9beaa]"
                : "bg-[var(--surface-card)] border-[var(--border-subtle)]"
            }`}
          >
            <span className="text-[10px] font-bold uppercase px-1.5 opacity-70">DATE:</span>
            {(() => {
              const todayStr = getISTDateString();
              const tomorrowStr = addDaysToDateString(todayStr, 1);
              const plusTwoStr = addDaysToDateString(todayStr, 2);

              return (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedDate === todayStr ? "primary" : "secondary"}
                    onClick={() => onDateChange(todayStr)}
                    className="h-6 px-2 py-0 text-xs font-mono font-bold"
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedDate === tomorrowStr ? "primary" : "secondary"}
                    onClick={() => onDateChange(tomorrowStr)}
                    className="h-6 px-2 py-0 text-xs font-mono font-bold"
                  >
                    +1 Day
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedDate === plusTwoStr ? "primary" : "secondary"}
                    onClick={() => onDateChange(plusTwoStr)}
                    className="h-6 px-2 py-0 text-xs font-mono font-bold"
                  >
                    +2 Days
                  </Button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => onDateChange(e.target.value)}
                    className={`h-6 px-1.5 py-0 rounded text-xs border font-mono font-bold ${
                      isVintage
                        ? "bg-[#faf6ee] text-[#1c1917] border-[#baa891]"
                        : "bg-[var(--surface-card)] text-[var(--text-primary)] border-[var(--border-subtle)]"
                    }`}
                  />
                </>
              );
            })()}
          </div>

          {/* Telemetry & Reference Time Clock */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded border text-xs font-mono ${
              isVintage
                ? "bg-[#f0e8d8] border-[#c9beaa] text-[#2e261f]"
                : "bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            {isToday ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-bold">NTES:</span>
                <span className="text-[var(--status-success)] font-bold">LIVE SYNC</span>
                <span className="opacity-40">|</span>
                <span className="font-semibold text-[var(--status-danger)]">NOW: {referenceTimeStr} IST</span>
              </>
            ) : (
              <>
                <span className="font-bold uppercase tracking-wider text-[var(--status-warning)]">
                  {selectedDate > getISTDateString() ? "FUTURE TIMETABLE" : "HISTORICAL ARCHIVE"}
                </span>
                <span className="opacity-40">|</span>
                <span className="font-semibold">{selectedDate}</span>
              </>
            )}
          </div>

          {/* Refresh Data */}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onRefresh}
            disabled={isLoading}
            isLoading={isLoading}
            className="h-8 text-xs font-medium"
            title="Refresh train positions and active maintenance blocks"
          >
            Sync
          </Button>

          {/* Export PNG */}
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={onExport}
            className="h-8 text-xs font-medium"
            title="Export high-resolution Marey Diagram image"
          >
            📷 Export
          </Button>
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
                  : "bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--brand-navy)]"
              }`}
            />
            <span className="absolute left-2.5 top-1.5 opacity-60">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1.5 opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>

          {/* Direction Filter via Tabs Primitive */}
          <Tabs
            value={activeDirection}
            onValueChange={onDirectionChange}
            variant="pills"
            className="space-y-0"
          >
            <TabsList className="h-8 p-0.5 bg-[var(--surface-card)]">
              <TabsTrigger value="ALL" className="h-7 px-2.5 py-0 text-xs font-mono">
                All Tracks
              </TabsTrigger>
              <TabsTrigger value="UP" className="h-7 px-2.5 py-0 text-xs font-mono">
                UP (Towards ET)
              </TabsTrigger>
              <TabsTrigger value="DOWN" className="h-7 px-2.5 py-0 text-xs font-mono">
                DN (Towards BINA)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Train Category Filter */}
          <select
            value={activeCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={`px-2.5 py-1.5 rounded font-medium border outline-none cursor-pointer ${
              isVintage
                ? "bg-[#f5efe2] border-[#cfc4b0] text-[#2b2219]"
                : "bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-primary)]"
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
              className="rounded accent-[var(--brand-navy)] w-3.5 h-3.5"
            />
            <span>Blocks Overlay ({totalBlocksCount})</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              checked={showScheduledPaths}
              onChange={onToggleScheduledPaths}
              className="rounded accent-[var(--brand-navy)] w-3.5 h-3.5"
            />
            <span>Predicted / Sched Paths</span>
          </label>
        </div>

        {/* Zoom & View Reset */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center border rounded-md overflow-hidden border-[var(--border-subtle)] bg-[var(--surface-card)]">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onZoomOut}
              disabled={zoomLevel <= 0.6}
              className="h-7 w-7 p-0 rounded-none border-0 font-mono font-bold"
              title="Zoom Out"
            >
              −
            </Button>
            <span className="px-2 py-0.5 font-mono text-[11px] min-w-[3rem] text-center border-x border-[var(--border-subtle)] text-[var(--text-secondary)]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onZoomIn}
              disabled={zoomLevel >= 3.0}
              className="h-7 w-7 p-0 rounded-none border-0 font-mono font-bold"
              title="Zoom In"
            >
              +
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onResetView}
            className="h-7 px-2.5 text-xs font-medium"
            title="Reset Pan and Zoom to Full Corridor View"
          >
            Reset View
          </Button>
        </div>
      </div>

      {/* 3. VISUAL LEGEND BAR (Token-mapped swatches) */}
      <div
        className={`px-6 py-2 border-t flex flex-wrap items-center justify-between text-[11px] gap-3 ${
          isVintage
            ? "bg-[#f5eee1] border-[#e8dfcf] text-[#4d4033]"
            : "bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono">
          <span className="font-bold uppercase tracking-wider text-[10px]">Train Lines:</span>
          <div className="flex items-center space-x-1.5">
            <span
              className="w-5 h-0.5 inline-block font-bold"
              style={{ backgroundColor: "var(--train-prestige)" }}
            ></span>
            <span>Vande Bharat / Shatabdi (130)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className="w-5 h-0.5 inline-block"
              style={{ backgroundColor: "var(--train-superfast)" }}
            ></span>
            <span>Superfast / Express (110)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className="w-5 h-0.5 inline-block"
              style={{ backgroundColor: "var(--train-mail)" }}
            ></span>
            <span>Mail / Express (100)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className="w-5 h-0.5 inline-block"
              style={{ backgroundColor: "var(--train-passenger)" }}
            ></span>
            <span>Passenger / MEMU (75)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className="w-5 h-0.5 inline-block"
              style={{ backgroundColor: "var(--train-freight)" }}
            ></span>
            <span>Freight (BOXN/BCN 65)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className="w-5 h-0 border-b border-dashed inline-block"
              style={{ borderColor: "var(--train-prestige)" }}
            ></span>
            <span className="italic">Dashed = Scheduled/Future</span>
          </div>
        </div>

        {/* 4 Block Types Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
          <span className="font-bold uppercase tracking-wider text-[10px]">Blocks:</span>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded inline-block border"
              style={{
                backgroundColor: "var(--lock-ruling-fill)",
                borderColor: "var(--lock-ruling)",
              }}
            ></span>
            <span className="font-bold" style={{ color: "var(--lock-ruling)" }}>
              🏛️ Ruling
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded inline-block border"
              style={{
                backgroundColor: "var(--lock-planned-fill)",
                borderColor: "var(--lock-planned)",
              }}
            ></span>
            <span className="font-bold" style={{ color: "var(--lock-planned)" }}>
              📋 Planned
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded inline-block border"
              style={{
                backgroundColor: "var(--lock-emergent-fill)",
                borderColor: "var(--lock-emergent)",
              }}
            ></span>
            <span className="font-bold" style={{ color: "var(--lock-emergent)" }}>
              🚨 Emergent
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded inline-block border"
              style={{
                backgroundColor: "var(--lock-shadow-fill)",
                borderColor: "var(--lock-shadow)",
              }}
            ></span>
            <span className="font-bold" style={{ color: "var(--lock-shadow)" }}>
              👥 Shadow (Multi-dept)
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
