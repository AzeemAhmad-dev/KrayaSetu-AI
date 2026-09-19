import React, { useState, useMemo, useEffect, useRef } from "react";
import { DetailedCorridor, CorridorLocation } from "../../data/corridorsData";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Building2,
  GitBranch,
  ShieldCheck,
  Search,
  MapPin,
  Compass,
  ArrowLeft,
  ArrowRight,
  Move
} from "lucide-react";

interface DetailedCorridorMapCanvasProps {
  corridor: DetailedCorridor;
  selectedLocation: CorridorLocation | null;
  onSelectLocation: (loc: CorridorLocation) => void;
}

interface Sleeper {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const DetailedCorridorMapCanvas: React.FC<DetailedCorridorMapCanvasProps> = ({
  corridor,
  selectedLocation,
  onSelectLocation,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const isMovedRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);
  const scrollTopRef = useRef<number>(0);
  const initialPinchDistRef = useRef<number>(0);
  const initialPinchZoomRef = useRef<number>(1);

  const locations = corridor.locations;
  const numLocations = locations.length;

  // Geometry dimensions
  const STATION_SPACING = 170;
  const LABEL_COL_X = 20;
  const LABEL_COL_WIDTH = 150;
  const TRACK_START_X = 190;
  const START_X = 230;
  const SVG_WIDTH = Math.max(1600, START_X + numLocations * STATION_SPACING + 180);
  const SVG_HEIGHT = 490;

  const GAUGE = 10;
  const HALF_GAUGE = GAUGE / 2;
  const SLEEPER_LEN = 18;
  const HALF_SLEEPER = SLEEPER_LEN / 2;
  const SLEEPER_STEP = 9;

  // Track vertical coordinates with generous clearances
  const isTripleLine = corridor.track_configuration === "TRIPLE_LINE";
  const isSingleLine = corridor.track_configuration.startsWith("SINGLE_LINE");

  const UP_MAIN_Y = isSingleLine ? 270 : 245;
  const DOWN_MAIN_Y = isSingleLine ? 270 : 320;
  const THIRD_LINE_Y = 395;

  // Calculate horizontal X position for each location
  const locationCoords = useMemo(() => {
    const coords: Record<string, { x: number; loc: CorridorLocation }> = {};
    locations.forEach((loc, idx) => {
      coords[loc.code] = {
        x: START_X + idx * STATION_SPACING,
        loc,
      };
    });
    return coords;
  }, [locations, START_X, STATION_SPACING]);

  // Center on selected location smoothly via container scrolling (never displacement/blackout)
  useEffect(() => {
    if (selectedLocation && locationCoords[selectedLocation.code] && containerRef.current) {
      const targetX = locationCoords[selectedLocation.code].x;
      const containerWidth = containerRef.current.clientWidth || 1000;
      const targetScrollLeft = Math.max(0, targetX * zoomLevel - containerWidth / 2);
      containerRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: "smooth",
      });
    }
  }, [selectedLocation, locationCoords, zoomLevel]);

  const handleZoom = (delta: number, clientX?: number, clientY?: number) => {
    setZoomLevel((prev) => {
      const next = Math.max(0.5, Math.min(2.5, +(prev + delta).toFixed(2)));
      if (containerRef.current) {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const pointerX = clientX !== undefined ? clientX - rect.left : container.clientWidth / 2;
        const pointerY = clientY !== undefined ? clientY - rect.top : container.clientHeight / 2;
        const contentX = (container.scrollLeft + pointerX) / prev;
        const contentY = (container.scrollTop + pointerY) / prev;
        const nextScrollX = Math.max(0, contentX * next - pointerX);
        const nextScrollY = Math.max(0, contentY * next - pointerY);
        requestAnimationFrame(() => {
          container.scrollLeft = nextScrollX;
          container.scrollTop = nextScrollY;
        });
      }
      return next;
    });
  };

  const handlePan = (direction: "left" | "right" | "up" | "down", amount = 300) => {
    if (!containerRef.current) return;
    if (direction === "left") containerRef.current.scrollBy({ left: -amount, behavior: "smooth" });
    if (direction === "right") containerRef.current.scrollBy({ left: amount, behavior: "smooth" });
    if (direction === "up") containerRef.current.scrollBy({ top: -amount, behavior: "smooth" });
    if (direction === "down") containerRef.current.scrollBy({ top: amount, behavior: "smooth" });
  };

  const handleReset = () => {
    setZoomLevel(1);
    if (selectedLocation && locationCoords[selectedLocation.code] && containerRef.current) {
      const targetX = locationCoords[selectedLocation.code].x;
      const containerWidth = containerRef.current.clientWidth || 1000;
      containerRef.current.scrollTo({
        left: Math.max(0, targetX - containerWidth / 2),
        top: 0,
        behavior: "smooth",
      });
    } else {
      containerRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    }
  };

  // Wheel zoom centered on cursor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.12 : -0.12;
      handleZoom(delta, e.clientX, e.clientY);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Mouse pan handlers (2D)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    isMovedRef.current = false;
    startXRef.current = e.pageX;
    startYRef.current = e.pageY;
    scrollLeftRef.current = containerRef.current?.scrollLeft || 0;
    scrollTopRef.current = containerRef.current?.scrollTop || 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const dx = e.pageX - startXRef.current;
    const dy = e.pageY - startYRef.current;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      isMovedRef.current = true;
    }
    containerRef.current.scrollLeft = scrollLeftRef.current - dx;
    containerRef.current.scrollTop = scrollTopRef.current - dy;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  // Touch pan & pinch-zoom handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      isMovedRef.current = false;
      startXRef.current = e.touches[0].pageX;
      startYRef.current = e.touches[0].pageY;
      scrollLeftRef.current = containerRef.current?.scrollLeft || 0;
      scrollTopRef.current = containerRef.current?.scrollTop || 0;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = zoomLevel;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current && containerRef.current) {
      const dx = e.touches[0].pageX - startXRef.current;
      const dy = e.touches[0].pageY - startYRef.current;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        isMovedRef.current = true;
      }
      containerRef.current.scrollLeft = scrollLeftRef.current - dx;
      containerRef.current.scrollTop = scrollTopRef.current - dy;
    } else if (e.touches.length === 2 && initialPinchDistRef.current > 0) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const scale = dist / initialPinchDistRef.current;
      const nextZoom = Math.max(0.5, Math.min(2.5, +(initialPinchZoomRef.current * scale).toFixed(2)));
      setZoomLevel(nextZoom);
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    initialPinchDistRef.current = 0;
  };

  // Generate straight sleepers for a given line segment
  const generateSleepers = (startX: number, endX: number, y: number) => {
    const count = Math.floor((endX - startX) / SLEEPER_STEP);
    const sleepers: Sleeper[] = [];
    for (let i = 0; i <= count; i++) {
      const sx = startX + i * SLEEPER_STEP;
      sleepers.push({
        x1: sx,
        y1: y - HALF_SLEEPER,
        x2: sx,
        y2: y + HALF_SLEEPER,
      });
    }
    return sleepers;
  };

  const END_X = START_X + (numLocations - 1) * STATION_SPACING + 100;

  // Memoized mainline sleepers
  const upMainSleepers = useMemo(() => generateSleepers(TRACK_START_X, END_X, UP_MAIN_Y), [TRACK_START_X, END_X, UP_MAIN_Y]);
  const downMainSleepers = useMemo(() => {
    if (isSingleLine) return [];
    return generateSleepers(TRACK_START_X, END_X, DOWN_MAIN_Y);
  }, [TRACK_START_X, END_X, DOWN_MAIN_Y, isSingleLine]);
  const thirdLineSleepers = useMemo(() => {
    if (!isTripleLine) return [];
    return generateSleepers(TRACK_START_X, END_X, THIRD_LINE_Y);
  }, [TRACK_START_X, END_X, THIRD_LINE_Y, isTripleLine]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col font-sans select-none relative">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP SCHEMATIC CONTROL BAR (LIGHT ENGINEERING STYLE)         */}
      {/* ------------------------------------------------------------- */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-slate-900">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-sky-800 text-white shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm sm:text-base tracking-wide text-slate-900 uppercase font-mono">
                {corridor.name} · DETAILED CORRIDOR SCHEMATIC
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 border border-sky-300 text-sky-800">
                {locations.length} VERIFIED LOCATIONS
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              {corridor.track_configuration.replace(/_/g, " ")} · {corridor.total_distance_km} KM · {corridor.voltage}
            </div>
          </div>
        </div>

        {/* Action instruction pill & Interactive Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mouse / Touch Guide Badge */}
          <div className="hidden lg:flex items-center px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-600 space-x-2 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="font-bold text-slate-700">DRAG TO PAN · SCROLL TO ZOOM</span>
          </div>

          {/* Directional Pan / Move Controls */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => handlePan("left")}
              className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 rounded text-xs font-mono font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              title="Pan Left (←)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PAN LEFT</span>
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <button
              type="button"
              onClick={() => handlePan("right")}
              className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 rounded text-xs font-mono font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              title="Pan Right (→)"
            >
              <span className="hidden sm:inline">PAN RIGHT</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls & Recenter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => handleZoom(0.15)}
              className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors cursor-pointer"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono text-slate-900 min-w-[50px] text-center font-bold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(-0.15)}
              className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors cursor-pointer"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors text-xs font-mono font-bold flex items-center space-x-1 cursor-pointer"
              title="Reset / Recenter View"
              aria-label="Reset / Recenter View"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-700" />
              <span>RECENTER</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SVG SCHEMATIC CANVAS (CLEAN 3-ZONE COLLISION-FREE DESIGN)    */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full overflow-auto bg-[#ffffff] relative h-[600px] sm:h-[660px] lg:h-[720px] min-h-[580px] cursor-grab active:cursor-grabbing select-none"
      >
        {/* Engineering Blueprint Faint Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-45"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e2e8f0 1px, transparent 1px),
              linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="min-w-full min-h-full flex items-center p-4">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="transition-all duration-150 origin-left"
            style={{
              width: `${SVG_WIDTH * zoomLevel}px`,
              minWidth: `${SVG_WIDTH * zoomLevel}px`,
              height: `${SVG_HEIGHT * zoomLevel}px`,
              minHeight: `${SVG_HEIGHT * zoomLevel}px`,
              maxWidth: "none",
            }}
          >
          {/* ==================================================== */}
          {/* ZONE A: LEFT MARGIN COLUMN FOR TRACK LABELS           */}
          {/* Strict Separation: Labels NEVER touch steel rails     */}
          {/* ==================================================== */}
          <g className="track-margin-column">
            {/* UP MAIN LABEL BADGE */}
            <rect
              x={LABEL_COL_X}
              y={UP_MAIN_Y - 13}
              width={LABEL_COL_WIDTH}
              height={26}
              rx={4}
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            <text
              x={LABEL_COL_X + 10}
              y={UP_MAIN_Y + 4}
              fill="#0f172a"
              fontSize="11.5"
              fontFamily="'Inter', sans-serif"
              fontWeight="600"
              letterSpacing="-0.01em"
            >
              {isSingleLine ? "SINGLE MAIN LINE" : "UP MAIN LINE"}
            </text>
            {/* Connector Leader Line to Track Start */}
            <line
              x1={LABEL_COL_X + LABEL_COL_WIDTH}
              y1={UP_MAIN_Y}
              x2={TRACK_START_X}
              y2={UP_MAIN_Y}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 2"
            />

            {/* DOWN MAIN LABEL BADGE */}
            {!isSingleLine && (
              <>
                <rect
                  x={LABEL_COL_X}
                  y={DOWN_MAIN_Y - 13}
                  width={LABEL_COL_WIDTH}
                  height={26}
                  rx={4}
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth={1}
                />
                <text
                  x={LABEL_COL_X + 10}
                  y={DOWN_MAIN_Y + 4}
                  fill="#0f172a"
                  fontSize="11.5"
                  fontFamily="'Inter', sans-serif"
                  fontWeight="600"
                  letterSpacing="-0.01em"
                >
                  DOWN MAIN LINE
                </text>
                <line
                  x1={LABEL_COL_X + LABEL_COL_WIDTH}
                  y1={DOWN_MAIN_Y}
                  x2={TRACK_START_X}
                  y2={DOWN_MAIN_Y}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
              </>
            )}

            {/* THIRD LINE LABEL BADGE */}
            {isTripleLine && (
              <>
                <rect
                  x={LABEL_COL_X}
                  y={THIRD_LINE_Y - 13}
                  width={LABEL_COL_WIDTH}
                  height={26}
                  rx={4}
                  fill="#f0f9ff"
                  stroke="#0284c7"
                  strokeWidth={1}
                />
                <text
                  x={LABEL_COL_X + 8}
                  y={THIRD_LINE_Y + 4}
                  fill="#0369a1"
                  fontSize="11"
                  fontFamily="'Inter', sans-serif"
                  fontWeight="600"
                  letterSpacing="-0.01em"
                >
                  3RD LINE (OVERTAKE)
                </text>
                <line
                  x1={LABEL_COL_X + LABEL_COL_WIDTH}
                  y1={THIRD_LINE_Y}
                  x2={TRACK_START_X}
                  y2={THIRD_LINE_Y}
                  stroke="#0284c7"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
              </>
            )}
          </g>

          {/* ==================================================== */}
          {/* ZONE B: RUNNING MAINLINE TRACKS (DUAL RAILS + SLEEPERS) */}
          {/* Strictly runs from TRACK_START_X to END_X             */}
          {/* ==================================================== */}

          {/* 1. UP MAIN LINE */}
          <g className="corridor-up-main">
            {/* Ballast Bed */}
            <rect
              x={TRACK_START_X}
              y={UP_MAIN_Y - 11}
              width={END_X - TRACK_START_X}
              height={22}
              rx={3}
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth={0.8}
            />

            {/* Sleepers */}
            {upMainSleepers.map((s, idx) => (
              <line
                key={`up-s-${idx}`}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="#64748b"
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}

            {/* Rail 1 (Top) & Rail 2 (Bottom) */}
            <line
              x1={TRACK_START_X}
              y1={UP_MAIN_Y - HALF_GAUGE}
              x2={END_X}
              y2={UP_MAIN_Y - HALF_GAUGE}
              stroke="#1e293b"
              strokeWidth={2}
            />
            <line
              x1={TRACK_START_X}
              y1={UP_MAIN_Y + HALF_GAUGE}
              x2={END_X}
              y2={UP_MAIN_Y + HALF_GAUGE}
              stroke="#1e293b"
              strokeWidth={2}
            />
          </g>

          {/* 2. DOWN MAIN LINE (for double/triple lines) */}
          {!isSingleLine && (
            <g className="corridor-down-main">
              {/* Ballast Bed */}
              <rect
                x={TRACK_START_X}
                y={DOWN_MAIN_Y - 11}
                width={END_X - TRACK_START_X}
                height={22}
                rx={3}
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth={0.8}
              />

              {/* Sleepers */}
              {downMainSleepers.map((s, idx) => (
                <line
                  key={`dn-s-${idx}`}
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              ))}

              {/* Rails */}
              <line
                x1={TRACK_START_X}
                y1={DOWN_MAIN_Y - HALF_GAUGE}
                x2={END_X}
                y2={DOWN_MAIN_Y - HALF_GAUGE}
                stroke="#1e293b"
                strokeWidth={2}
              />
              <line
                x1={TRACK_START_X}
                y1={DOWN_MAIN_Y + HALF_GAUGE}
                x2={END_X}
                y2={DOWN_MAIN_Y + HALF_GAUGE}
                stroke="#1e293b"
                strokeWidth={2}
              />
            </g>
          )}

          {/* 3. THIRD LINE (for triple lines) */}
          {isTripleLine && (
            <g className="corridor-third-line">
              <rect
                x={TRACK_START_X}
                y={THIRD_LINE_Y - 11}
                width={END_X - TRACK_START_X}
                height={22}
                rx={3}
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth={0.8}
              />
              {thirdLineSleepers.map((s, idx) => (
                <line
                  key={`th-s-${idx}`}
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              ))}
              <line
                x1={TRACK_START_X}
                y1={THIRD_LINE_Y - HALF_GAUGE}
                x2={END_X}
                y2={THIRD_LINE_Y - HALF_GAUGE}
                stroke="#0284c7"
                strokeWidth={2}
                strokeDasharray="8 2"
              />
              <line
                x1={TRACK_START_X}
                y1={THIRD_LINE_Y + HALF_GAUGE}
                x2={END_X}
                y2={THIRD_LINE_Y + HALF_GAUGE}
                stroke="#0284c7"
                strokeWidth={2}
                strokeDasharray="8 2"
              />
            </g>
          )}

          {/* ==================================================== */}
          {/* ZONE C: STATION INFRASTRUCTURE NODES, LOOPS & DECKS  */}
          {/* Strictly separated across vertical elevation bands   */}
          {/* ==================================================== */}
          {locations.map((loc, idx) => {
            const sx = START_X + idx * STATION_SPACING;
            const isSelected = selectedLocation?.code === loc.code;
            const isMajor = loc.is_major;
            const isJunction = loc.category === "MAJOR_JUNCTION";
            const isHalt = loc.category === "HALT";

            const nodeRadius = isJunction ? 11 : isMajor ? 8 : isHalt ? 4.5 : 6;
            const platformLength = isJunction ? 86 : isMajor ? 74 : isHalt ? 40 : 58;

            const LOOP_LINE_Y = 140;
            const PLATFORM_DECK_Y = 180;

            return (
              <g
                key={`stn-node-${loc.code}`}
                className="station-infrastructure-group cursor-pointer group"
                onClick={() => {
                  if (!isMovedRef.current) {
                    onSelectLocation(loc);
                  }
                }}
              >
                {/* Transparent Hit Box covering entire station column for easy clicks */}
                <rect
                  x={sx - 65}
                  y={40}
                  width={130}
                  height={425}
                  fill="transparent"
                  className="cursor-pointer"
                />

                {/* 1. TOP ZONE: Station Name & Chainage (Y: 40 - 76) with crisp solid backdrop */}
                <g transform={`translate(${sx}, 54)`}>
                  <rect
                    x={-68}
                    y={-15}
                    width={136}
                    height={38}
                    rx={6}
                    fill={isSelected ? "#f0f9ff" : "#ffffff"}
                    stroke={isSelected ? "#0284c7" : isMajor ? "#94a3b8" : "#cbd5e1"}
                    strokeWidth={isSelected ? 1.5 : 1}
                    className="transition-colors"
                  />
                  <text
                    x={0}
                    y={0}
                    fill={isSelected ? "#0369a1" : isMajor ? "#0f172a" : "#1e293b"}
                    fontSize={isJunction ? "12.5" : isMajor ? "12" : "11"}
                    fontWeight={isMajor || isSelected ? "700" : "600"}
                    fontFamily="'Inter', sans-serif"
                    letterSpacing="-0.01em"
                    textAnchor="middle"
                  >
                    {loc.name.toUpperCase()}
                  </text>
                  <text
                    x={0}
                    y={14}
                    fill={isSelected ? "#0284c7" : "#64748b"}
                    fontSize="9.5"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    ({loc.code}) · KM {loc.km.toFixed(1)}
                  </text>
                </g>

                {/* Vertical guideline: Badge bottom to Loop / Platform top */}
                <line
                  x1={sx}
                  y1={76}
                  x2={sx}
                  y2={(isMajor || loc.loops > 0) ? LOOP_LINE_Y - 2 : PLATFORM_DECK_Y - 2}
                  stroke={isSelected ? "#0284c7" : "#e2e8f0"}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />

                {/* Vertical guideline: Platform deck bottom to track node */}
                <line
                  x1={sx}
                  y1={PLATFORM_DECK_Y + 18 + 2}
                  x2={sx}
                  y2={UP_MAIN_Y - nodeRadius - 2}
                  stroke={isSelected ? "#0284c7" : "#e2e8f0"}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />

                {/* 2. Station Loop Line Divergence (Y = 140) */}
                {(isMajor || loc.loops > 0) && (
                  <g className="station-loop-divergence">
                    {/* Loop Line Rails at Y = 140 */}
                    <line
                      x1={sx - 54}
                      y1={LOOP_LINE_Y}
                      x2={sx + 54}
                      y2={LOOP_LINE_Y}
                      stroke={isSelected ? "#0284c7" : "#64748b"}
                      strokeWidth={1.5}
                    />
                    {/* Turnout connector leads from UP Main (Y=245) to Loop Line (Y=140) */}
                    <path
                      d={`M ${sx - 88} ${UP_MAIN_Y} Q ${sx - 72} ${LOOP_LINE_Y} ${sx - 54} ${LOOP_LINE_Y}`}
                      stroke={isSelected ? "#0284c7" : "#94a3b8"}
                      strokeWidth={1.5}
                      fill="none"
                    />
                    <path
                      d={`M ${sx + 54} ${LOOP_LINE_Y} Q ${sx + 72} ${LOOP_LINE_Y} ${sx + 88} ${UP_MAIN_Y}`}
                      stroke={isSelected ? "#0284c7" : "#94a3b8"}
                      strokeWidth={1.5}
                      fill="none"
                    />
                  </g>
                )}

                {/* 3. Station Platform Concrete Deck (Y = 180 to 198) - 36px clearance from track */}
                <g transform={`translate(${sx - platformLength / 2}, ${PLATFORM_DECK_Y})`}>
                  {/* Concrete Platform Deck */}
                  <rect
                    x={0}
                    y={0}
                    width={platformLength}
                    height={18}
                    rx={3}
                    fill={isSelected ? "#e0f2fe" : "#ffffff"}
                    stroke={isSelected ? "#0284c7" : isMajor ? "#64748b" : "#94a3b8"}
                    strokeWidth={isSelected ? 2 : 1}
                    className="transition-colors group-hover:stroke-sky-500"
                  />
                  {/* Yellow Tactile Hazard Band along track edge */}
                  <line
                    x1={2}
                    y1={16}
                    x2={platformLength - 2}
                    y2={16}
                    stroke="#eab308"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                  {/* Small Platform Canopy Columns */}
                  {isMajor && (
                    <>
                      <rect x={platformLength * 0.25 - 2} y={3} width={4} height={4} fill="#94a3b8" rx={1} />
                      <rect x={platformLength * 0.5 - 2} y={3} width={4} height={4} fill="#94a3b8" rx={1} />
                      <rect x={platformLength * 0.75 - 2} y={3} width={4} height={4} fill="#94a3b8" rx={1} />
                    </>
                  )}
                  {/* Platform Indicator */}
                  <text
                    x={platformLength / 2}
                    y={12.5}
                    fill={isSelected ? "#0369a1" : "#0f172a"}
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="'Inter', sans-serif"
                    letterSpacing="0.02em"
                    textAnchor="middle"
                  >
                    PF {loc.platforms}
                  </text>
                </g>

                {/* 4. Physical Interlocking Node Circle at UP_MAIN_Y */}
                <circle
                  cx={sx}
                  cy={UP_MAIN_Y}
                  r={isSelected ? nodeRadius + 4 : nodeRadius}
                  fill={isSelected ? "#0284c7" : isJunction ? "#0f172a" : isMajor ? "#0369a1" : "#ffffff"}
                  stroke={isSelected ? "#38bdf8" : "#0f172a"}
                  strokeWidth={isSelected ? 2.5 : 2}
                />

                {/* Second node ring for Junctions */}
                {isJunction && (
                  <circle cx={sx} cy={UP_MAIN_Y} r={nodeRadius + 4} fill="none" stroke="#0284c7" strokeWidth={1.5} />
                )}

                {/* 5. BOTTOM ZONE: Infrastructure Spec Pill (Y: 440) */}
                <g transform={`translate(${sx - 56}, 440)`}>
                  <rect
                    x={0}
                    y={0}
                    width={112}
                    height={22}
                    rx={4}
                    fill={isSelected ? "#e0f2fe" : "#f8fafc"}
                    stroke={isSelected ? "#0284c7" : "#cbd5e1"}
                    strokeWidth={1}
                  />
                  <text
                    x={56}
                    y={14.5}
                    fill={isSelected ? "#0369a1" : "#334155"}
                    fontSize="9.5"
                    fontFamily="'Inter', sans-serif"
                    textAnchor="middle"
                    fontWeight="600"
                    letterSpacing="0.01em"
                  >
                    {loc.platforms}PF · {loc.tracks}L · {loc.loops}LP
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SCHEMATIC LEGEND FOOTER (LIGHT STYLE)                      */}
      {/* ------------------------------------------------------------- */}
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-700">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-1 bg-[#1e293b] rounded-full inline-block" />
            <span className="text-[11px] text-slate-700 font-bold">Dual Steel Rails & Sleepers</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-2 rounded-xs bg-white border border-[#94a3b8]" />
            <span className="text-[11px] text-slate-700 font-bold">Concrete Platform Bay</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a] border border-[#0284c7]" />
            <span className="text-[11px] text-slate-700 font-bold">Major Junction Hub</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
            <span className="text-[11px] text-[#0369a1] font-bold">Selected Station (Schematic Below)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Click any station to expand its physical engineering schematic below</span>
        </div>
      </div>
    </div>
  );
};
