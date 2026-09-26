import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  BHOPAL_CORRIDOR_STATIONS,
  TOTAL_CORRIDOR_KM,
  TRAIN_CATEGORIES,
} from "../../data/bhopalRegionConfig";
import { LiveRailwayTrain } from "../../services/railwayApi";
import { BlockData } from "../../types";
import { formatDistanceKm } from "../../utils/formatDistance";

interface MareyCanvasProps {
  trains: LiveRailwayTrain[];
  blocks: BlockData[];
  selectedTrain: LiveRailwayTrain | null;
  onSelectTrain: (train: LiveRailwayTrain | null) => void;
  selectedBlock: BlockData | null;
  onSelectBlock: (block: BlockData | null) => void;
  theme: "vintage" | "dark";
  showScheduledPaths: boolean;
  showBlocks: boolean;
  activeDirection: string;
  activeCategory: string;
  searchQuery: string;
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
  referenceTimeStr: string;
  selectedDate?: string;
  isToday?: boolean;
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export const MareyCanvas: React.FC<MareyCanvasProps> = ({
  trains,
  blocks,
  selectedTrain,
  onSelectTrain,
  selectedBlock,
  onSelectBlock,
  theme,
  showScheduledPaths,
  showBlocks,
  activeDirection,
  activeCategory,
  searchQuery,
  zoomLevel,
  onZoomChange,
  referenceTimeStr,
  selectedDate,
  isToday = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Responsive Dimensions Tracking
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight - 140 : 750,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        setDimensions({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  // Pan and Viewport State
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<{
    type: "train" | "block" | "station";
    data: any;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Parse reference time into hours (e.g. 19:55:12 -> 19.92)
  const refTimeHour = useMemo(() => {
    if (!referenceTimeStr) {
      const d = new Date();
      return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    }
    const parts = referenceTimeStr.split(":").map(Number);
    return (parts[0] || 0) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600;
  }, [referenceTimeStr]);

  // Color Palette depending on Theme
  const colors = useMemo(() => {
    const isDark = theme === "dark";
    return {
      bg: isDark ? "#090d16" : "#fcfaf2",
      headerBg: isDark ? "#050811" : "#f4efe4",
      stationText: isDark ? "#cbd5e1" : "#1e293b",
      stationMajorText: isDark ? "#f8fafc" : "#0f172a",
      stationKmText: isDark ? "#94a3b8" : "#64748b",
      majorGridLine: isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(30, 41, 59, 0.40)",
      minorGridLine: isDark ? "rgba(71, 85, 105, 0.25)" : "rgba(148, 163, 184, 0.25)",
      timeGridLine: isDark ? "rgba(71, 85, 105, 0.22)" : "rgba(148, 163, 184, 0.22)",
      hourText: isDark ? "#94a3b8" : "#475569",
      redMarker: "#ef4444",
      border: isDark ? "#1e293b" : "#cbd5e1",
      tooltipBg: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
      tooltipBorder: isDark ? "#334155" : "#cbd5e1",
      tooltipText: isDark ? "#f1f5f9" : "#0f172a",
    };
  }, [theme]);

  // Coordinate Transformations Constants
  const LEFT_AXIS_WIDTH = 180;
  const RIGHT_AXIS_WIDTH = 180;
  const TOP_AXIS_HEIGHT = 44;
  const BOTTOM_AXIS_HEIGHT = 34;

  // Convert time hour (0 to 24) to X pixel coordinate
  const timeToX = useCallback(
    (hour: number, plotWidth: number) => {
      return LEFT_AXIS_WIDTH + panOffset.x + (hour / 24) * plotWidth * zoomLevel;
    },
    [panOffset.x, zoomLevel]
  );

  // Convert km (0 to 231) to Y pixel coordinate
  const kmToY = useCallback(
    (km: number, plotHeight: number) => {
      return TOP_AXIS_HEIGHT + panOffset.y + (km / TOTAL_CORRIDOR_KM) * plotHeight;
    },
    [panOffset.y]
  );

  // Filter trains
  const filteredTrains = useMemo(() => {
    return trains.filter((t) => {
      if (activeDirection !== "ALL" && t.direction !== activeDirection) return false;
      if (activeCategory !== "ALL" && t.category !== activeCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.trainNumber.toLowerCase().includes(q) && !t.trainName.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [trains, activeDirection, activeCategory, searchQuery]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(900, dimensions.width);
    const height = Math.max(650, dimensions.height);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const plotWidth = Math.max(800, width - LEFT_AXIS_WIDTH - RIGHT_AXIS_WIDTH);
    const plotHeight = Math.max(550, height - TOP_AXIS_HEIGHT - BOTTOM_AXIS_HEIGHT);

    // 1. Clear Canvas & Draw Background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Station Horizontal Lines & Grid
    BHOPAL_CORRIDOR_STATIONS.forEach((stn) => {
      const y = kmToY(stn.km, plotHeight);
      if (y < TOP_AXIS_HEIGHT - 5 || y > height - BOTTOM_AXIS_HEIGHT + 5) return;

      ctx.beginPath();
      ctx.strokeStyle = stn.isMajor ? colors.majorGridLine : colors.minorGridLine;
      ctx.lineWidth = stn.isMajor ? 1.5 : 0.75;
      if (!stn.isMajor) {
        ctx.setLineDash([2, 3]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(LEFT_AXIS_WIDTH, y);
      ctx.lineTo(width - RIGHT_AXIS_WIDTH, y);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 3. Draw Vertical Time Grid Lines (Hourly 00:00 to 24:00)
    ctx.setLineDash([]);
    for (let h = 0; h <= 24; h++) {
      const x = timeToX(h, plotWidth);
      if (x < LEFT_AXIS_WIDTH - 20 || x > width - RIGHT_AXIS_WIDTH + 20) continue;

      ctx.beginPath();
      ctx.strokeStyle = h % 6 === 0 ? colors.majorGridLine : colors.timeGridLine;
      ctx.lineWidth = h % 6 === 0 ? 1.2 : 0.75;
      ctx.moveTo(x, TOP_AXIS_HEIGHT);
      ctx.lineTo(x, height - BOTTOM_AXIS_HEIGHT);
      ctx.stroke();
    }

    // 4. Draw Maintenance Block Possession Overlays (Translucent, below train lines)
    if (showBlocks && blocks.length > 0) {
      const activeBlocks = blocks.filter((blk) => {
        // Exclude unproposed canonical candidate blocks
        if (blk.status === "PLANNED" || blk.approval_status === "DRAFT") return false;
        if (!["PROPOSED", "PENDING_APPROVAL", "APPROVED", "SANCTIONED", "ACTIVE", "COMPLETED", "SELECTED"].includes(blk.status)) return false;
        if (!selectedDate) return true;
        const bDate = blk.execution_date || blk.scheduled_date || blk.date;
        return !bDate || bDate === selectedDate;
      });

      activeBlocks.forEach((blk) => {
        const startParts = (blk.requested_start_time || "10:00").split(":").map(Number);
        const endParts = (blk.requested_end_time || "12:00").split(":").map(Number);
        const startH = (startParts[0] || 0) + (startParts[1] || 0) / 60;
        const endH = (endParts[0] || 0) + (endParts[1] || 0) / 60;

        const x1 = timeToX(startH, plotWidth);
        const x2 = timeToX(endH, plotWidth);
        const boxWidth = Math.max(16, x2 - x1);

        const centerKm = blk.location_km || 138;
        const startKm = Math.max(0, centerKm - 4);
        const endKm = Math.min(TOTAL_CORRIDOR_KM, centerKm + 4);
        const y1 = kmToY(startKm, plotHeight);
        const y2 = kmToY(endKm, plotHeight);
        const boxHeight = Math.max(18, y2 - y1);

        const bType = (blk.block_type || "PLANNED").toUpperCase();
        let fillStyle = "rgba(59, 130, 246, 0.16)"; // Blue for planned
        let strokeStyle = "#2563eb";

        if (bType === "RULING") {
          fillStyle = "rgba(147, 51, 234, 0.18)"; // Purple
          strokeStyle = "#9333ea";
        } else if (bType === "EMERGENT") {
          fillStyle = "rgba(239, 68, 68, 0.22)"; // Red danger
          strokeStyle = "#dc2626";
        } else if (bType === "SHADOW") {
          fillStyle = "rgba(79, 70, 229, 0.20)"; // Indigo multi-dept
          strokeStyle = "#4f46e5";
        }

        // Clip to graph plot area
        ctx.save();
        ctx.rect(LEFT_AXIS_WIDTH, TOP_AXIS_HEIGHT, width - LEFT_AXIS_WIDTH - RIGHT_AXIS_WIDTH, plotHeight);
        ctx.clip();

        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = selectedBlock?.id === blk.id ? 2.5 : 1.2;
        ctx.fillRect(x1, y1, boxWidth, boxHeight);
        ctx.strokeRect(x1, y1, boxWidth, boxHeight);

        // Subtle hatching pattern for ruling / emergent
        if (bType === "RULING" || bType === "EMERGENT") {
          ctx.beginPath();
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = 0.75;
          for (let diag = -boxHeight; diag < boxWidth; diag += 8) {
            ctx.moveTo(x1 + Math.max(0, diag), y1 + Math.max(0, -diag));
            ctx.lineTo(x1 + Math.min(boxWidth, diag + boxHeight), y1 + Math.min(boxHeight, boxHeight));
          }
          ctx.stroke();
        }

        // Block badge label
        if (boxWidth > 45 && boxHeight > 18) {
          ctx.font = "bold 9px 'Roboto Mono', monospace";
          ctx.fillStyle = strokeStyle;
          const label = bType === "SHADOW" ? "👥 SHADOW" : bType === "EMERGENT" ? "🚨 EMG" : bType === "RULING" ? "🏛️ RUL" : "📋 PLN";
          ctx.fillText(label, x1 + 4, y1 + 12);
        }

        ctx.restore();
      });
    }

    // 5. Draw Scheduled / Future Train Paths (Dashed, never drawn as travelled!)
    if (showScheduledPaths) {
      filteredTrains.forEach((t) => {
        if (!t.scheduledPath || t.scheduledPath.length < 2) return;

        const cat = TRAIN_CATEGORIES[t.category] || TRAIN_CATEGORIES.OTHER;
        ctx.save();
        ctx.rect(LEFT_AXIS_WIDTH, TOP_AXIS_HEIGHT, width - LEFT_AXIS_WIDTH - RIGHT_AXIS_WIDTH, plotHeight);
        ctx.clip();

        ctx.beginPath();
        ctx.strokeStyle = cat.stroke || cat.color;
        ctx.globalAlpha = 0.40;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);

        t.scheduledPath.forEach((pt, idx) => {
          const x = timeToX(pt.time_float, plotWidth);
          const y = kmToY(pt.km, plotHeight);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
        ctx.restore();
      });
    }

    // 6. Draw Confirmed Travelled Train Trajectories (Bold solid lines up to latest confirmed position)
    filteredTrains.forEach((t) => {
      const isSelected = selectedTrain?.trainNumber === t.trainNumber;
      const cat = TRAIN_CATEGORIES[t.category] || TRAIN_CATEGORIES.OTHER;
      const history = t.historicalPositions;

      if (!history || history.length === 0) return;

      ctx.save();
      ctx.rect(LEFT_AXIS_WIDTH, TOP_AXIS_HEIGHT, width - LEFT_AXIS_WIDTH - RIGHT_AXIS_WIDTH, plotHeight);
      ctx.clip();

      ctx.beginPath();
      ctx.strokeStyle = cat.stroke;
      ctx.globalAlpha = t.is_active ? 1.0 : 0.70;
      ctx.lineWidth = isSelected ? 3.5 : t.is_active ? 2.5 : 1.7;
      ctx.setLineDash([]);

      history.forEach((pt, idx) => {
        const x = timeToX(pt.time_float, plotWidth);
        const y = kmToY(pt.km, plotHeight);

        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw angled train label along the path
      if (history.length >= 2) {
        const midIdx = Math.floor(history.length / 2);
        const p1 = history[Math.max(0, midIdx - 1)];
        const p2 = history[Math.min(history.length - 1, midIdx + 1)];

        const x1 = timeToX(p1.time_float, plotWidth);
        const y1 = kmToY(p1.km, plotHeight);
        const x2 = timeToX(p2.time_float, plotWidth);
        const y2 = kmToY(p2.km, plotHeight);

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        if (midX > LEFT_AXIS_WIDTH + 30 && midX < width - RIGHT_AXIS_WIDTH - 30) {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          ctx.save();
          ctx.translate(midX, midY);
          const labelAngle = Math.abs(angle) > Math.PI / 2 ? angle + Math.PI : angle;
          ctx.rotate(labelAngle);

          ctx.font = isSelected ? "bold 11px 'Roboto Mono', monospace" : "bold 9.5px 'Roboto Mono', monospace";
          ctx.fillStyle = cat.stroke;
          const displayLabel = t.trainDisplayName || `${t.trainNumber} — ${t.trainName}`;
          ctx.fillText(displayLabel, -20, -5);
          ctx.restore();
        }
      }

      // 7. Live Train Marker Beacon (Glowing beacon at latest confirmed position)
      if (t.is_active && history.length > 0) {
        const latest = history[history.length - 1];
        const mx = timeToX(latest.time_float, plotWidth);
        const my = kmToY(latest.km, plotHeight);

        // Glowing outer pulse
        ctx.beginPath();
        ctx.arc(mx, my, isSelected ? 10 : 7.5, 0, Math.PI * 2);
        ctx.fillStyle = cat.stroke;
        ctx.globalAlpha = 0.3;
        ctx.fill();

        // Solid inner beacon
        ctx.beginPath();
        ctx.arc(mx, my, isSelected ? 5.5 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = cat.stroke;
        ctx.globalAlpha = 1.0;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Speed & Number Callout Flag
        ctx.font = "bold 9px 'Roboto Mono', monospace";
        const trainTitle = t.trainDisplayName || `${t.trainNumber} — ${t.trainName}`;
        const tagText = `● ${trainTitle} · ${t.currentSpeedKmph} km/h`;
        const textWidth = ctx.measureText(tagText).width;

        const tagX = t.direction === "DOWN" ? mx + 9 : mx - textWidth - 14;
        const tagY = my - 6;

        ctx.fillStyle = theme === "dark" ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.95)";
        ctx.fillRect(tagX - 4, tagY - 10, textWidth + 8, 15);
        ctx.strokeStyle = cat.stroke;
        ctx.lineWidth = 1.0;
        ctx.strokeRect(tagX - 4, tagY - 10, textWidth + 8, 15);

        ctx.fillStyle = cat.stroke;
        ctx.fillText(tagText, tagX, tagY + 2);
      }

      ctx.restore();
    });

    // 8. Vertical Red Reference Time Line Indicator (Exact real-time or reference 19:55:12)
    // Invariant: ONLY drawn when viewing today's timeline!
    if (isToday) {
      const refX = timeToX(refTimeHour, plotWidth);
      if (refX >= LEFT_AXIS_WIDTH && refX <= width - RIGHT_AXIS_WIDTH) {
        ctx.beginPath();
        ctx.strokeStyle = colors.redMarker;
        ctx.lineWidth = 2.0;
      ctx.setLineDash([5, 3]);
      ctx.moveTo(refX, TOP_AXIS_HEIGHT);
      ctx.lineTo(refX, height - BOTTOM_AXIS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Top Red Pill Badge showing Reference Time
      const rawTime = referenceTimeStr || new Date().toLocaleTimeString("en-GB");
      const timeTag = `NOW ${rawTime}`;
      ctx.font = "bold 10px 'Roboto Mono', monospace";
      const pillWidth = ctx.measureText(timeTag).width + 16;

      ctx.fillStyle = colors.redMarker;
      ctx.beginPath();
      ctx.roundRect(refX - pillWidth / 2, TOP_AXIS_HEIGHT - 20, pillWidth, 18, 4);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(timeTag, refX - pillWidth / 2 + 8, TOP_AXIS_HEIGHT - 7);

      // Bottom Red Pill Badge
      ctx.fillStyle = colors.redMarker;
      ctx.beginPath();
      ctx.roundRect(refX - pillWidth / 2, height - BOTTOM_AXIS_HEIGHT + 3, pillWidth, 18, 4);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(timeTag, refX - pillWidth / 2 + 8, height - BOTTOM_AXIS_HEIGHT + 16);
      }
    }

    // 9. Draw Left Y-Axis Header & Station Ladder
    ctx.fillStyle = colors.headerBg;
    ctx.fillRect(0, 0, LEFT_AXIS_WIDTH, height);

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LEFT_AXIS_WIDTH, 0);
    ctx.lineTo(LEFT_AXIS_WIDTH, height);
    ctx.stroke();

    BHOPAL_CORRIDOR_STATIONS.forEach((stn) => {
      const y = kmToY(stn.km, plotHeight);
      if (y < TOP_AXIS_HEIGHT - 5 || y > height - BOTTOM_AXIS_HEIGHT + 5) return;

      // Station code & name
      ctx.font = stn.isMajor ? "bold 10px 'Playfair Display', Georgia, serif" : "9px 'Roboto', sans-serif";
      ctx.fillStyle = stn.isMajor ? colors.stationMajorText : colors.stationText;
      const label = `${stn.name} (${stn.code})`;
      ctx.fillText(label, 12, y + 3);

      // Km Distance
      ctx.font = "bold 9px 'Roboto Mono', monospace";
      ctx.fillStyle = colors.stationKmText;
      ctx.fillText(`${stn.km.toFixed(2)} km`, LEFT_AXIS_WIDTH - 46, y + 3);

      // Station tick mark
      ctx.strokeStyle = stn.isMajor ? colors.stationMajorText : colors.minorGridLine;
      ctx.lineWidth = stn.isMajor ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(LEFT_AXIS_WIDTH - 6, y);
      ctx.lineTo(LEFT_AXIS_WIDTH, y);
      ctx.stroke();
    });

    // 10. Draw Right Y-Axis Station Ladder (Mirrored)
    ctx.fillStyle = colors.headerBg;
    ctx.fillRect(width - RIGHT_AXIS_WIDTH, 0, RIGHT_AXIS_WIDTH, height);

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - RIGHT_AXIS_WIDTH, 0);
    ctx.lineTo(width - RIGHT_AXIS_WIDTH, height);
    ctx.stroke();

    BHOPAL_CORRIDOR_STATIONS.forEach((stn) => {
      const y = kmToY(stn.km, plotHeight);
      if (y < TOP_AXIS_HEIGHT - 5 || y > height - BOTTOM_AXIS_HEIGHT + 5) return;

      ctx.strokeStyle = stn.isMajor ? colors.stationMajorText : colors.minorGridLine;
      ctx.lineWidth = stn.isMajor ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(width - RIGHT_AXIS_WIDTH, y);
      ctx.lineTo(width - RIGHT_AXIS_WIDTH + 6, y);
      ctx.stroke();

      ctx.font = "bold 9px 'Roboto Mono', monospace";
      ctx.fillStyle = colors.stationKmText;
      ctx.fillText(`${stn.km.toFixed(2)} km`, width - RIGHT_AXIS_WIDTH + 8, y + 3);

      ctx.font = stn.isMajor ? "bold 10px 'Playfair Display', Georgia, serif" : "9px 'Roboto', sans-serif";
      ctx.fillStyle = stn.isMajor ? colors.stationMajorText : colors.stationText;
      ctx.fillText(`${stn.code} - ${stn.name}`, width - RIGHT_AXIS_WIDTH + 34, y + 3);
    });

    // 11. Draw Top Time Axis Scale (Midnight to Midnight)
    ctx.fillStyle = colors.headerBg;
    ctx.fillRect(0, 0, width, TOP_AXIS_HEIGHT);

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, TOP_AXIS_HEIGHT);
    ctx.lineTo(width, TOP_AXIS_HEIGHT);
    ctx.stroke();

    for (let h = 0; h <= 24; h++) {
      const x = timeToX(h, plotWidth);
      if (x < LEFT_AXIS_WIDTH || x > width - RIGHT_AXIS_WIDTH) continue;

      let label = "";
      if (h === 0 || h === 24) label = "MIDNIGHT";
      else if (h === 12) label = "12 NOON";
      else if (h < 12) label = `${h} AM`;
      else label = `${h - 12} PM`;

      ctx.font = "bold 9px 'Roboto Mono', monospace";
      ctx.fillStyle = colors.hourText;
      const textW = ctx.measureText(label).width;
      ctx.fillText(label, x - textW / 2, TOP_AXIS_HEIGHT - 10);

      // Axis Tick
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, TOP_AXIS_HEIGHT - 6);
      ctx.lineTo(x, TOP_AXIS_HEIGHT);
      ctx.stroke();
    }

    // 12. Draw Bottom Time Axis Scale
    ctx.fillStyle = colors.headerBg;
    ctx.fillRect(0, height - BOTTOM_AXIS_HEIGHT, width, BOTTOM_AXIS_HEIGHT);

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - BOTTOM_AXIS_HEIGHT);
    ctx.lineTo(width, height - BOTTOM_AXIS_HEIGHT);
    ctx.stroke();

    for (let h = 0; h <= 24; h++) {
      const x = timeToX(h, plotWidth);
      if (x < LEFT_AXIS_WIDTH || x > width - RIGHT_AXIS_WIDTH) continue;

      let label = "";
      if (h === 0 || h === 24) label = "00:00";
      else label = `${h.toString().padStart(2, "0")}:00`;

      ctx.font = "bold 9px 'Roboto Mono', monospace";
      ctx.fillStyle = colors.hourText;
      const textW = ctx.measureText(label).width;
      ctx.fillText(label, x - textW / 2, height - 12);

      // Axis Tick
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, height - BOTTOM_AXIS_HEIGHT);
      ctx.lineTo(x, height - BOTTOM_AXIS_HEIGHT + 6);
      ctx.stroke();
    }

    // Corner Labels
    ctx.font = "bold 9px 'Roboto Mono', monospace";
    ctx.fillStyle = colors.stationKmText;
    ctx.fillText("STATIONS (DOWN: BINA ➔ ET)", 12, TOP_AXIS_HEIGHT - 12);
    ctx.fillText("STATIONS (UP: ET ➔ BINA)", width - RIGHT_AXIS_WIDTH + 12, TOP_AXIS_HEIGHT - 12);

  }, [
    dimensions,
    colors,
    kmToY,
    timeToX,
    filteredTrains,
    blocks,
    selectedTrain,
    selectedBlock,
    showScheduledPaths,
    showBlocks,
    theme,
    refTimeHour,
    referenceTimeStr,
    zoomLevel,
    panOffset,
  ]);

  // Handle Dragging (Pan)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPanOffset({
        x: Math.min(200, Math.max(-2000 * zoomLevel, e.clientX - dragStart.x)),
        y: Math.min(50, Math.max(-300, e.clientY - dragStart.y)),
      });
    }

    // Hit Testing for hover tooltip
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const plotWidth = Math.max(800, dimensions.width - LEFT_AXIS_WIDTH - RIGHT_AXIS_WIDTH);
    const plotHeight = Math.max(550, dimensions.height - TOP_AXIS_HEIGHT - BOTTOM_AXIS_HEIGHT);

    // Check train beacon or line trajectory hits
    let hitTrain: LiveRailwayTrain | null = null;
    for (const t of filteredTrains) {
      if (t.historicalPositions && t.historicalPositions.length > 0) {
        const latest = t.historicalPositions[t.historicalPositions.length - 1];
        const bx = timeToX(latest.time_float, plotWidth);
        const by = kmToY(latest.km, plotHeight);

        if (Math.hypot(mouseX - bx, mouseY - by) <= 14) {
          hitTrain = t;
          break;
        }

        // Check distance to historical trajectory segments
        for (let i = 0; i < t.historicalPositions.length - 1; i++) {
          const p1 = t.historicalPositions[i];
          const p2 = t.historicalPositions[i + 1];
          const x1 = timeToX(p1.time_float, plotWidth);
          const y1 = kmToY(p1.km, plotHeight);
          const x2 = timeToX(p2.time_float, plotWidth);
          const y2 = kmToY(p2.km, plotHeight);

          if (distToSegment(mouseX, mouseY, x1, y1, x2, y2) <= 8) {
            hitTrain = t;
            break;
          }
        }
        if (hitTrain) break;
      }

      // Check distance to scheduled path segments if visible
      if (showScheduledPaths && t.scheduledPath && t.scheduledPath.length > 1) {
        for (let i = 0; i < t.scheduledPath.length - 1; i++) {
          const p1 = t.scheduledPath[i];
          const p2 = t.scheduledPath[i + 1];
          const x1 = timeToX(p1.time_float, plotWidth);
          const y1 = kmToY(p1.km, plotHeight);
          const x2 = timeToX(p2.time_float, plotWidth);
          const y2 = kmToY(p2.km, plotHeight);

          if (distToSegment(mouseX, mouseY, x1, y1, x2, y2) <= 6) {
            hitTrain = t;
            break;
          }
        }
        if (hitTrain) break;
      }
    }

    if (hitTrain) {
      setHoveredItem({
        type: "train",
        data: hitTrain,
        screenX: e.clientX,
        screenY: e.clientY,
      });
      return;
    }

    // Check block hits
    let hitBlock: BlockData | null = null;
    if (showBlocks) {
      for (const b of blocks) {
        if (b.status === "PLANNED" || b.approval_status === "DRAFT") continue;
        if (!["PROPOSED", "PENDING_APPROVAL", "APPROVED", "SANCTIONED", "ACTIVE", "COMPLETED", "SELECTED"].includes(b.status)) continue;
        if (selectedDate) {
          const bDate = b.execution_date || b.scheduled_date || b.date;
          if (bDate && bDate !== selectedDate) continue;
        }
        const startParts = (b.requested_start_time || "10:00").split(":").map(Number);
        const endParts = (b.requested_end_time || "12:00").split(":").map(Number);
        const sh = (startParts[0] || 0) + (startParts[1] || 0) / 60;
        const eh = (endParts[0] || 0) + (endParts[1] || 0) / 60;

        const bx1 = timeToX(sh, plotWidth);
        const bx2 = timeToX(eh, plotWidth);
        const centerKm = b.location_km || 138;
        const by1 = kmToY(centerKm - 4, plotHeight);
        const by2 = kmToY(centerKm + 4, plotHeight);

        if (mouseX >= bx1 && mouseX <= bx2 && mouseY >= by1 && mouseY <= by2) {
          hitBlock = b;
          break;
        }
      }
    }

    if (hitBlock) {
      setHoveredItem({
        type: "block",
        data: hitBlock,
        screenX: e.clientX,
        screenY: e.clientY,
      });
      return;
    }

    setHoveredItem(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredItem?.type === "train") {
      onSelectTrain(hoveredItem.data);
      onSelectBlock(null);
    } else if (hoveredItem?.type === "block") {
      onSelectBlock(hoveredItem.data);
      onSelectTrain(null);
    } else {
      onSelectTrain(null);
      onSelectBlock(null);
    }
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.7, Math.min(3.5, zoomLevel * zoomFactor));
    onZoomChange(newZoom);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[650px] select-none overflow-hidden font-sans">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Floating Hover Tooltip */}
      {hoveredItem && (
        <div
          className="fixed z-50 pointer-events-none p-3 rounded-lg shadow-xl text-xs backdrop-blur-md border animate-in fade-in zoom-in-95 duration-100 max-w-xs"
          style={{
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            color: colors.tooltipText,
            left: Math.min(window.innerWidth - 280, hoveredItem.screenX + 12),
            top: Math.min(window.innerHeight - 160, hoveredItem.screenY + 12),
          }}
        >
          {hoveredItem.type === "train" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 border-b pb-1 font-mono font-bold">
                <span className="text-sm font-extrabold text-blue-600">
                  {hoveredItem.data.trainDisplayName || `${hoveredItem.data.trainNumber} — ${hoveredItem.data.trainName}`}
                </span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                  {hoveredItem.data.category}
                </span>
              </div>
              <div className="font-semibold text-slate-800">{hoveredItem.data.trainName}</div>
              <div className="text-[11px] text-slate-600 flex justify-between">
                <span>Speed: <strong>{hoveredItem.data.currentSpeedKmph} km/h</strong></span>
                <span>Dir: <strong>{hoveredItem.data.direction}</strong></span>
              </div>
              <div className="text-[11px] text-slate-600">
                Location: <strong>{hoveredItem.data.previousStation} → {hoveredItem.data.nextStation}</strong> ({formatDistanceKm(hoveredItem.data.currentKm)})
              </div>
              <div className="text-[10px] text-slate-500 font-mono flex justify-between pt-1">
                <span>Delay: +{hoveredItem.data.delayMinutes}m</span>
                <span>Status: {hoveredItem.data.status}</span>
              </div>
            </div>
          )}

          {hoveredItem.type === "block" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 border-b pb-1 font-mono font-bold">
                <span className="text-xs font-black text-purple-700">{hoveredItem.data.id}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  hoveredItem.data.block_type === "SHADOW"
                    ? "bg-indigo-100 text-indigo-900 border border-indigo-300"
                    : hoveredItem.data.block_type === "EMERGENT"
                    ? "bg-rose-100 text-rose-900 border border-rose-300"
                    : hoveredItem.data.block_type === "RULING"
                    ? "bg-purple-100 text-purple-900 border border-purple-300"
                    : "bg-blue-100 text-blue-900 border border-blue-300"
                }`}>
                  {hoveredItem.data.block_type || "PLANNED"}
                </span>
              </div>
              <div className="font-semibold text-slate-800 text-[11px]">
                {hoveredItem.data.conflict_summary || hoveredItem.data.task_title || "Maintenance Possession Window"}
              </div>
              <div className="text-[11px] text-slate-600 flex justify-between font-mono">
                <span>Slot: <strong>{hoveredItem.data.requested_start_time} – {hoveredItem.data.requested_end_time}</strong> ({hoveredItem.data.duration_mins}m)</span>
                {hoveredItem.data.execution_date && (
                  <span className="text-amber-800 font-bold">{hoveredItem.data.execution_date}</span>
                )}
              </div>
              <div className="text-[11px] text-slate-600">
                Location: <strong>{formatDistanceKm(hoveredItem.data.location_km)}</strong> · Track: <strong>{hoveredItem.data.track_name}</strong>
              </div>
              <div className="text-[11px] text-slate-600">
                Departments: <strong>{hoveredItem.data.participating_departments || hoveredItem.data.department_id || "PWAY"}</strong>
              </div>
              {hoveredItem.data.tasks && hoveredItem.data.tasks.length > 0 && (
                <div className="text-[10px] text-slate-700 font-mono pt-1 border-t border-slate-200 mt-1 space-y-0.5">
                  <span className="font-bold block text-slate-800">
                    Coordinated Tasks ({hoveredItem.data.tasks.length}):
                  </span>
                  {hoveredItem.data.tasks.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-[9px] bg-slate-50 px-1 py-0.5 rounded">
                      <span className="font-semibold truncate max-w-[170px]">{t.department_id}: {t.title || t.id}</span>
                      <span className="text-emerald-700 font-bold">{t.priority || "HIGH"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
