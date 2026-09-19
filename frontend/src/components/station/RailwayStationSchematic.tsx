import React, { useState, useMemo, useRef, useEffect } from "react";
import { StationInfrastructureData, TrackDefinition, TurnoutDefinition } from "../../data/stationInfrastructure";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ShieldCheck,
  Building2,
  Info,
  Maximize2,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

interface RailwayStationSchematicProps {
  station: StationInfrastructureData;
  selectedPlatformNumber?: number | null;
  onSelectPlatform?: (platformNumber: number, track?: TrackDefinition) => void;
  selectedTrackId?: string | null;
  onSelectTrack?: (track: TrackDefinition) => void;
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

function cubicBezierTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  };
}

function computeTurnoutCurve(
  start: Point,
  end: Point,
  gauge: number = 12,
  sleeperLength: number = 22,
  sleeperSpacing: number = 10
): CurvedTrackGeometry {
  const dx = end.x - start.x;
  const p0: Point = start;
  const p1: Point = { x: start.x + dx * 0.45, y: start.y };
  const p2: Point = { x: end.x - dx * 0.45, y: end.y };
  const p3: Point = end;

  const SAMPLE_COUNT = 40;
  let totalLength = 0;
  const sampledPoints: Point[] = [];
  const sampledNormals: Point[] = [];

  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const t = i / SAMPLE_COUNT;
    const pt = cubicBezierPoint(p0, p1, p2, p3, t);
    const tan = cubicBezierTangent(p0, p1, p2, p3, t);
    const tanLen = Math.hypot(tan.x, tan.y) || 1;
    const norm: Point = { x: -tan.y / tanLen, y: tan.x / tanLen };

    if (i > 0) {
      const prev = sampledPoints[i - 1];
      totalLength += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    }
    sampledPoints.push(pt);
    sampledNormals.push(norm);
  }

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

