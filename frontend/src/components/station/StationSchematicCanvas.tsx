import React, { useState, useMemo, useRef, useEffect } from "react";
import { StationInfrastructureData } from "../../data/stationInfrastructure";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ShieldCheck,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

interface StationSchematicCanvasProps {
  infrastructure: StationInfrastructureData;
  selectedElement: any | null;
  onSelectElement: (element: any) => void;
}

// -----------------------------------------------------------------------------
// GEOMETRY & CURVE MATH HELPERS
// -----------------------------------------------------------------------------

interface Point {
  x: number;
  y: number;
}

interface Sleeper {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CurvedTrackGeometry {
  rail1Path: string;
  rail2Path: string;
  ballastPath: string;
  sleepers: Sleeper[];
  midPoint: Point;
  angleDeg: number;
}

// Cubic Bezier point evaluation
function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

// Cubic Bezier first derivative (tangent)
function cubicBezierTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  };
}

// Generates an easement turnout curve between two track coordinates with
// two parallel rails and strictly perpendicular, rotated sleepers
function computeTurnoutCurve(
  start: Point,
  end: Point,
  gauge: number = 12,
  sleeperLength: number = 22,
  sleeperSpacing: number = 10
): CurvedTrackGeometry {
  const dx = end.x - start.x;
  // S-shaped transition curve with smooth horizontal departure and arrival
  const p0: Point = start;
  const p1: Point = { x: start.x + dx * 0.45, y: start.y };
  const p2: Point = { x: end.x - dx * 0.45, y: end.y };
  const p3: Point = end;

  // Sample points to estimate arc length
  const SAMPLE_COUNT = 40;
  let totalLength = 0;
  const sampledPoints: Point[] = [];
  const sampledNormals: Point[] = [];

  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const t = i / SAMPLE_COUNT;
    const pt = cubicBezierPoint(p0, p1, p2, p3, t);
    const tan = cubicBezierTangent(p0, p1, p2, p3, t);
    const tanLen = Math.hypot(tan.x, tan.y) || 1;
    // Unit normal (-dy, dx)
    const norm: Point = { x: -tan.y / tanLen, y: tan.x / tanLen };

    if (i > 0) {
      const prev = sampledPoints[i - 1];
      totalLength += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    }
    sampledPoints.push(pt);
    sampledNormals.push(norm);
  }

  // Generate Rail 1 (Top/Left) and Rail 2 (Bottom/Right) SVG path strings
  const halfGauge = gauge / 2;
  let r1Path = "";
  let r2Path = "";
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const pt = sampledPoints[i];
    const norm = sampledNormals[i];
    const r1x = pt.x + halfGauge * norm.x;
    const r1y = pt.y + halfGauge * norm.y;
    const r2x = pt.x - halfGauge * norm.x;
    const r2y = pt.y - halfGauge * norm.y;

    if (i === 0) {
      r1Path += `M ${r1x.toFixed(1)} ${r1y.toFixed(1)}`;
      r2Path += `M ${r2x.toFixed(1)} ${r2y.toFixed(1)}`;
    } else {
      r1Path += ` L ${r1x.toFixed(1)} ${r1y.toFixed(1)}`;
      r2Path += ` L ${r2x.toFixed(1)} ${r2y.toFixed(1)}`;
    }
  }

  // Generate Ballast Bed Path (thick envelope)
  const ballastRadius = halfGauge + 6;
  let ballastTop = "";
  let ballastBottom = "";
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const pt = sampledPoints[i];
    const norm = sampledNormals[i];
    const bx1 = pt.x + ballastRadius * norm.x;
    const by1 = pt.y + ballastRadius * norm.y;
    const bx2 = pt.x - ballastRadius * norm.x;
    const by2 = pt.y - ballastRadius * norm.y;
    if (i === 0) {
      ballastTop += `M ${bx1.toFixed(1)} ${by1.toFixed(1)}`;
      ballastBottom = `L ${bx2.toFixed(1)} ${by2.toFixed(1)}`;
    } else {
      ballastTop += ` L ${bx1.toFixed(1)} ${by1.toFixed(1)}`;
      ballastBottom = ` L ${bx2.toFixed(1)} ${by2.toFixed(1)}` + ballastBottom;
    }
  }
  const ballastPath = ballastTop + ballastBottom + " Z";

  // Generate Rotated Sleepers along the curve
  const halfSleeper = sleeperLength / 2;
  const numSleepers = Math.max(3, Math.floor(totalLength / sleeperSpacing));
  const sleepers: Sleeper[] = [];

  for (let s = 0; s <= numSleepers; s++) {
    const t = s / numSleepers;
    const pt = cubicBezierPoint(p0, p1, p2, p3, t);
    const tan = cubicBezierTangent(p0, p1, p2, p3, t);
    const tanLen = Math.hypot(tan.x, tan.y) || 1;
    const norm: Point = { x: -tan.y / tanLen, y: tan.x / tanLen };

    sleepers.push({
      x1: +(pt.x + halfSleeper * norm.x).toFixed(1),
      y1: +(pt.y + halfSleeper * norm.y).toFixed(1),
      x2: +(pt.x - halfSleeper * norm.x).toFixed(1),
      y2: +(pt.y - halfSleeper * norm.y).toFixed(1),
    });
  }

  const midPt = cubicBezierPoint(p0, p1, p2, p3, 0.5);
  const midTan = cubicBezierTangent(p0, p1, p2, p3, 0.5);
  const angleDeg = +(Math.atan2(midTan.y, midTan.x) * (180 / Math.PI)).toFixed(1);

  return {
    rail1Path: r1Path,
    rail2Path: r2Path,
    ballastPath,
    sleepers,
    midPoint: midPt,
    angleDeg,
  };
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export const StationSchematicCanvas: React.FC<StationSchematicCanvasProps> = ({
  infrastructure,
  selectedElement,
  onSelectElement,
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

  const tracks = infrastructure.tracks;
  const trackCount = tracks.length;

  // Layout Dimensions
  const SVG_WIDTH = 1440;
  const TRACK_START_X = 220; // West throat entrance
  const THROAT_WEST_X = 390; // Platform line divergence zone
  const PLATFORM_START_X = 420; // Platform concrete structure start
  const PLATFORM_END_X = 1020; // Platform concrete structure end
  const THROAT_EAST_X = 1050; // Platform line convergence zone
  const TRACK_END_X = 1220; // East throat departure

  const TRACK_SPACING = 74;
  const TOP_PADDING = 95;
  const SVG_HEIGHT = Math.max(520, TOP_PADDING + trackCount * TRACK_SPACING + 75);

  const GAUGE = 12;
  const HALF_GAUGE = GAUGE / 2;
  const SLEEPER_LENGTH = 22;
  const SLEEPER_SPACING = 10;

  // Map track ID to vertical Y position
  const trackYMap = useMemo(() => {
    const map: Record<string, number> = {};
    tracks.forEach((track, idx) => {
      map[track.id] = TOP_PADDING + idx * TRACK_SPACING;
    });
    return map;
  }, [tracks, TRACK_SPACING]);

  // Find Main Line Y positions to anchor throat divergences
  const mainTrackY = useMemo(() => {
    const downMain = tracks.find((t) => t.trackType === "DOWN_MAIN") || tracks[1] || tracks[0];
    const upMain = tracks.find((t) => t.trackType === "UP_MAIN") || tracks[2] || tracks[0];
    return {
      downMainY: trackYMap[downMain.id] || TOP_PADDING + TRACK_SPACING,
      upMainY: trackYMap[upMain.id] || TOP_PADDING + 2 * TRACK_SPACING,
    };
  }, [tracks, trackYMap, TRACK_SPACING]);

  // Generate Throat Transitions (Curved tracks connecting main line to loops/platforms)
  const throatTransitions = useMemo(() => {
    return tracks.map((track, idx): {
      trackId: string;
      isThrough: boolean;
      westCurve: CurvedTrackGeometry | null;
      eastCurve: CurvedTrackGeometry | null;
      sidingBufferX: number | null;
      straightStartX?: number;
      straightEndX?: number;
    } => {
      const isPlatformTrack = !!track.platformNumber || track.trackType === "PLATFORM";
      const isThroughLine =
        track.trackType === "UP_MAIN" ||
        track.trackType === "DOWN_MAIN" ||
        track.trackType === "THROUGH" ||
        track.trackType === "LOOP" ||
        isPlatformTrack;
      const isSiding = track.trackType === "SIDING";

      if (isThroughLine) {
        return {
          trackId: track.id,
          isThrough: true,
          westCurve: null,
          eastCurve: null,
          sidingBufferX: null,
        };
      }

      if (isSiding) {
        // Siding branches off an adjacent line and terminates at a buffer stop
        const anchorY = idx > 0 ? trackYMap[tracks[idx - 1].id] : mainTrackY.downMainY;
        const branchStart: Point = { x: 520, y: anchorY };
        const branchEnd: Point = { x: 620, y: trackYMap[track.id] };
        const curve = computeTurnoutCurve(branchStart, branchEnd, GAUGE, SLEEPER_LENGTH, SLEEPER_SPACING);
        return {
          trackId: track.id,
          isThrough: false,
          westCurve: curve,
          eastCurve: null,
          sidingBufferX: 980,
          straightStartX: 620,
          straightEndX: 980,
        };
      }

      return {
        trackId: track.id,
        isThrough: true,
        westCurve: null,
        eastCurve: null,
        sidingBufferX: null,
      };
    });
  }, [tracks, trackYMap, mainTrackY, GAUGE, SLEEPER_LENGTH, SLEEPER_SPACING]);

  // Turnouts / Crossovers between tracks (e.g. Pt 101, Crossover 102A/B, Scissors)
  const renderedTurnouts = useMemo(() => {
    return infrastructure.turnouts
      .filter((turnout) => {
        const fromIdx = tracks.findIndex((t) => t.id === turnout.fromTrackId);
        const toIdx = tracks.findIndex((t) => t.id === turnout.toTrackId);
        if (fromIdx === -1 || toIdx === -1) return false;

        const fromTrack = tracks[fromIdx];
        const toTrack = tracks[toIdx];

        const isFromPlatform = !!fromTrack.platformNumber || fromTrack.trackType === "PLATFORM";
        const isToPlatform = !!toTrack.platformNumber || toTrack.trackType === "PLATFORM";

        // 1. Filter out crossovers simply between two platform tracks
        if (isFromPlatform && isToPlatform) {
          return false;
        }

        // 2. Physical geometry constraint: Turnouts must ONLY connect immediately adjacent tracks!
        // Never jump across intermediate platform or loop tracks.
        if (Math.abs(fromIdx - toIdx) > 1) {
          return false;
        }

        return true;
      })
      .map((turnout) => {
        const fromY = trackYMap[turnout.fromTrackId] || TOP_PADDING;
        const toY = trackYMap[turnout.toTrackId] || TOP_PADDING;
        const midX = PLATFORM_START_X + (turnout.xPercent / 100) * (PLATFORM_END_X - PLATFORM_START_X);
        const spanDx = 70;

        // Primary turnout curve
        const start: Point = { x: midX - spanDx / 2, y: fromY };
        const end: Point = { x: midX + spanDx / 2, y: toY };
        const curve = computeTurnoutCurve(start, end, GAUGE, SLEEPER_LENGTH, SLEEPER_SPACING);

        // If scissors crossover, compute second intersecting diagonal
        let scissorsCurve: CurvedTrackGeometry | null = null;
        if (turnout.type === "SCISSORS") {
          const sStart: Point = { x: midX - spanDx / 2, y: toY };
          const sEnd: Point = { x: midX + spanDx / 2, y: fromY };
          scissorsCurve = computeTurnoutCurve(sStart, sEnd, GAUGE, SLEEPER_LENGTH, SLEEPER_SPACING);
        }

        return {
          ...turnout,
          midX,
          fromY,
          toY,
          curve,
          scissorsCurve,
        };
      });
  }, [infrastructure.turnouts, tracks, trackYMap, PLATFORM_START_X, PLATFORM_END_X, GAUGE, SLEEPER_LENGTH, SLEEPER_SPACING]);

  // Platform Islands and Side Platforms
  const renderedPlatforms = useMemo(() => {
    const list: {
      id: string;
      platformNumber: number;
      platformNumbers: number[];
      label: string;
      subLabel: string;
      topY: number;
      height: number;
      isIsland: boolean;
      tracksServed: string[];
    }[] = [];

    const platformTracks = tracks.filter((t) => typeof t.platformNumber === "number" && t.platformNumber > 0);
    if (platformTracks.length === 0) return list;

    let i = 0;
    // 1. Platform 1 (Main Concourse Side Platform above Track 1)
    if (platformTracks[0].platformSide === "SIDE" || platformTracks.length % 2 !== 0) {
      const pf1 = platformTracks[0];
      const y1 = trackYMap[pf1.id];
      list.push({
        id: `PLATFORM-${pf1.platformNumber}`,
        platformNumber: pf1.platformNumber!,
        platformNumbers: [pf1.platformNumber!],
        label: `PLATFORM ${pf1.platformNumber}`,
        subLabel: `MAIN CONCOURSE & STATION BUILDING`,
        topY: y1 - 44,
        height: 28,
        isIsland: false,
        tracksServed: [pf1.id],
      });
      i = 1;
    }

    // 2. Sequential Island Platforms between paired tracks (e.g. 2–3, 4–5, 6–7)
    while (i < platformTracks.length) {
      const current = platformTracks[i];
      const next = platformTracks[i + 1];

      const isLastSingle = !next || (i === platformTracks.length - 1 && current.platformSide === "SIDE");

      if (!isLastSingle && next && current.platformNumber! + 1 === next.platformNumber!) {
        const yTop = trackYMap[current.id];
        const yBottom = trackYMap[next.id];
        const midY = (yTop + yBottom) / 2;
        const pHeight = TRACK_SPACING - 34;
        const pA = current.platformNumber!;
        const pB = next.platformNumber!;

        list.push({
          id: `ISLAND-${pA}-${pB}`,
          platformNumber: pA,
          platformNumbers: [pA, pB],
          label: `PLATFORM ${pA}–${pB}`,
          subLabel: `HIGH-LEVEL PASSENGER BERTH · 650m CSR`,
          topY: midY - pHeight / 2,
          height: pHeight,
          isIsland: true,
          tracksServed: [current.id, next.id],
        });
        i += 2; // Consume both tracks!
      } else {
        const ySingle = trackYMap[current.id];
        list.push({
          id: `PLATFORM-${current.platformNumber}`,
          platformNumber: current.platformNumber!,
          platformNumbers: [current.platformNumber!],
          label: `PLATFORM ${current.platformNumber}`,
          subLabel: `OUTER PASSENGER BAY PLATFORM`,
          topY: ySingle + 16,
          height: 28,
          isIsland: false,
          tracksServed: [current.id],
        });
        i += 1;
      }
    }

    return list;
  }, [tracks, trackYMap, TRACK_SPACING]);

  // Zoom, Pan & Drag Handlers
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

  const handlePan = (direction: "left" | "right" | "up" | "down", amount = 250) => {
    if (!containerRef.current) return;
    if (direction === "left") containerRef.current.scrollBy({ left: -amount, behavior: "smooth" });
    if (direction === "right") containerRef.current.scrollBy({ left: amount, behavior: "smooth" });
    if (direction === "up") containerRef.current.scrollBy({ top: -amount, behavior: "smooth" });
    if (direction === "down") containerRef.current.scrollBy({ top: amount, behavior: "smooth" });
  };

  const handleReset = () => {
    setZoomLevel(1);
    if (containerRef.current) {
      const container = containerRef.current;
      const centerX = (container.scrollWidth - container.clientWidth) / 2;
      const centerY = (container.scrollHeight - container.clientHeight) / 2;
      container.scrollTo({
        left: Math.max(0, centerX),
        top: Math.max(0, centerY),
        behavior: "smooth",
      });
    }
  };

  // Auto-center on station code change
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const centerX = (container.scrollWidth - container.clientWidth) / 2;
      const centerY = (container.scrollHeight - container.clientHeight) / 2;
      container.scrollTo({
        left: Math.max(0, centerX),
        top: Math.max(0, centerY),
        behavior: "auto",
      });
    }
  }, [infrastructure.code]);

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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col font-sans select-none relative">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP CONTROL & TELEMETRY BAR (LIGHT THEME)                   */}
      {/* ------------------------------------------------------------- */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-slate-900">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-sky-800 text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm sm:text-base tracking-wide text-slate-900 uppercase font-mono">
                {infrastructure.name} ({infrastructure.code}) · TRACK INFRASTRUCTURE SCHEMATIC
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              West Central Railway · {infrastructure.division} Division · Broad Gauge (1676mm) · 25 kV AC Electrified
            </div>
          </div>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mouse / Touch Guide Badge */}
          <div className="hidden xl:flex items-center px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-600 space-x-2 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="font-bold text-slate-700">DRAG TO PAN · SCROLL TO ZOOM</span>
          </div>

          {/* Directional Pan Controls */}
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

          {/* Zoom Buttons & Recenter */}
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
            <span className="px-2 text-xs font-mono text-slate-900 min-w-[48px] text-center font-bold">
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
      {/* 2. SVG HERO SCHEMATIC CANVAS (LIGHT THEME)                    */}
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
        className="relative w-full overflow-auto bg-[#fbfcfd] h-[540px] sm:h-[600px] lg:h-[660px] min-h-[500px] cursor-grab active:cursor-grabbing select-none"
      >
        {/* Engineering Blueprint Grid */}
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="min-w-full min-h-full flex items-center justify-center p-4">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="transition-all duration-150 origin-center"
            style={{
              width: `${SVG_WIDTH * zoomLevel}px`,
              minWidth: `${SVG_WIDTH * zoomLevel}px`,
              height: `${SVG_HEIGHT * zoomLevel}px`,
              minHeight: `${SVG_HEIGHT * zoomLevel}px`,
              maxWidth: "none",
            }}
          >
          <defs>
            {/* Cyan highlight glow */}
            <filter id="trackSelectGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.95" />
            </filter>
            {/* Subtle steel rail glow */}
            <filter id="railSteelGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#93c5fd" floodOpacity="0.4" />
            </filter>
            {/* Buffer stop pattern */}
            <pattern id="bufferStopStripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="8" fill="#ef4444" />
              <rect x="4" width="4" height="8" fill="#ffffff" />
            </pattern>
          </defs>

          {/* ==================================================== */}
          {/* LEVEL 4 DIRECTION HEADERS (Approaches)               */}
          {/* ==================================================== */}
          <g className="direction-indicators">
            {/* West Approach */}
            <rect
              x={TRACK_START_X - 10}
              y={TOP_PADDING - 62}
              width={240}
              height={26}
              rx={5}
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            <text
              x={TRACK_START_X + 20}
              y={TOP_PADDING - 45}
              fill="#0369a1"
              fontSize="12"
              fontWeight="600"
              fontFamily="'Inter', sans-serif"
              letterSpacing="0.02em"
            >
              ◄ UP APPROACH ({infrastructure.approaches[0]?.destination || "North"})
            </text>

            {/* East Approach */}
            <rect
              x={TRACK_END_X - 230}
              y={TOP_PADDING - 62}
              width={240}
              height={26}
              rx={5}
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            <text
              x={TRACK_END_X}
              y={TOP_PADDING - 45}
              fill="#0369a1"
              fontSize="12"
              fontWeight="600"
              fontFamily="'Inter', sans-serif"
              letterSpacing="0.02em"
              textAnchor="end"
            >
              DOWN APPROACH ({infrastructure.approaches[1]?.destination || "South"}) ►
            </text>
          </g>

          {/* ==================================================== */}
          {/* PLATFORM ISLAND STRUCTURES (Between tracks)          */}
          {/* ==================================================== */}
          {renderedPlatforms.map((plat) => {
            const isSelected =
              selectedElement?.id === plat.id ||
              (selectedElement?.platformNumber && plat.platformNumbers?.includes(selectedElement.platformNumber)) ||
              (selectedElement?.id && plat.tracksServed.includes(selectedElement.id));
            return (
              <g
                key={`platform-${plat.id}`}
                className="platform-island cursor-pointer group"
                onClick={() => {
                  if (isMovedRef.current) return;
                  onSelectElement({
                    id: plat.id,
                    name: plat.label,
                    platformNumber: plat.platformNumbers[0],
                    platformNumbers: plat.platformNumbers,
                    platformSide: plat.isIsland ? "ISLAND" : "SIDE",
                    lengthMeters: 650,
                    speedLimitKmph: 60,
                    electrified: true,
                    tracksServed: plat.tracksServed,
                    notes: `${plat.subLabel}. High-level concrete deck with yellow safety tactile warning band and overhead canopy.`,
                  });
                }}
              >
                {/* Platform Concrete Slab */}
                <rect
                  x={PLATFORM_START_X}
                  y={plat.topY}
                  width={PLATFORM_END_X - PLATFORM_START_X}
                  height={plat.height}
                  rx={4}
                  fill={isSelected ? "#e0f2fe" : "#ffffff"}
                  stroke={isSelected ? "#0284c7" : "#94a3b8"}
                  strokeWidth={isSelected ? 2 : 1}
                />

                {/* Tactile Yellow Safety Hazard Line along top track edge */}
                <line
                  x1={PLATFORM_START_X + 4}
                  y1={plat.topY + 3}
                  x2={PLATFORM_END_X - 4}
                  y2={plat.topY + 3}
                  stroke="#eab308"
                  strokeWidth={1.8}
                  strokeDasharray="5 3"
                />

                {/* Tactile Yellow Safety Hazard Line along bottom track edge (for Island) */}
                {plat.isIsland && (
                  <line
                    x1={PLATFORM_START_X + 4}
                    y1={plat.topY + plat.height - 3}
                    x2={PLATFORM_END_X - 4}
                    y2={plat.topY + plat.height - 3}
                    stroke="#eab308"
                    strokeWidth={1.8}
                    strokeDasharray="5 3"
                  />
                )}

                {/* Overhead Canopy Pillar Markers */}
                {Array.from({ length: 9 }).map((_, cIdx) => {
                  const px = PLATFORM_START_X + 40 + cIdx * 70;
                  return (
                    <rect
                      key={`pillar-${cIdx}`}
                      x={px}
                      y={plat.topY + plat.height / 2 - 3}
                      width={10}
                      height={6}
                      rx={1}
                      fill="#94a3b8"
                    />
                  );
                })}

                {/* LEVEL 4 Platform Label */}
                <text
                  x={(PLATFORM_START_X + PLATFORM_END_X) / 2}
                  y={plat.topY + plat.height / 2 + 3.5}
                  fill={isSelected ? "#0369a1" : "#0f172a"}
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="'Inter', sans-serif"
                  textAnchor="middle"
                  letterSpacing="0.05em"
                >
                  {plat.label}
                </text>
              </g>
            );
          })}

          {/* ==================================================== */}
          {/* THROAT TRANSITION CURVES & TURNOUTS (Diverging)      */}
          {/* ==================================================== */}
          {throatTransitions.map((tt) => {
            if (!tt.westCurve && !tt.eastCurve) return null;
            const isSelected = selectedElement?.id === tt.trackId;
            const railColor = isSelected ? "#0284c7" : "#1e293b";
            const sleeperColor = "#64748b";

            return (
              <g key={`throat-${tt.trackId}`} className="throat-turnout">
                {/* West Throat Curve */}
                {tt.westCurve && (
                  <g>
                    {/* Ballast bed */}
                    <path d={tt.westCurve.ballastPath} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} />
                    {/* Rotated perpendicular sleepers */}
                    {tt.westCurve.sleepers.map((s, sIdx) => (
                      <line
                        key={`ws-${sIdx}`}
                        x1={s.x1}
                        y1={s.y1}
                        x2={s.x2}
                        y2={s.y2}
                        stroke={sleeperColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    ))}
                    {/* Two parallel rails */}
                    <path
                      d={tt.westCurve.rail1Path}
                      stroke={railColor}
                      strokeWidth={isSelected ? 2.5 : 2}
                      fill="none"
                    />
                    <path
                      d={tt.westCurve.rail2Path}
                      stroke={railColor}
                      strokeWidth={isSelected ? 2.5 : 2}
                      fill="none"
                    />
                  </g>
                )}

                {/* East Throat Curve */}
                {tt.eastCurve && (
                  <g>
                    {/* Ballast bed */}
                    <path d={tt.eastCurve.ballastPath} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} />
                    {/* Rotated perpendicular sleepers */}
                    {tt.eastCurve.sleepers.map((s, sIdx) => (
                      <line
                        key={`es-${sIdx}`}
                        x1={s.x1}
                        y1={s.y1}
                        x2={s.x2}
                        y2={s.y2}
                        stroke={sleeperColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    ))}
                    {/* Two parallel rails */}
                    <path
                      d={tt.eastCurve.rail1Path}
                      stroke={railColor}
                      strokeWidth={isSelected ? 2.5 : 2}
                      fill="none"
                    />
                    <path
                      d={tt.eastCurve.rail2Path}
                      stroke={railColor}
                      strokeWidth={isSelected ? 2.5 : 2}
                      fill="none"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* ==================================================== */}
          {/* TURNOUTS, CROSSOVERS & SCISSORS (Inter-track)        */}
          {/* ==================================================== */}
          {renderedTurnouts.map((turnout) => {
            const isSelected = selectedElement?.id === turnout.id;
            const railColor = isSelected ? "#0284c7" : "#1e293b";
            const sleeperColor = "#64748b";

            return (
              <g
                key={`turnout-group-${turnout.id}`}
                className="turnout-interactive cursor-pointer group"
                onClick={() => {
                  if (isMovedRef.current) return;
                  onSelectElement({
                    ...turnout,
                    isTurnout: true,
                    typeName: "TURNOUT / POINT MACHINE",
                    notes: `Turnout point asset ${turnout.id}. Angle 1 in 12 fan-shaped layout with Thick Web Switch (TWS) and IRS point machine.`,
                  });
                }}
              >
                {/* 1. Main Turnout Curve */}
                <path d={turnout.curve.ballastPath} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} />
                {turnout.curve.sleepers.map((s, sIdx) => (
                  <line
                    key={`ts-${sIdx}`}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke={sleeperColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                ))}
                <path
                  d={turnout.curve.rail1Path}
                  stroke={railColor}
                  strokeWidth={isSelected ? 2.5 : 2}
                  fill="none"
                />
                <path
                  d={turnout.curve.rail2Path}
                  stroke={railColor}
                  strokeWidth={isSelected ? 2.5 : 2}
                  fill="none"
                />

                {/* 2. Secondary Scissors Curve (if applicable) */}
                {turnout.scissorsCurve && (
                  <g>
                    <path d={turnout.scissorsCurve.ballastPath} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} />
                    {turnout.scissorsCurve.sleepers.map((s, sIdx) => (
                      <line
                        key={`ss-${sIdx}`}
                        x1={s.x1}
                        y1={s.y1}
                        x2={s.x2}
                        y2={s.y2}
                        stroke={sleeperColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    ))}
                    <path
                      d={turnout.scissorsCurve.rail1Path}
                      stroke={railColor}
                      strokeWidth={isSelected ? 2.5 : 2}
                      fill="none"
                    />
                    <path
                      d={turnout.scissorsCurve.rail2Path}
                      stroke={railColor}
                      strokeWidth={isSelected ? 2.5 : 2}
                      fill="none"
                    />
                  </g>
                )}

                {/* 3. Point Motor & Switch Blade Indicator */}
                <circle
                  cx={turnout.midX}
                  cy={(turnout.fromY + turnout.toY) / 2}
                  r={isSelected ? 5.5 : 4}
                  fill={isSelected ? "#0284c7" : "#f59e0b"}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />

                {/* 4. LEVEL 4 Point Identification Badge */}
                <g transform={`translate(${turnout.midX + 7}, ${(turnout.fromY + turnout.toY) / 2 - 8})`}>
                  <rect
                    x={0}
                    y={0}
                    width={46}
                    height={16}
                    rx={3}
                    fill="#f8fafc"
                    stroke={isSelected ? "#0284c7" : "#94a3b8"}
                    strokeWidth={1}
                  />
                  <text
                    x={23}
                    y={11.5}
                    fill={isSelected ? "#0369a1" : "#0f172a"}
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {turnout.id.replace(/^.*-/, "Pt ")}
                  </text>
                </g>
              </g>
            );
          })}

          {/* ==================================================== */}
          {/* STRAIGHT TRACK BEDS, SLEEPERS & TWO PARALLEL RAILS   */}
          {/* ==================================================== */}
          {tracks.map((track) => {
            const y = trackYMap[track.id] || TOP_PADDING;
            const isSelected = selectedElement?.id === track.id;
            const tt = throatTransitions.find((t) => t.trackId === track.id);

            // Determine straight span coordinates
            const startX = tt?.isThrough ? TRACK_START_X : tt?.straightStartX || PLATFORM_START_X;
            const endX = tt?.isThrough ? TRACK_END_X : tt?.straightEndX || PLATFORM_END_X;

            const railColor = isSelected ? "#0284c7" : "#1e293b";
            const sleeperColor = "#64748b";

            // Generate horizontal sleepers along the straight segment
            const numSleepers = Math.floor((endX - startX) / SLEEPER_SPACING);

            return (
              <g
                key={`track-${track.id}`}
                className="track-row cursor-pointer group"
                onClick={() => {
                  if (isMovedRef.current) return;
                  onSelectElement(track);
                }}
              >
                {/* 1. Ballast Bed Base */}
                <rect
                  x={startX - 4}
                  y={y - 13}
                  width={endX - startX + 8}
                  height={26}
                  rx={4}
                  fill="#f1f5f9"
                  stroke="#cbd5e1"
                  strokeWidth={0.8}
                />

                {/* 2. REPEATED PERPENDICULAR SLEEPERS */}
                {Array.from({ length: numSleepers + 1 }).map((_, sIdx) => {
                  const sx = startX + sIdx * SLEEPER_SPACING;
                  return (
                    <line
                      key={`sleeper-${track.id}-${sIdx}`}
                      x1={sx}
                      y1={y - SLEEPER_LENGTH / 2}
                      x2={sx}
                      y2={y + SLEEPER_LENGTH / 2}
                      stroke={sleeperColor}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* 3. TWO PARALLEL STEEL RAILS */}
                {/* Rail 1 (Top Rail) */}
                <line
                  x1={startX}
                  y1={y - HALF_GAUGE}
                  x2={endX}
                  y2={y - HALF_GAUGE}
                  stroke={railColor}
                  strokeWidth={isSelected ? 2.5 : 2}
                  strokeLinecap="round"
                />

                {/* Rail 2 (Bottom Rail) */}
                <line
                  x1={startX}
                  y1={y + HALF_GAUGE}
                  x2={endX}
                  y2={y + HALF_GAUGE}
                  stroke={railColor}
                  strokeWidth={isSelected ? 2.5 : 2}
                  strokeLinecap="round"
                />

                {/* 4. Siding Buffer Stop (Dead-end Stopper Block) */}
                {tt?.sidingBufferX && (
                  <g transform={`translate(${tt.sidingBufferX}, ${y - 14})`}>
                    {/* Buffer beam block */}
                    <rect
                      x={0}
                      y={0}
                      width={12}
                      height={28}
                      rx={2}
                      fill="url(#bufferStopStripe)"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                    />
                    <circle cx={6} cy={14} r={3} fill="#ef4444" stroke="#ffffff" strokeWidth={1} />
                    <text x={18} y={18} fill="#ef4444" fontSize="9" fontWeight="700" fontFamily="'Inter', sans-serif">
                      BUFFER STOP
                    </text>
                  </g>
                )}

                {/* 5. LEVEL 4 Track Identification Badge (Left Margin) */}
                <g transform={`translate(15, ${y - 13})`}>
                  <rect
                    x={0}
                    y={0}
                    width={195}
                    height={26}
                    rx={5}
                    fill={isSelected ? "#e0f2fe" : "#ffffff"}
                    stroke={isSelected ? "#0284c7" : "#cbd5e1"}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  <text
                    x={10}
                    y={17}
                    fill={isSelected ? "#0369a1" : "#0f172a"}
                    fontSize="11.5"
                    fontWeight="600"
                    fontFamily="'Inter', sans-serif"
                    letterSpacing="-0.01em"
                  >
                    {track.platformNumber ? `PLATFORM ${track.platformNumber} LINE` : track.name}
                  </text>
                </g>

                {/* 6. LEVEL 5 Physical Engineering Specs (Right Margin) */}
                <g transform={`translate(${TRACK_END_X + 18}, ${y + 4})`}>
                  <text fill="#64748b" fontSize="11" fontWeight="500" fontFamily="'Inter', sans-serif">
                    <tspan className="tech-mono font-bold text-slate-700">{Math.min(track.speedLimitKmph || 60, 60)} km/h</tspan> · <tspan className="tech-mono">{track.lengthMeters}m CSR</tspan> · {track.electrified ? "25kV AC" : "Non-Elec"}
                  </text>
                </g>
              </g>
            );
          })}
          </svg>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. PROFESSIONAL CONTROL ROOM LEGEND & FOOTER                  */}
      {/* ------------------------------------------------------------- */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-700">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-1 bg-[#1e293b] rounded-full inline-block" />
            <span className="text-xs text-slate-700 font-bold">Dual Steel Rails & Sleepers</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-2 rounded-xs bg-white border border-[#94a3b8]" />
            <span className="text-xs text-slate-700 font-bold">Concrete Platform & Tactile Band</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-700 font-bold">Turnout / Point Machine</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-red-600" />
            <span className="text-xs text-slate-700 font-bold">Buffer Stop (Siding)</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
            <span className="text-xs text-[#0369a1] font-bold">Selected Asset (Specs in Drawer)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Click any Track, Platform, or Turnout to inspect physical engineering data</span>
        </div>
      </div>
    </div>
  );
};
