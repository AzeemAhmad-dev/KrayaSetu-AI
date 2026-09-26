import React, { useState, useEffect, useCallback, useRef } from "react";
import { MareyCanvas } from "../components/marey/MareyCanvas";
import { MareyHeader } from "../components/marey/MareyHeader";
import { TrainDetailDrawer } from "../components/marey/TrainDetailDrawer";
import { fetchActiveTrains, LiveRailwayTrain } from "../services/railwayApi";
import { useMareyBlocks } from "../hooks/useCanonicalData";
import { BlockData } from "../types";
import { getISTDateString, getISTTimeString } from "../utils/istDate";

export const MareyDiagramPage: React.FC = () => {
  // Theme state: defaults to vintage archival dispatcher parchment
  const [theme, setTheme] = useState<"vintage" | "dark">("vintage");

  // Operational filter states
  const [activeDirection, setActiveDirection] = useState<string>("ALL");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showScheduledPaths, setShowScheduledPaths] = useState<boolean>(true);
  const [showBlocks, setShowBlocks] = useState<boolean>(true);

  // Zoom & Viewport
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Selected entities for inspection drawer
  const [selectedTrain, setSelectedTrain] = useState<LiveRailwayTrain | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockData | null>(null);

  // Data states: Train data (independent live telemetry) and Maintenance Blocks (strictly proposed/sanctioned)
  const [trains, setTrains] = useState<LiveRailwayTrain[]>([]);
  const { data: blocks = [], refetch: refetchBlocks } = useMareyBlocks();

  const [selectedDate, setSelectedDate] = useState<string>(() => getISTDateString());
  const isToday = selectedDate === getISTDateString();

  const [referenceTimeStr, setReferenceTimeStr] = useState<string>(() => getISTTimeString());
  const baseServerTimeRef = useRef<{ baseSeconds: number; receivedAt: number } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reference to root container for canvas export
  const pageContainerRef = useRef<HTMLDivElement | null>(null);

  // Live real-time clock advancement every second in canonical Indian Standard Time (IST)
  useEffect(() => {
    const clockInterval = setInterval(() => {
      if (baseServerTimeRef.current) {
        const elapsedSec = Math.floor((Date.now() - baseServerTimeRef.current.receivedAt) / 1000);
        const curSec = (baseServerTimeRef.current.baseSeconds + elapsedSec) % 86400;
        const h = String(Math.floor(curSec / 3600)).padStart(2, "0");
        const m = String(Math.floor((curSec % 3600) / 60)).padStart(2, "0");
        const s = String(curSec % 60).padStart(2, "0");
        setReferenceTimeStr(`${h}:${m}:${s}`);
      } else {
        setReferenceTimeStr(getISTTimeString());
      }
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Fetch telemetry (TRAIN DATA ONLY) — completely separated from block data
  const loadTrains = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const trainsRes = await fetchActiveTrains({
        mode: "LIVE",
        reference_date: selectedDate,
        reference_time: isToday ? getISTTimeString() : undefined,
      });

      if (trainsRes && trainsRes.trains) {
        setTrains(trainsRes.trains);
        if (trainsRes.reference_time) {
          const parts = trainsRes.reference_time.split(":").map(Number);
          const baseSec = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
          baseServerTimeRef.current = {
            baseSeconds: baseSec,
            receivedAt: Date.now(),
          };
          setReferenceTimeStr(trainsRes.reference_time);
        }
      }
    } catch (err: any) {
      console.error("Failed to load Marey train telemetry:", err);
      setErrorMessage(err.message || "Failed to fetch live corridor train data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, isToday]);

  // Initial load & Polling for trains every 15 seconds
  useEffect(() => {
    loadTrains();
    const interval = setInterval(loadTrains, 15000);
    return () => clearInterval(interval);
  }, [loadTrains]);

  // Auto-deselect block if it was removed / cleared during dataset regeneration
  useEffect(() => {
    if (selectedBlock && !blocks.some((b) => b.id === selectedBlock.id)) {
      setSelectedBlock(null);
    }
  }, [blocks, selectedBlock]);

  // Handlers
  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "vintage" ? "dark" : "vintage"));
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(3.0, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.5, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleResetView = () => {
    setZoomLevel(1.0);
    setSelectedTrain(null);
    setSelectedBlock(null);
    setActiveDirection("ALL");
    setActiveCategory("ALL");
    setSearchQuery("");
  };

  const handleSelectTrain = (train: LiveRailwayTrain | null) => {
    setSelectedTrain(train);
    if (train) {
      setSelectedBlock(null);
    }
  };

  const handleSelectBlock = (block: BlockData | null) => {
    setSelectedBlock(block);
    if (block) {
      setSelectedTrain(null);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedTrain(null);
    setSelectedBlock(null);
  };

  const handleExportImage = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `IR_Bhopal_Marey_Diagram_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export diagram failed:", err);
    }
  };

  return (
    <div
      ref={pageContainerRef}
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        theme === "vintage" ? "bg-[#fcfaf2]" : "bg-[#0b1120]"
      }`}
    >
      {/* 1. ARCHIVAL / MODERN HEADER & CONTROLS */}
      <MareyHeader
        theme={theme}
        onThemeToggle={handleThemeToggle}
        activeDirection={activeDirection}
        onDirectionChange={setActiveDirection}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showScheduledPaths={showScheduledPaths}
        onToggleScheduledPaths={() => setShowScheduledPaths((prev) => !prev)}
        showBlocks={showBlocks}
        onToggleBlocks={() => setShowBlocks((prev) => !prev)}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        referenceTimeStr={referenceTimeStr}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        isToday={isToday}
        totalTrainsCount={trains.length}
        totalBlocksCount={blocks.length}
        isLoading={isLoading}
        onRefresh={async () => {
          await Promise.all([loadTrains(), refetchBlocks()]);
        }}
        onExport={handleExportImage}
      />

      {/* Error Banner if any */}
      {errorMessage && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-6 py-2 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between font-mono">
          <span>⚠️ Telemetry sync warning: {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="hover:underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. MAREY INTERACTIVE TIME-DISTANCE GRAPH CANVAS */}
      <main className="flex-1 w-full h-[calc(100vh-130px)] min-h-[650px] relative overflow-hidden flex flex-col">
        <MareyCanvas
          trains={trains}
          blocks={blocks}
          selectedTrain={selectedTrain}
          onSelectTrain={handleSelectTrain}
          selectedBlock={selectedBlock}
          onSelectBlock={handleSelectBlock}
          theme={theme}
          showScheduledPaths={showScheduledPaths}
          showBlocks={showBlocks}
          activeDirection={activeDirection}
          activeCategory={activeCategory}
          searchQuery={searchQuery}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          referenceTimeStr={referenceTimeStr}
          selectedDate={selectedDate}
          isToday={isToday}
        />
      </main>

      {/* 3. SLIDE-OVER TELEMETRY & BLOCK DOSSIER DRAWER */}
      <TrainDetailDrawer
        selectedTrain={selectedTrain}
        selectedBlock={selectedBlock}
        onClose={handleCloseDrawer}
        theme={theme}
      />
    </div>
  );
};

export default MareyDiagramPage;