export const RailwayStationSchematic: React.FC<RailwayStationSchematicProps> = ({
  station,
  selectedPlatformNumber,
  onSelectPlatform,
  selectedTrackId,
  onSelectTrack,
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

  const tracks = station.tracks;
  const trackCount = tracks.length;

  // Layout Dimensions with dedicated left margin column and generous track spacing
  const SVG_WIDTH = 1420;
  const LABEL_COL_X = 20;
  const LABEL_COL_WIDTH = 180;
  const TRACK_START_X = 210;
  const THROAT_WEST_X = 390;
  const PLATFORM_START_X = 420;
  const PLATFORM_END_X = 1020;
  const THROAT_EAST_X = 1050;
  const TRACK_END_X = 1230;

  const TRACK_SPACING = 76;
  const TOP_PADDING = 92;
  const SVG_HEIGHT = Math.max(480, TOP_PADDING + trackCount * TRACK_SPACING + 70);

  const GAUGE = 12;
  const HALF_GAUGE = GAUGE / 2;
  const SLEEPER_LENGTH = 22;
  const SLEEPER_SPACING = 10;

  // Track Y position map
  const trackYMap = useMemo(() => {
    const map: Record<string, number> = {};
    tracks.forEach((track, idx) => {
      map[track.id] = TOP_PADDING + idx * TRACK_SPACING;
    });
    return map;
  }, [tracks, TRACK_SPACING]);

  // Main Line positions
  const mainTrackY = useMemo(() => {
    const downMain = tracks.find((t) => t.trackType === "DOWN_MAIN") || tracks[0];
    const upMain = tracks.find((t) => t.trackType === "UP_MAIN") || tracks[1] || tracks[0];
    return {
      downMainY: trackYMap[downMain.id] || TOP_PADDING + TRACK_SPACING,
      upMainY: trackYMap[upMain.id] || TOP_PADDING + 2 * TRACK_SPACING,
    };
  }, [tracks, trackYMap, TRACK_SPACING]);

  // Throat transitions
  // Throat transitions
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
        const anchorY = idx > 0 ? trackYMap[tracks[idx - 1].id] : mainTrackY.downMainY;
        const branchStart: Point = { x: 500, y: anchorY };
        const branchEnd: Point = { x: 600, y: trackYMap[track.id] };
        const curve = computeTurnoutCurve(branchStart, branchEnd, GAUGE, SLEEPER_LENGTH, SLEEPER_SPACING);
        return {
          trackId: track.id,
          isThrough: false,
          westCurve: curve,
          eastCurve: null,
          sidingBufferX: 980,
          straightStartX: 600,
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

  // Turnouts
  const renderedTurnouts = useMemo(() => {
    return station.turnouts
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
        const spanDx = 65;

        const start: Point = { x: midX - spanDx / 2, y: fromY };
        const end: Point = { x: midX + spanDx / 2, y: toY };
        const curve = computeTurnoutCurve(start, end, GAUGE, SLEEPER_LENGTH, SLEEPER_SPACING);

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
  }, [station.turnouts, tracks, trackYMap, PLATFORM_START_X, PLATFORM_END_X, GAUGE, SLEEPER_LENGTH, SLEEPER_SPACING]);

  // Platforms
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
    // 1. If Platform 1 is a side platform (or total platform count is odd), render side Platform 1
    if (platformTracks[0].platformSide === "SIDE" || platformTracks.length % 2 !== 0) {
      const t1 = platformTracks[0];
      const y1 = trackYMap[t1.id];
      list.push({
        id: `PLATFORM-${t1.platformNumber}`,
        platformNumber: t1.platformNumber!,
        platformNumbers: [t1.platformNumber!],
        label: `PLATFORM ${t1.platformNumber}`,
        subLabel: `MAIN CONCOURSE & STATION BUILDING`,
        topY: y1 - 42,
        height: 26,
        isIsland: false,
        tracksServed: [t1.id],
      });
      i = 1;
    }

    // 2. Pair remaining tracks sequentially into Island Platforms (e.g. 2–3, 4–5, 6–7)
    while (i < platformTracks.length) {
      const current = platformTracks[i];
      const next = platformTracks[i + 1];

      // If this is the very last track and it is a side platform (e.g. Platform 6 in 6-track, or Platform 8 in 8-track)
      const isLastSingle = !next || (i === platformTracks.length - 1 && current.platformSide === "SIDE");

      if (!isLastSingle && next && current.platformNumber! + 1 === next.platformNumber!) {
        const yTop = trackYMap[current.id];
        const yBottom = trackYMap[next.id];
        const pA = current.platformNumber!;
        const pB = next.platformNumber!;

        list.push({
          id: `PLATFORM-${pA}-${pB}`,
          platformNumber: pA,
          platformNumbers: [pA, pB],
          label: `PLATFORM ${pA}–${pB}`,
          subLabel: `HIGH-LEVEL ISLAND PLATFORM (CSR ${Math.min(current.lengthMeters, next.lengthMeters)}M)`,
          topY: yTop + 20,
          height: yBottom - yTop - 40,
          isIsland: true,
          tracksServed: [current.id, next.id],
        });
        i += 2; // Advance by 2: consume both tracks for this island platform!
      } else {
        const ySingle = trackYMap[current.id];
        list.push({
          id: `PLATFORM-${current.platformNumber}`,
          platformNumber: current.platformNumber!,
          platformNumbers: [current.platformNumber!],
          label: `PLATFORM ${current.platformNumber}`,
          subLabel: `OUTER PASSENGER BERTH`,
          topY: ySingle + 16,
          height: 24,
          isIsland: false,
          tracksServed: [current.id],
        });
        i += 1;
      }
    }

    return list;
  }, [tracks, trackYMap]);

  // Straight sleepers generator
  const generateStraightSleepers = (startX: number, endX: number, y: number) => {
    const count = Math.floor((endX - startX) / SLEEPER_SPACING);
    const halfSleeper = SLEEPER_LENGTH / 2;
    const sleepers: Sleeper[] = [];
    for (let i = 0; i <= count; i++) {
      const sx = startX + i * SLEEPER_SPACING;
      sleepers.push({
        x1: sx,
        y1: y - halfSleeper,
        x2: sx,
        y2: y + halfSleeper,
      });
    }
    return sleepers;
  };

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

  // Center on station change
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
  }, [station.code]);

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

  const isVerifiedLayout = station.provenance.verificationStatus === "VERIFIED";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col font-sans select-none relative">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP SCHEMATIC HEADER (LIGHT ENGINEERING STYLE)              */}
      {/* ------------------------------------------------------------- */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-slate-900">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-sky-800 text-white shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm sm:text-base tracking-wide text-slate-900 uppercase font-mono">
                {station.name.toUpperCase()} ({station.code}) · STATION INFRASTRUCTURE SCHEMATIC
              </span>
              {station.hindiName && (
                <span className="text-xs font-bold text-slate-500 font-sans">
                  · {station.hindiName}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              {station.category} · {station.platformsCount} Platforms · {station.tracks.length} Running Tracks · {station.loopsCount} Loops · {station.sidingsCount} Sidings
            </div>
          </div>
        </div>

        {/* Provenance and Interactive Controls */}
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
      {/* 2. SVG SCHEMATIC CANVAS (CLEAN LIGHT BLUEPRINT)               */}
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
        {/* Engineering Drafting Grid */}
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
            backgroundSize: "40px 40px",
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
            {/* Red & White diagonal buffer stop pattern */}
            <pattern id="lightBufferStripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="8" fill="#dc2626" />
              <rect x="4" width="4" height="8" fill="#ffffff" />
            </pattern>
          </defs>

          {/* Direction Approaches */}
          <g className="station-approaches">
            <rect
              x={TRACK_START_X - 10}
              y={TOP_PADDING - 55}
              width={220}
              height={26}
              rx={5}
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            <text
              x={TRACK_START_X + 10}
              y={TOP_PADDING - 38}
              fill="#0369a1"
              fontSize="11.5"
              fontWeight="600"
              fontFamily="'Inter', sans-serif"
              letterSpacing="0.02em"
            >
              ◄ UP APPROACH ({station.approaches[0]?.destination?.slice(0, 18) || "Origin"})
            </text>

            <rect
              x={TRACK_END_X - 210}
              y={TOP_PADDING - 55}
              width={220}
              height={26}
              rx={5}
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            <text
              x={TRACK_END_X - 10}
              y={TOP_PADDING - 38}
              fill="#0369a1"
              fontSize="11.5"
              fontWeight="600"
              fontFamily="'Inter', sans-serif"
              letterSpacing="0.02em"
              textAnchor="end"
            >
              DOWN APPROACH ({station.approaches[1]?.destination?.slice(0, 18) || "Destination"}) ►
            </text>
          </g>

          {/* ==================================================== */}
          {/* PLATFORM ISLANDS & SIDE PLATFORMS                    */}
          {/* ==================================================== */}
          {renderedPlatforms.map((plat) => {
            const isPlatformSelected = selectedPlatformNumber ? plat.platformNumbers.includes(selectedPlatformNumber) : false;

            return (
              <g
                key={`plat-${plat.id}`}
                className="cursor-pointer group"
                onClick={() => {
                  if (!isMovedRef.current && onSelectPlatform) {
                    const pNum = selectedPlatformNumber && plat.platformNumbers.includes(selectedPlatformNumber)
                      ? selectedPlatformNumber
                      : plat.platformNumbers[0];
                    const track = tracks.find((t) => t.platformNumber === pNum);
                    onSelectPlatform(pNum, track);
                  }
                }}
              >
                {/* Platform Concrete Structure */}
                <rect
                  x={PLATFORM_START_X}
                  y={plat.topY}
                  width={PLATFORM_END_X - PLATFORM_START_X}
                  height={plat.height}
                  rx={4}
                  fill={isPlatformSelected ? "#e0f2fe" : "#ffffff"}
                  stroke={isPlatformSelected ? "#0284c7" : "#94a3b8"}
                  strokeWidth={isPlatformSelected ? 2 : 1}
                  className="transition-colors group-hover:stroke-sky-500"
                />

                {/* Top Yellow Tactile Warning Edge */}
                <line
                  x1={PLATFORM_START_X + 2}
                  y1={plat.topY + 3}
                  x2={PLATFORM_END_X - 2}
                  y2={plat.topY + 3}
                  stroke="#eab308"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />

                {/* Bottom Yellow Tactile Warning Edge */}
                <line
                  x1={PLATFORM_START_X + 2}
                  y1={plat.topY + plat.height - 3}
                  x2={PLATFORM_END_X - 2}
                  y2={plat.topY + plat.height - 3}
                  stroke="#eab308"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />

                {/* Canopy Pillars down center spine */}
                {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
                  const px = PLATFORM_START_X + ratio * (PLATFORM_END_X - PLATFORM_START_X);
                  const py = plat.topY + plat.height / 2;
                  return (
                    <rect
                      key={`canopy-${idx}`}
                      x={px - 3}
                      y={py - 3}
                      width={6}
                      height={6}
                      rx={1}
                      fill="#94a3b8"
                    />
                  );
                })}

                {/* Platform Pill Label (Clean, high-legibility) */}
                <g transform={`translate(${(PLATFORM_START_X + PLATFORM_END_X) / 2 - 58}, ${plat.topY + plat.height / 2 - 10})`}>
                  <rect
                    x={0}
                    y={0}
                    width={116}
                    height={20}
                    rx={4}
                    fill={isPlatformSelected ? "#0284c7" : "#f8fafc"}
                    stroke={isPlatformSelected ? "#0369a1" : "#cbd5e1"}
                    strokeWidth={1}
                  />
                  <text
                    x={58}
                    y={14}
                    fill={isPlatformSelected ? "#ffffff" : "#0f172a"}
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="'Inter', sans-serif"
                    textAnchor="middle"
                    className="pointer-events-none"
                    letterSpacing="0.03em"
                  >
                    {plat.label}
                  </text>
                </g>
              </g>
            );
          })}

          {/* ==================================================== */}
          {/* RUNNING TRACKS (Dual Rails + Perpendicular Sleepers) */}
          {/* ==================================================== */}
          {tracks.map((track) => {
            const y = trackYMap[track.id];
            const transition = throatTransitions.find((t) => t.trackId === track.id);
            const isTrackSelected = selectedTrackId === track.id;

            const isThrough = transition?.isThrough ?? true;
            const startX = isThrough ? TRACK_START_X : (transition?.straightStartX || THROAT_WEST_X);
            const endX = isThrough ? TRACK_END_X : (transition?.straightEndX || THROAT_EAST_X);

            const sleepers = generateStraightSleepers(startX, endX, y);

            return (
              <g
                key={`track-group-${track.id}`}
                className="cursor-pointer group"
                onClick={() => {
                  if (!isMovedRef.current && onSelectTrack) {
                    onSelectTrack(track);
                  }
                }}
              >
                {/* 1. Ballast Foundation Bed */}
                <rect
                  x={startX - 10}
                  y={y - 11}
                  width={endX - startX + 20}
                  height={22}
                  rx={3}
                  fill="#f1f5f9"
                  stroke="#cbd5e1"
                  strokeWidth={0.8}
                />

                {/* 2. Sleepers */}
                {sleepers.map((s, sIdx) => (
                  <line
                    key={`slp-${track.id}-${sIdx}`}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                ))}

                {/* 3. Rail 1 (Top) & Rail 2 (Bottom) */}
                <line
                  x1={startX}
                  y1={y - HALF_GAUGE}
                  x2={endX}
                  y2={y - HALF_GAUGE}
                  stroke={isTrackSelected ? "#0284c7" : "#1e293b"}
                  strokeWidth={isTrackSelected ? 2.5 : 2}
                />
                <line
                  x1={startX}
                  y1={y + HALF_GAUGE}
                  x2={endX}
                  y2={y + HALF_GAUGE}
                  stroke={isTrackSelected ? "#0284c7" : "#1e293b"}
                  strokeWidth={isTrackSelected ? 2.5 : 2}
                />

                {/* 4. Throat Transitions (West & East Easement Curves) */}
                {transition?.westCurve && (
                  <g className="west-easement-curve">
                    <path d={transition.westCurve.ballastPath} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} />
                    {transition.westCurve.sleepers.map((s, cIdx) => (
                      <line
                        key={`w-slp-${cIdx}`}
                        x1={s.x1}
                        y1={s.y1}
                        x2={s.x2}
                        y2={s.y2}
                        stroke="#64748b"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    ))}
                    <path d={transition.westCurve.rail1Path} fill="none" stroke={isTrackSelected ? "#0284c7" : "#1e293b"} strokeWidth={2} />
                    <path d={transition.westCurve.rail2Path} fill="none" stroke={isTrackSelected ? "#0284c7" : "#1e293b"} strokeWidth={2} />
                  </g>
                )}

                {transition?.eastCurve && (
                  <g className="east-easement-curve">
                    <path d={transition.eastCurve.ballastPath} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} />
                    {transition.eastCurve.sleepers.map((s, cIdx) => (
                      <line
                        key={`e-slp-${cIdx}`}
                        x1={s.x1}
                        y1={s.y1}
                        x2={s.x2}
                        y2={s.y2}
                        stroke="#64748b"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    ))}
                    <path d={transition.eastCurve.rail1Path} fill="none" stroke={isTrackSelected ? "#0284c7" : "#1e293b"} strokeWidth={2} />
                    <path d={transition.eastCurve.rail2Path} fill="none" stroke={isTrackSelected ? "#0284c7" : "#1e293b"} strokeWidth={2} />
                  </g>
                )}

                {/* 5. Siding Buffer Stop (If Siding) */}
                {transition?.sidingBufferX && (
                  <g transform={`translate(${transition.sidingBufferX}, ${y - 14})`}>
                    <rect x={0} y={0} width={14} height={28} rx={2} fill="url(#lightBufferStripe)" stroke="#dc2626" strokeWidth={1} />
                    <rect x={14} y={6} width={6} height={16} fill="#334155" rx={1} />
                    <circle cx={7} cy={14} r={3} fill="#ffffff" />
                  </g>
                )}

                {/* 6. Track Identity Margin Tag in dedicated left column */}
                <g className="track-left-margin-tag">
                  <rect
                    x={LABEL_COL_X}
                    y={y - 12}
                    width={LABEL_COL_WIDTH}
                    height={24}
                    rx={4}
                    fill={isTrackSelected ? "#e0f2fe" : "#ffffff"}
                    stroke={isTrackSelected ? "#0284c7" : "#cbd5e1"}
                    strokeWidth={1}
                  />
                  <text
                    x={LABEL_COL_X + 10}
                    y={y + 4}
                    fill={isTrackSelected ? "#0369a1" : "#0f172a"}
                    fontSize="11.5"
                    fontWeight="600"
                    fontFamily="'Inter', sans-serif"
                    letterSpacing="-0.01em"
                  >
                    {track.name.toUpperCase()}
                  </text>
                  {/* Leader line from margin tag to track start */}
                  <line
                    x1={LABEL_COL_X + LABEL_COL_WIDTH}
                    y1={y}
                    x2={startX}
                    y2={y}
                    stroke={isTrackSelected ? "#0284c7" : "#94a3b8"}
                    strokeWidth={1}
                    strokeDasharray="3 2"
                  />
                </g>

                {/* 7. Transparent Hit Line for smooth track clicks */}
                <line
                  x1={startX}
                  y1={y}
                  x2={endX}
                  y2={y}
                  stroke="transparent"
                  strokeWidth={24}
                  className="cursor-pointer"
                />
              </g>
            );
          })}

          {/* ==================================================== */}
          {/* TURNOUTS & CROSSOVERS                                */}
          {/* ==================================================== */}
          {renderedTurnouts.map((turnout) => (
            <g key={`turnout-${turnout.id}`} className="turnout-overlay">
              {/* Primary turnout curve */}
              <path d={turnout.curve.ballastPath} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} />
              {turnout.curve.sleepers.map((s, idx) => (
                <line
                  key={`t-slp-${idx}`}
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              ))}
              <path d={turnout.curve.rail1Path} fill="none" stroke="#1e293b" strokeWidth={2} />
              <path d={turnout.curve.rail2Path} fill="none" stroke="#1e293b" strokeWidth={2} />

              {/* Scissors secondary curve */}
              {turnout.scissorsCurve && (
                <>
                  <path d={turnout.scissorsCurve.ballastPath} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} />
                  {turnout.scissorsCurve.sleepers.map((s, idx) => (
                    <line
                      key={`sc-slp-${idx}`}
                      x1={s.x1}
                      y1={s.y1}
                      x2={s.x2}
                      y2={s.y2}
                      stroke="#64748b"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  ))}
                  <path d={turnout.scissorsCurve.rail1Path} fill="none" stroke="#1e293b" strokeWidth={2} />
                  <path d={turnout.scissorsCurve.rail2Path} fill="none" stroke="#1e293b" strokeWidth={2} />
                </>
              )}

              {/* Turnout point tag */}
              <g transform={`translate(${turnout.midX - 22}, ${(turnout.fromY + turnout.toY) / 2 - 8})`}>
                <rect x={0} y={0} width={44} height={16} rx={3} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />
                <text x={22} y={11} fill="#0369a1" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  {turnout.name.split(" ")[0]}
                </text>
              </g>
            </g>
          ))}
        </svg>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. BOTTOM ENGINEERING LEGEND                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-5 text-slate-700">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-1.5 bg-[#1e293b] rounded-full inline-block" />
            <span>Dual Steel Rails (60kg UIC)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-white border border-[#94a3b8] rounded inline-block" />
            <span>Passenger Platform (Clickable)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-1 border-t-2 border-dashed border-[#eab308] inline-block" />
            <span>Yellow Tactile Hazard Edge</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-red-600 rounded-xs inline-block" />
            <span>Siding Buffer Stop</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          RRI/EI: {station.rriType}
        </div>
      </div>
    </div>
  );
};
