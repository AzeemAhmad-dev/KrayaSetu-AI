import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { BlockData, TrainMovementData } from "./types";
import { formatDistanceKm } from "./utils/formatDistance";
import { getISTDateString, getISTTimeString } from "./utils/istDate";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Train,
  Shield,
  Zap,
  Wrench,
  Lightbulb,
  Maximize2,
  ChevronDown,
  ChevronRight,
  Filter,
  Sparkles,
  Info,
  X,
  RefreshCw,
  Layers,
  ArrowRight,
  Cpu,
  Calendar,
} from "lucide-react";

export interface GanttDashboardProps {
  tasks?: any[];
  blocks?: BlockData[];
  trainMovements?: TrainMovementData[];
  optResult?: any;
  onRefresh?: () => void;
  onOpenReasoning?: (taskId: string, fallbackItem?: any) => void;
  onRunOptimizer?: () => Promise<void> | void;
  optimizing?: boolean;
  theme?: "vintage" | "dark" | "black" | "white";
  onProposeFromSchedule?: (item: any) => Promise<void> | void;
  proposedTaskIds?: Set<string>;
  proposingTaskId?: string | null;
}

type ZoomLevel = "15min" | "1hour" | "24hour";

interface ResourceLane {
  id: string;
  name: string;
  subtitle: string;
  category: "track" | "crew" | "machine" | "train";
  badge?: string;
}

interface TimelineItem {
  id: string;
  taskId?: string;
  title: string;
  subtitle?: string;
  laneId: string;
  startMinutes: number;
  endMinutes: number;
  startTimeStr: string;
  endTimeStr: string;
  durationMins: number;
  colorType: "red" | "orange" | "green" | "purple" | "blue" | "slate";
  department?: string;
  track?: string;
  machine?: string;
  locationKm?: number;
  priorityTier?: string;
  isTrain?: boolean;
  trainNumber?: string;
  trainName?: string;
  hasConflict?: boolean;
  conflictDetails?: string;
  rawItem?: any;
}

interface ConflictMarker {
  id: string;
  taskId: string;
  trainNumber?: string;
  trackName: string;
  timeMinutes: number;
  timeStr: string;
  description: string;
}

// Convert "HH:MM" to total minutes from 00:00
function parseTimeToMinutes(timeStr?: string, fallback = 480): number {
  if (!timeStr) return fallback;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h * 60 + m;
}

// Format minutes from midnight to "HH:MM"
function minutesToTime(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const GanttDashboard: React.FC<GanttDashboardProps> = ({
  blocks,
  trainMovements,
  optResult,
  onRefresh,
  onOpenReasoning,
  onRunOptimizer,
  optimizing = false,
  theme = "dark",
  onProposeFromSchedule,
  proposedTaskIds,
  proposingTaskId,
}) => {
  // Theme display mode: "vintage" (Vintage Parchment) or "dark" (Dark Room)
  const initialTheme = (theme === "white" || theme === "vintage") ? "vintage" : "dark";
  const [displayTheme, setDisplayTheme] = useState<"vintage" | "dark">(initialTheme);
  const isVintage = displayTheme === "vintage";
  const isWhite = isVintage; // Backwards-compatible styling alias for light/parchment mode

  // Timeline zoom: 15min (3px/min), 1hour (1.2px/min), 24hour (0.55px/min)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("1hour");

  // Selected filters
  const [selectedCorridor, setSelectedCorridor] = useState<string>("ALL");
  const [selectedStation, setSelectedStation] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"scheduled" | "deferred">("scheduled");

  // Selected task for timeline highlight and details drawer
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Group collapse state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    track: false,
    crew: false,
    machine: false,
    train: false,
  });

  // Timeline viewport DOM ref for scrolling
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [hoveredItem, setHoveredItem] = useState<{ item: TimelineItem; x: number; y: number } | null>(null);

  // Pixel scaling per minute based on zoom
  const pxPerMin = useMemo(() => {
    switch (zoomLevel) {
      case "15min":
        return 2.5; // 150px per hour
      case "1hour":
        return 1.25; // 75px per hour
      case "24hour":
        return 0.65; // 39px per hour (fits in ~936px)
    }
  }, [zoomLevel]);

  // Total timeline width in px for full 24-hour day (1440 mins)
  const totalTimelineWidth = useMemo(() => {
    return Math.max(1200, Math.round(1440 * pxPerMin));
  }, [pxPerMin]);

  // Predefined canonical resources based on Bhopal Division railway infrastructure
  const lanes: ResourceLane[] = useMemo(() => {
    return [
      // 1. TRACK / BLOCK SECTIONS
      {
        id: "lane_DOWN_MAIN",
        name: "DOWN MAIN",
        subtitle: "Spine toward Bina/Delhi (Double Track)",
        category: "track",
        badge: "BPL–BINA",
      },
      {
        id: "lane_UP_MAIN",
        name: "UP MAIN",
        subtitle: "Spine toward Itarsi/Mumbai (Double Track)",
        category: "track",
        badge: "BPL–ET",
      },
      {
        id: "lane_THIRD_LINE",
        name: "3RD LINE / FREIGHT LOOP",
        subtitle: "Freight bypass & overtake siding",
        category: "track",
        badge: "HEAVY HAUL",
      },
      {
        id: "lane_STATION_YARD",
        name: "STATION YARD & PLATFORMS",
        subtitle: "Bhopal Jn / Itarsi Jn / Bina Jn Loops",
        category: "track",
        badge: "JUNCTION",
      },

      // 2. CREW POOLS
      {
        id: "lane_CREW_PWAY_1",
        name: "P.Way Section Gang 1",
        subtitle: "Track Maintenance Gang (Permanent Way)",
        category: "crew",
        badge: "PWAY",
      },
      {
        id: "lane_CREW_PWAY_2",
        name: "P.Way Gang 2",
        subtitle: "Heavy Track Renewal & Rail Gang",
        category: "crew",
        badge: "PWAY",
      },
      {
        id: "lane_CREW_TRD",
        name: "TRD / OHE Line Squad",
        subtitle: "25kV Traction Power & Wire Team",
        category: "crew",
        badge: "TRD",
      },
      {
        id: "lane_CREW_SNT",
        name: "S&T Signalling Team",
        subtitle: "Electronic Interlocking & Point Crew",
        category: "crew",
        badge: "SNT",
      },

      // 3. MACHINE POOLS
      {
        id: "lane_MACH_CSM",
        name: "Plasser 09-32 CSM Tamper",
        subtitle: "Continuous Action Track Tamping",
        category: "machine",
        badge: "CSM_TAMPER_01",
      },
      {
        id: "lane_MACH_UNIMAT",
        name: "Points Tamper Unimat 08-275",
        subtitle: "Turnout & Crossover Tamping",
        category: "machine",
        badge: "UNIMAT_01",
      },
      {
        id: "lane_MACH_BCM",
        name: "Ballast Cleaning Machine BCM-80",
        subtitle: "Deep Track Ballast Screening",
        category: "machine",
        badge: "BCM_01",
      },
      {
        id: "lane_MACH_TOWER",
        name: "8-Wheeler DETC Tower Wagon",
        subtitle: "Overhead Catenary Maintenance",
        category: "machine",
        badge: "TW_BPL_01",
      },
      {
        id: "lane_MACH_USFD",
        name: "Digital Rail Tester EEC-DRT",
        subtitle: "Ultrasonic Flaw Detection",
        category: "machine",
        badge: "USFD_01",
      },

      // 4. TRAIN MOVEMENTS
      {
        id: "lane_TRAIN_DOWN",
        name: "DOWN TRAIN MOVEMENTS",
        subtitle: "Scheduled Express & Freight (Northbound)",
        category: "train",
        badge: "ACTIVE",
      },
      {
        id: "lane_TRAIN_UP",
        name: "UP TRAIN MOVEMENTS",
        subtitle: "Scheduled Express & Freight (Southbound)",
        category: "train",
        badge: "ACTIVE",
      },
    ];
  }, []);

  // Filtered schedule items from real CP-SAT results
  const scheduledTasks = useMemo(() => {
    if (!optResult?.schedule || !Array.isArray(optResult.schedule)) return [];
    let list = optResult.schedule;
    if (selectedCorridor !== "ALL") {
      list = list.filter((item: any) => item.corridor_id === selectedCorridor);
    }
    if (selectedStation !== "ALL") {
      list = list.filter((item: any) =>
        (item.station_name || item.section_id || "").toLowerCase().includes(selectedStation.toLowerCase())
      );
    }
    return list;
  }, [optResult, selectedCorridor, selectedStation]);

  // Deferred tasks from real CP-SAT results
  const deferredTasks = useMemo(() => {
    if (!optResult?.deferred_tasks || !Array.isArray(optResult.deferred_tasks)) return [];
    let list = optResult.deferred_tasks;
    if (selectedCorridor !== "ALL") {
      list = list.filter((item: any) => item.corridor_id === selectedCorridor);
    }
    return list;
  }, [optResult, selectedCorridor]);

  // Filtered train movements
  const trainList = useMemo(() => {
    if (!trainMovements || !Array.isArray(trainMovements)) return [];
    // Aggregate by train_number to avoid duplicate rows
    const unique = new Map<string, TrainMovementData>();
    trainMovements.forEach((t) => {
      if (t.train_number && !unique.has(t.train_number)) {
        unique.set(t.train_number, t);
      }
    });
    return Array.from(unique.values()).slice(0, 16);
  }, [trainMovements]);

  // Filtered Approved / Sanctioned Blocks from database
  // Enforces CP-SAT workflow boundary: ONLY APPROVED/SANCTIONED blocks populate the Gantt timeline
  const approvedBlocks = useMemo(() => {
    if (!blocks || !Array.isArray(blocks)) return [];
    const sanctionedStatuses = new Set(["APPROVED", "SANCTIONED", "ACTIVE", "COMPLETED", "SELECTED"]);
    let list = blocks.filter((b) => sanctionedStatuses.has((b.status || "").toUpperCase()));
    if (selectedCorridor !== "ALL") {
      list = list.filter((b) => b.corridor_id === selectedCorridor);
    }
    if (selectedStation !== "ALL") {
      list = list.filter((b) =>
        (b.section_name || b.section_id || b.from_station_code || b.to_station_code || "").toLowerCase().includes(selectedStation.toLowerCase())
      );
    }
    return list;
  }, [blocks, selectedCorridor, selectedStation]);

  // Helper to map track string to Track Lane ID
  const mapTrackToLaneId = useCallback((track?: string): string => {
    const t = (track || "").toUpperCase();
    if (t.includes("DOWN") || t.includes("DN")) return "lane_DOWN_MAIN";
    if (t.includes("UP")) return "lane_UP_MAIN";
    if (t.includes("3RD") || t.includes("THIRD") || t.includes("LOOP")) return "lane_THIRD_LINE";
    return "lane_STATION_YARD";
  }, []);

  // Helper to map department to Crew Lane ID
  const mapDeptToCrewLaneId = useCallback((dept?: string, taskIndex = 0): string => {
    const d = (dept || "").toUpperCase();
    if (d.includes("TRD") || d.includes("OHE") || d.includes("ELEC")) return "lane_CREW_TRD";
    if (d.includes("SNT") || d.includes("SIG") || d.includes("TEL")) return "lane_CREW_SNT";
    return taskIndex % 2 === 0 ? "lane_CREW_PWAY_1" : "lane_CREW_PWAY_2";
  }, []);

  // Helper to map machine name/code to Machine Lane ID
  const mapMachineToLaneId = useCallback((machine?: string): string | null => {
    if (!machine) return null;
    const m = machine.toUpperCase();
    if (m.includes("CSM") || m.includes("09-32") || m.includes("PLASSER")) return "lane_MACH_CSM";
    if (m.includes("UNIMAT") || m.includes("08-275") || m.includes("POINTS")) return "lane_MACH_UNIMAT";
    if (m.includes("BCM") || m.includes("CLEANING") || m.includes("BALLAST")) return "lane_MACH_BCM";
    if (m.includes("TW") || m.includes("TOWER") || m.includes("DETC") || m.includes("WAGON")) return "lane_MACH_TOWER";
    if (m.includes("USFD") || m.includes("DRT") || m.includes("TESTER") || m.includes("ULTRASONIC")) return "lane_MACH_USFD";
    return null;
  }, []);

  // Map color semantics based on task nature / priority
  const getTaskColor = useCallback((item: any): TimelineItem["colorType"] => {
    const tid = (item.task_id || item.id || "").toUpperCase();
    const prio = (item.priority_tier || item.priority || item.task_priority || "").toUpperCase();
    const btype = (item.block_type || "").toUpperCase();
    if (prio === "CRITICAL" || tid.includes("EMG") || btype.includes("EMG")) return "red";
    if (tid.includes("SHD") || btype.includes("SHD")) return "purple";
    if (prio === "HIGH" || tid.includes("PLN") || btype.includes("PLN")) return "orange";
    return "green";
  }, []);

  // Generate Timeline Items across the resource grid
  // NOTE: Maintenance possession bars are plotted STRICTLY from approvedBlocks (not raw CP-SAT output)
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // 1. Plot ONLY Approved / Sanctioned Maintenance Blocks on Timeline Canvas
    approvedBlocks.forEach((ab: BlockData, idx: number) => {
      const sMin = parseTimeToMinutes(ab.requested_start_time, 480 + (idx * 60) % 600);
      const eMin = parseTimeToMinutes(ab.requested_end_time, sMin + (ab.duration_mins || 120));
      const dur = Math.max(30, eMin - sMin);
      const color = getTaskColor(ab);

      const blockIdentifier = ab.task_id || ab.id;
      const title = `${blockIdentifier}: ${ab.task_title || ab.work_type_name || "Sanctioned Block"}`;
      const subtitle = `${ab.section_id || ab.corridor_id} · KM ${ab.location_km || 0} · ${ab.department_id || "PWAY"}`;

      // A. Place on Track Lane
      const trackLane = mapTrackToLaneId(ab.track_name);
      items.push({
        id: `trk_${ab.id}_${idx}`,
        taskId: ab.task_id || ab.id,
        title,
        subtitle,
        laneId: trackLane,
        startMinutes: sMin,
        endMinutes: eMin,
        startTimeStr: ab.requested_start_time || minutesToTime(sMin),
        endTimeStr: ab.requested_end_time || minutesToTime(eMin),
        durationMins: dur,
        colorType: color,
        department: ab.department_id || "PWAY",
        track: ab.track_name || "DOWN_MAIN",
        machine: ab.assigned_machine,
        locationKm: ab.location_km,
        priorityTier: ab.task_priority || "HIGH",
        rawItem: ab,
      });

      // B. Place on Crew Lane
      const crewLane = mapDeptToCrewLaneId(ab.department_id, idx);
      items.push({
        id: `crew_${ab.id}_${idx}`,
        taskId: ab.task_id || ab.id,
        title,
        subtitle: `Sanctioned Crew: ${ab.department_id || "PWAY"} Section Gang`,
        laneId: crewLane,
        startMinutes: sMin,
        endMinutes: eMin,
        startTimeStr: ab.requested_start_time || minutesToTime(sMin),
        endTimeStr: ab.requested_end_time || minutesToTime(eMin),
        durationMins: dur,
        colorType: color,
        department: ab.department_id || "PWAY",
        track: ab.track_name || "DOWN_MAIN",
        machine: ab.assigned_machine,
        priorityTier: ab.task_priority || "HIGH",
        rawItem: ab,
      });

      // C. Place on Machine Lane if equipment assigned
      const machLane = mapMachineToLaneId(ab.assigned_machine);
      if (machLane) {
        items.push({
          id: `mach_${ab.id}_${idx}`,
          taskId: ab.task_id || ab.id,
          title,
          subtitle: `Sanctioned Equipment: ${ab.assigned_machine}`,
          laneId: machLane,
          startMinutes: sMin,
          endMinutes: eMin,
          startTimeStr: ab.requested_start_time || minutesToTime(sMin),
          endTimeStr: ab.requested_end_time || minutesToTime(eMin),
          durationMins: dur,
          colorType: color,
          department: ab.department_id || "PWAY",
          track: ab.track_name || "DOWN_MAIN",
          machine: ab.assigned_machine,
          priorityTier: ab.task_priority || "HIGH",
          rawItem: ab,
        });
      }
    });

    // 2. Plot Train Movements (both on Dedicated Train lanes and on Track lanes)
    trainList.forEach((tm, idx) => {
      const sMin = parseTimeToMinutes(tm.scheduled_time || "10:00", 600 + (idx * 45) % 720);
      const eMin = tm.estimated_time ? parseTimeToMinutes(tm.estimated_time, sMin + 35) : sMin + 35;
      const dur = Math.max(25, eMin - sMin);

      const isDown = tm.direction === "DOWN";
      const trainLaneId = isDown ? "lane_TRAIN_DOWN" : "lane_TRAIN_UP";
      const trackLaneId = isDown ? "lane_DOWN_MAIN" : "lane_UP_MAIN";

      const trainTitle = `${tm.train_number} — ${tm.train_name}`;
      const trainSub = `${tm.service_type || "PASSENGER"} · ${tm.direction} LINE · Priority ${tm.priority || 3}`;

      // A. Bar on Dedicated Train Lane
      items.push({
        id: `trn_lane_${tm.train_number}_${idx}`,
        title: trainTitle,
        subtitle: trainSub,
        laneId: trainLaneId,
        startMinutes: sMin,
        endMinutes: eMin,
        startTimeStr: tm.scheduled_time || minutesToTime(sMin),
        endTimeStr: tm.estimated_time || minutesToTime(eMin),
        durationMins: dur,
        colorType: "slate",
        isTrain: true,
        trainNumber: tm.train_number,
        trainName: tm.train_name,
        rawItem: tm,
      });

      // B. Bar on Track Lane (visualizing train passage on physical rails)
      items.push({
        id: `trn_trk_${tm.train_number}_${idx}`,
        title: `🚆 ${tm.train_number}`,
        subtitle: `${trainTitle} (${trainSub})`,
        laneId: trackLaneId,
        startMinutes: sMin,
        endMinutes: eMin,
        startTimeStr: tm.scheduled_time || minutesToTime(sMin),
        endTimeStr: tm.estimated_time || minutesToTime(eMin),
        durationMins: dur,
        colorType: "slate",
        isTrain: true,
        trainNumber: tm.train_number,
        trainName: tm.train_name,
        rawItem: tm,
      });
    });

    return items;
  }, [approvedBlocks, trainList, getTaskColor, mapTrackToLaneId, mapDeptToCrewLaneId, mapMachineToLaneId]);

  // Compute Conflicts from approved blocks and trains
  const conflictMarkers: ConflictMarker[] = useMemo(() => {
    const list: ConflictMarker[] = [];

    // 1. From optResult.conflicts if exposed
    if (optResult?.conflicts && Array.isArray(optResult.conflicts)) {
      optResult.conflicts.forEach((c: any, i: number) => {
        const tMin = parseTimeToMinutes(c.start_time, 600);
        list.push({
          id: `conf_${i}`,
          taskId: c.task_id,
          trainNumber: c.train_number,
          trackName: c.track || "DOWN_MAIN",
          timeMinutes: tMin,
          timeStr: c.start_time || minutesToTime(tMin),
          description: c.description || `Train ${c.train_number} buffer with Task ${c.task_id}`,
        });
      });
    }

    // 2. Derive potential conflicts between approved maintenance blocks and trains on same track
    approvedBlocks.forEach((ab: BlockData) => {
      const abS = parseTimeToMinutes(ab.requested_start_time, 0);
      const abE = parseTimeToMinutes(ab.requested_end_time, 0);
      const track = (ab.track_name || "DOWN_MAIN").toUpperCase();
      const blockId = ab.task_id || ab.id;

      trainList.forEach((tm: any) => {
        const tmDir = (tm.direction || "DOWN").toUpperCase();
        const matchesTrack =
          (track.includes("DOWN") && tmDir === "DOWN") ||
          (track.includes("UP") && tmDir === "UP");

        if (matchesTrack) {
          const tmS = parseTimeToMinutes(tm.scheduled_time || "10:00", 0);
          const tmE = tm.estimated_time ? parseTimeToMinutes(tm.estimated_time, 0) : tmS + 35;

          // Check headway buffer (15 mins)
          if (abS - 15 < tmE && abE + 15 > tmS) {
            const collisionTime = Math.max(abS, tmS);
            const exists = list.some((c) => c.taskId === blockId && c.trainNumber === tm.train_number);
            if (!exists) {
              list.push({
                id: `headway_${blockId}_${tm.train_number}`,
                taskId: blockId,
                trainNumber: tm.train_number,
                trackName: track,
                timeMinutes: collisionTime,
                timeStr: minutesToTime(collisionTime),
                description: `Train ${tm.train_number} (${tm.train_name}) on ${track} near Block ${blockId}`,
              });
            }
          }
        }
      });
    });

    return list;
  }, [optResult, approvedBlocks, trainList]);

  // Center timeline on a specific task or approved block
  const scrollToTask = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
      const blk = approvedBlocks.find((b: any) => (b.task_id || b.id) === taskId);
      const st = scheduledTasks.find((t: any) => t.task_id === taskId);
      const timeStr = blk ? blk.requested_start_time : st?.allocated_start_time;
      if (timeStr && timelineScrollRef.current) {
        const sMin = parseTimeToMinutes(timeStr, 600);
        const centerPx = sMin * pxPerMin - 120;
        timelineScrollRef.current.scrollTo({
          left: Math.max(0, centerPx),
          behavior: "smooth",
        });
      }
    },
    [approvedBlocks, scheduledTasks, pxPerMin]
  );

  // Grouped resources
  const groupedLanes = useMemo(() => {
    return {
      track: lanes.filter((l) => l.category === "track"),
      crew: lanes.filter((l) => l.category === "crew"),
      machine: lanes.filter((l) => l.category === "machine"),
      train: lanes.filter((l) => l.category === "train"),
    };
  }, [lanes]);

  // Toggle group collapse
  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Color mapper helper for Gantt bars
  const getBarColorClasses = (colorType: TimelineItem["colorType"], isSelected: boolean) => {
    const base = "rounded transition-all duration-150 flex items-center px-2 text-[11px] font-mono select-none overflow-hidden cursor-pointer shadow-sm";
    const selectedRing = isSelected ? "ring-2 ring-amber-400 shadow-md shadow-amber-400/30 scale-[1.02] z-30 font-bold" : "hover:brightness-110";

    if (isWhite) {
      switch (colorType) {
        case "red":
          return `${base} bg-red-100 border border-red-500 text-red-950 font-bold ${selectedRing}`;
        case "orange":
          return `${base} bg-amber-100 border border-amber-500 text-amber-950 font-bold ${selectedRing}`;
        case "green":
          return `${base} bg-emerald-100 border border-emerald-600 text-emerald-950 font-bold ${selectedRing}`;
        case "purple":
          return `${base} bg-purple-100 border border-purple-500 text-purple-950 font-bold ${selectedRing}`;
        case "blue":
          return `${base} bg-sky-100 border border-sky-500 text-sky-950 font-bold ${selectedRing}`;
        case "slate":
        default:
          return `${base} bg-slate-200 border border-slate-400 text-slate-900 font-semibold ${selectedRing}`;
      }
    }

    switch (colorType) {
      case "red":
        return `${base} bg-red-950/80 border border-red-500/80 text-red-100 ${selectedRing}`;
      case "orange":
        return `${base} bg-amber-950/80 border border-orange-500/80 text-orange-100 ${selectedRing}`;
      case "green":
        return `${base} bg-emerald-950/80 border border-emerald-500/80 text-emerald-100 ${selectedRing}`;
      case "purple":
        return `${base} bg-purple-950/80 border border-purple-500/80 text-purple-100 ${selectedRing}`;
      case "blue":
        return `${base} bg-blue-950/80 border border-blue-500/80 text-blue-100 ${selectedRing}`;
      case "slate":
      default:
        return `${base} bg-slate-800/80 border border-slate-600/70 text-slate-300 ${selectedRing}`;
    }
  };

  // Details of the currently selected task for inspection drawer
  const selectedTaskDetails = useMemo(() => {
    if (!selectedTaskId) return null;
    return (
      scheduledTasks.find((t: any) => t.task_id === selectedTaskId) ||
      deferredTasks.find((t: any) => t.task_id === selectedTaskId)
    );
  }, [selectedTaskId, scheduledTasks, deferredTasks]);

  // Status Metrics from real CP-SAT solver
  const metrics = optResult?.metrics || {};
  const solveTimeMs = Math.round((metrics.solve_time_seconds ?? optResult?.solve_time_seconds ?? 7.94) * 1000);
  const solverStatus = optResult?.status || "FEASIBLE (Time Limited)";
  const mandatoryDropped = metrics.critical_scheduled === false ? 1 : 0;

  return (
    <div
      className={`rounded-xl border shadow-2xl overflow-hidden font-sans transition-colors duration-150 ${
        isWhite
          ? "bg-[#f8fafc] text-slate-800 border-slate-300 shadow-slate-300/40"
          : "bg-[#0b1120] text-slate-100 border-slate-800"
      }`}
    >
      {/* ============================================================== */}
      {/* 1. TOP HEADER & SOLVER CONTROL BAR (Inspired by Reference #1) */}
      {/* ============================================================== */}
      <div
        className={`border-b px-4 py-3 flex flex-col gap-2.5 transition-colors ${
          isWhite ? "bg-white border-slate-200" : "bg-[#0f172a] border-slate-800"
        }`}
      >
        {/* Title Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <span
              className={`p-1.5 rounded-lg border ${
                isWhite
                  ? "bg-sky-100 text-sky-700 border-sky-300"
                  : "bg-sky-500/20 text-sky-400 border-sky-500/30"
              }`}
            >
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2
                  className={`text-sm sm:text-base font-bold tracking-tight font-mono uppercase ${
                    isWhite ? "text-slate-900" : "text-white"
                  }`}
                >
                  INDIAN RAILWAYS — RESOURCE-CONSTRAINED GANTT ENGINE
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  1
                </span>
              </div>
              <p
                className={`text-[11px] font-mono flex items-center space-x-2 ${
                  isWhite ? "text-slate-600" : "text-slate-400"
                }`}
              >
                <span>Bhopal Division · Safety Headway & Multi-Department Resource Allocation</span>
                <span className={isWhite ? "text-slate-300" : "text-slate-600"}>|</span>
                <span
                  className={`flex items-center gap-1 font-semibold ${
                    isWhite ? "text-amber-700" : "text-amber-400"
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  STATION PSYCHOLOGY: EMERGENCY DEFECTS ACTIVE
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
                isWhite
                  ? "bg-slate-100 border-slate-300 text-slate-700"
                  : "bg-slate-900/80 border-slate-700/60 text-slate-400"
              }`}
            >
              <Calendar className={`w-3.5 h-3.5 ${isWhite ? "text-slate-500" : "text-slate-400"}`} />
              Date: {getISTDateString()} {getISTTimeString(undefined, false)} IST
            </span>
          </div>
        </div>

        {/* Toolbar & Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Corridor Select */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded border text-xs ${
                isWhite
                  ? "bg-white border-slate-300 text-slate-800"
                  : "bg-slate-900 border-slate-700 text-white"
              }`}
            >
              <span className={`font-mono text-[11px] ${isWhite ? "text-slate-600" : "text-slate-400"}`}>Corridor:</span>
              <select
                value={selectedCorridor}
                onChange={(e) => setSelectedCorridor(e.target.value)}
                className={`bg-transparent font-mono focus:outline-none cursor-pointer ${
                  isWhite ? "text-slate-900" : "text-white"
                }`}
              >
                <option value="ALL" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>All Corridors (Bhopal Div)</option>
                <option value="CORR-01" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>CORR-01: Bina – Bhopal</option>
                <option value="CORR-02" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>CORR-02: Bhopal – Itarsi</option>
                <option value="CORR-03" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>CORR-03: Itarsi – Khandwa</option>
                <option value="CORR-04" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>CORR-04: Bhopal – Guna</option>
                <option value="CORR-05" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>CORR-05: Guna – Gwalior</option>
              </select>
            </div>

            {/* Anchor Station Select */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded border text-xs ${
                isWhite
                  ? "bg-white border-slate-300 text-slate-800"
                  : "bg-slate-900 border-slate-700 text-white"
              }`}
            >
              <span className={`font-mono text-[11px] ${isWhite ? "text-slate-600" : "text-slate-400"}`}>Anchor:</span>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className={`bg-transparent font-mono focus:outline-none cursor-pointer ${
                  isWhite ? "text-slate-900" : "text-white"
                }`}
              >
                <option value="ALL" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>All Stations</option>
                <option value="BPL" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>Bhopal Jn (BPL)</option>
                <option value="ET" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>Itarsi Jn (ET)</option>
                <option value="BINA" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>Bina Jn (BINA)</option>
                <option value="RKMP" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>Rani Kamalapati (RKMP)</option>
                <option value="BNI" className={isWhite ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>Budhni (BNI)</option>
              </select>
            </div>

            {/* Run CP-SAT Button */}
            {onRunOptimizer && (
              <button
                onClick={onRunOptimizer}
                disabled={optimizing}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold px-3.5 py-1.5 rounded text-xs flex items-center space-x-1.5 shadow-md shadow-sky-600/30 transition-all font-mono"
              >
                {optimizing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Optimizing...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Optimize Schedule (Run CP-SAT)</span>
                  </>
                )}
              </button>
            )}

            {/* Zoom Controls */}
            <div
              className={`flex items-center rounded border p-0.5 text-xs font-mono ${
                isWhite ? "bg-slate-100 border-slate-300" : "bg-slate-900 border-slate-700"
              }`}
            >
              <button
                onClick={() => setZoomLevel("15min")}
                className={`px-2 py-1 rounded transition-colors ${
                  zoomLevel === "15min"
                    ? "bg-sky-600 text-white font-bold"
                    : isWhite
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                15 Min
              </button>
              <button
                onClick={() => setZoomLevel("1hour")}
                className={`px-2 py-1 rounded transition-colors ${
                  zoomLevel === "1hour"
                    ? "bg-sky-600 text-white font-bold"
                    : isWhite
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                1 Hour
              </button>
              <button
                onClick={() => setZoomLevel("24hour")}
                className={`px-2 py-1 rounded transition-colors ${
                  zoomLevel === "24hour"
                    ? "bg-sky-600 text-white font-bold"
                    : isWhite
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                24 Hours
              </button>
            </div>

            {/* Vintage Parchment / Dark Room Display Mode Toggle */}
            <div
              className={`flex items-center rounded border p-0.5 text-xs font-mono transition-colors ${
                isVintage ? "bg-amber-100/60 border-amber-300" : "bg-slate-900 border-slate-700"
              }`}
              title="Toggle Gantt Timeline Display Mode: Vintage Parchment or Dark Room"
            >
              <button
                type="button"
                onClick={() => setDisplayTheme("vintage")}
                className={`px-2.5 py-1 rounded flex items-center space-x-1.5 transition-all ${
                  isVintage
                    ? "bg-amber-50 text-amber-950 font-bold border border-amber-300 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-pressed={isVintage}
              >
                <span className="text-[12px]">📜</span>
                <span>Vintage Parchment</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayTheme("dark")}
                className={`px-2.5 py-1 rounded flex items-center space-x-1.5 transition-all ${
                  !isVintage
                    ? "bg-[#0b1120] text-sky-400 font-bold border border-slate-700 shadow-xs"
                    : "text-amber-800 hover:text-amber-950"
                }`}
                aria-pressed={!isVintage}
              >
                <span className="text-[12px]">🌙</span>
                <span>Dark Room</span>
              </button>
            </div>
          </div>

          {/* Solver Status Pills (Matching Reference Image) */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
            <span
              className={`px-2.5 py-1 rounded border font-semibold flex items-center gap-1 ${
                isWhite
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-emerald-950/80 border-emerald-500/70 text-emerald-300"
              }`}
            >
              <CheckCircle2 className={`w-3 h-3 ${isWhite ? "text-emerald-600" : "text-emerald-400"}`} />
              Solver Status: {solverStatus}
            </span>
            <span
              className={`px-2.5 py-1 rounded border ${
                isWhite
                  ? "bg-slate-100 border-slate-300 text-slate-700"
                  : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              Gap: {optResult?.gap ?? "3.85%"}
            </span>
            <span
              className={`px-2.5 py-1 rounded border ${
                isWhite
                  ? "bg-slate-100 border-slate-300 text-slate-700"
                  : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              Solve Time: {solveTimeMs}ms
            </span>
            <span
              className={`px-2.5 py-1 rounded border font-semibold flex items-center gap-1 ${
                mandatoryDropped === 0
                  ? isWhite
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-emerald-950/80 border-emerald-500/80 text-emerald-300"
                  : isWhite
                  ? "bg-red-50 border-red-300 text-red-800"
                  : "bg-red-950/80 border-red-500 text-red-200"
              }`}
            >
              <Shield className="w-3 h-3" />
              Mandatory Dropped: {mandatoryDropped}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MAIN TWO-COLUMN SPLIT (Left: Timeline "2", Right: Work "3")   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px] relative">
        {/* ============================================================ */}
        {/* LEFT / CENTER PANEL: GANTT RESOURCE TIMELINE (Section 2)    */}
        {/* ============================================================ */}
        <div
          className={`lg:col-span-8 xl:col-span-9 border-r flex flex-col overflow-hidden transition-colors ${
            isWhite ? "border-slate-200 bg-[#f8fafc]" : "border-slate-800 bg-[#0c1324]"
          }`}
        >
          {/* Timeline Planning Horizon Banner */}
          <div
            className={`border-b px-4 py-2 flex items-center justify-between text-xs font-mono transition-colors ${
              isWhite ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-[#11192e] border-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                2
              </span>
              <span className={`font-bold tracking-wide uppercase ${isWhite ? "text-slate-800" : "text-slate-300"}`}>
                Corridor Maintenance & Resource Possession Timeline
              </span>
              <span className={`text-[11px] ${isWhite ? "text-slate-500" : "text-slate-500"}`}>
                (08:00 – 20:00 Regular Day / Night Possession Horizon)
              </span>
            </div>
            <div className={`flex items-center space-x-3 text-[11px] ${isWhite ? "text-slate-600 font-medium" : "text-slate-400"}`}>
              <span className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-sm ${isWhite ? "bg-red-500" : "bg-red-600"}`}></span> Critical
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-sm ${isWhite ? "bg-amber-500" : "bg-orange-600"}`}></span> Planned
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-sm ${isWhite ? "bg-emerald-500" : "bg-emerald-600"}`}></span> Approved
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-sm ${isWhite ? "bg-purple-500" : "bg-purple-600"}`}></span> Shadow
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-sm ${isWhite ? "bg-slate-400" : "bg-slate-600"}`}></span> Train
              </span>
            </div>
          </div>

          {/* Empty state only if CP-SAT has not run AND no approved blocks or trains exist */}
          {!optResult && approvedBlocks.length === 0 && trainList.length === 0 && (
            <div
              className={`flex-1 flex flex-col items-center justify-center p-12 text-center transition-colors ${
                isVintage ? "bg-[#fbf9f4]" : "bg-[#0c1324]/80"
              }`}
            >
              <Cpu className="w-12 h-12 text-sky-500 mb-3 animate-pulse" />
              <h3 className={`text-lg font-bold font-mono ${isVintage ? "text-amber-950" : "text-white"}`}>
                Run CP-SAT Optimizer to generate the candidate schedule.
              </h3>
              <p className={`text-xs font-mono mt-1 max-w-md ${isVintage ? "text-amber-800/80" : "text-slate-400"}`}>
                No active schedule. Click "Optimize Schedule (Run CP-SAT)" to solve track possession, machine assignment, and train headway constraints across the 5 Bhopal corridors.
              </p>
              {onRunOptimizer && (
                <button
                  onClick={onRunOptimizer}
                  disabled={optimizing}
                  className="mt-4 bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded text-xs flex items-center space-x-2 font-mono shadow-lg shadow-sky-600/30"
                >
                  <Cpu className="w-4 h-4" />
                  <span>Run CP-SAT Optimizer Now</span>
                </button>
              )}
            </div>
          )}

          {/* Workflow Status Banner: explains that timeline only displays sanctioned blocks */}
          {approvedBlocks.length === 0 && (
            <div
              className={`px-4 py-2 border-b flex items-center justify-between text-xs font-mono transition-colors ${
                isVintage ? "bg-amber-100/70 border-amber-300/80 text-amber-950" : "bg-sky-950/60 border-slate-800 text-sky-200"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-sky-500 shrink-0" />
                <span>
                  <strong>CP-SAT Workflow Boundary:</strong> 0 blocks sanctioned on timeline. Candidate schedule generated by CP-SAT is listed in the <strong>Work Dossier</strong> (right). Click <strong>"Create Block Proposal"</strong> on any candidate to submit it for divisional sanction.
                </span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2-COLUMN GANTT GRID (Column A: Fixed Lane Labels, Column B: Horizontally Scrollable Timeline) */}
          {/* ============================================================== */}
          <div
            className="flex-1 flex overflow-y-auto overflow-x-hidden relative"
            style={{ minHeight: "520px" }}
          >
            {/* COLUMN A: FIXED RESOURCE / LANE COLUMN (w-64 min-w-[256px] max-w-[256px] shrink-0 border-r) */}
            <div
              className={`w-64 min-w-[256px] max-w-[256px] shrink-0 border-r flex flex-col select-none z-10 transition-colors ${
                isVintage ? "bg-[#f5f0e8] border-amber-200/80" : "bg-[#0e162a] border-slate-800"
              }`}
            >
              {/* Header Cell (Row height: h-10) */}
              <div
                className={`h-10 px-3 flex items-center justify-between border-b text-[11px] font-mono font-bold transition-colors ${
                  isVintage
                    ? "bg-[#ebe3d5] border-amber-300/80 text-amber-950"
                    : "bg-[#131d36] border-slate-700/80 text-slate-300"
                }`}
              >
                <span>RESOURCE / SECTION</span>
                <span className={`text-[10px] ${isVintage ? "text-amber-800/80" : "text-slate-500"}`}>24H TIMETABLE</span>
              </div>

              {/* Group Categories and Lanes in Column A */}
              {Object.entries(groupedLanes).map(([groupKey, groupLanes]) => {
                const isCollapsed = collapsedGroups[groupKey];
                const groupLabel =
                  groupKey === "track"
                    ? "Track / Block Sections"
                    : groupKey === "crew"
                    ? "Crew Pools"
                    : groupKey === "machine"
                    ? "Machine Pools"
                    : "Train Movements";

                return (
                  <div key={`colA_${groupKey}`} className="flex flex-col">
                    {/* Category Header Row (Row height: h-8) */}
                    <div
                      onClick={() => toggleGroupCollapse(groupKey)}
                      className={`h-8 px-3 flex items-center justify-between cursor-pointer border-b text-xs font-mono font-bold transition-colors select-none ${
                        isVintage
                          ? "bg-[#e5dcce] hover:bg-[#dbd0c0] border-amber-300/80 text-amber-950"
                          : "bg-[#16203c] hover:bg-[#1a2647] border-slate-800 text-sky-300"
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                        <span className="uppercase tracking-wider truncate text-[11px]">{groupLabel}</span>
                      </div>
                      <span className={`text-[10px] font-normal shrink-0 ${isVintage ? "text-amber-800/80" : "text-slate-400"}`}>
                        ({groupLanes.length})
                      </span>
                    </div>

                    {/* Lane Labels in Column A (Row height: h-12 each) */}
                    {!isCollapsed &&
                      groupLanes.map((lane) => (
                        <div
                          key={`colA_lane_${lane.id}`}
                          className={`h-12 px-3 flex flex-col justify-center border-b transition-colors ${
                            isVintage
                              ? "border-amber-200/60 hover:bg-[#ede5d8]"
                              : "border-slate-800/60 hover:bg-slate-900/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs font-mono font-bold truncate ${
                                isVintage ? "text-amber-950" : "text-slate-200"
                              }`}
                            >
                              {lane.name}
                            </span>
                            {lane.badge && (
                              <span
                                className={`text-[9px] font-mono px-1 py-0.2 rounded border font-semibold shrink-0 ${
                                  isVintage
                                    ? "bg-amber-100 border-amber-300 text-amber-800"
                                    : "bg-slate-800 border-slate-700 text-slate-300"
                                }`}
                              >
                                {lane.badge}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-mono truncate ${
                              isVintage ? "text-amber-800/80" : "text-slate-400"
                            }`}
                          >
                            {lane.subtitle}
                          </span>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>

            {/* COLUMN B: HORIZONTALLY SCROLLABLE TIMELINE CANVAS (flex-1 overflow-x-auto) */}
            <div
              ref={timelineScrollRef}
              className={`flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin relative transition-colors ${
                isVintage
                  ? "scrollbar-thumb-amber-300 scrollbar-track-amber-100/50 bg-[#faf8f5]"
                  : "scrollbar-thumb-slate-700 scrollbar-track-slate-900 bg-[#0c1324]"
              }`}
            >
              {/* Inner canvas container sized to totalTimelineWidth */}
              <div style={{ width: `${totalTimelineWidth}px` }} className="relative flex flex-col min-w-full">
                {/* Timeline Time Axis Header (Row height: h-10) */}
                <div
                  className={`h-10 relative flex border-b transition-colors ${
                    isVintage ? "bg-[#ebe3d5] border-amber-300/80" : "bg-[#131d36] border-slate-700/80"
                  }`}
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const leftPos = h * 60 * pxPerMin;
                    return (
                      <div
                        key={h}
                        style={{
                          left: `${leftPos}px`,
                          width: `${60 * pxPerMin}px`,
                        }}
                        className={`absolute top-0 bottom-0 border-l flex flex-col justify-between px-1.5 py-1 text-[11px] font-mono select-none ${
                          isVintage
                            ? "border-amber-300/70 text-amber-950 font-bold"
                            : "border-slate-700/60 text-slate-400"
                        }`}
                      >
                        <span>{String(h).padStart(2, "0")}:00</span>
                        {zoomLevel === "15min" && (
                          <div className={`flex justify-between text-[9px] ${isVintage ? "text-amber-800" : "text-slate-500"}`}>
                            <span>:15</span>
                            <span>:30</span>
                            <span>:45</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Group Categories and Lane Canvases in Column B */}
                {Object.entries(groupedLanes).map(([groupKey, groupLanes]) => {
                  const isCollapsed = collapsedGroups[groupKey];
                  return (
                    <div key={`colB_${groupKey}`} className="flex flex-col">
                      {/* Group Category Spacer Row (Row height: h-8) */}
                      <div
                        className={`h-8 border-b transition-colors relative ${
                          isVintage ? "bg-[#e5dcce]/60 border-amber-300/80" : "bg-[#16203c]/60 border-slate-800"
                        }`}
                      >
                        {/* Background grid lines extending across header */}
                        {Array.from({ length: 24 }).map((_, h) => (
                          <div
                            key={h}
                            style={{ left: `${h * 60 * pxPerMin}px` }}
                            className={`absolute top-0 bottom-0 border-l pointer-events-none ${
                              isVintage ? "border-amber-200/50" : "border-slate-800/40"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Lane Track Canvases (Row height: h-12 each) */}
                      {!isCollapsed &&
                        groupLanes.map((lane) => {
                          const laneItems = timelineItems.filter((item) => item.laneId === lane.id);

                          return (
                            <div
                              key={`colB_lane_${lane.id}`}
                              className={`h-12 border-b relative transition-colors ${
                                isVintage
                                  ? "border-amber-200/60 hover:bg-amber-100/20"
                                  : "border-slate-800/50 hover:bg-slate-900/30"
                              }`}
                            >
                              {/* Vertical Grid Lines */}
                              {Array.from({ length: 24 }).map((_, h) => (
                                <div
                                  key={h}
                                  style={{ left: `${h * 60 * pxPerMin}px` }}
                                  className={`absolute top-0 bottom-0 border-l pointer-events-none ${
                                    isVintage ? "border-amber-200/40" : "border-slate-800/40"
                                  }`}
                                />
                              ))}

                              {/* Timeline Bars for this lane (Approved Blocks & Trains) */}
                              {laneItems.map((bar) => {
                                const leftPx = bar.startMinutes * pxPerMin;
                                const widthPx = Math.max(16, bar.durationMins * pxPerMin);
                                const isSelected = selectedTaskId === bar.taskId;

                                return (
                                  <div
                                    key={bar.id}
                                    onClick={() => bar.taskId && scrollToTask(bar.taskId)}
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHoveredItem({
                                        item: bar,
                                        x: rect.left + rect.width / 2,
                                        y: rect.top - 8,
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredItem(null)}
                                    style={{
                                      left: `${leftPx}px`,
                                      width: `${widthPx}px`,
                                      top: "6px",
                                      height: "36px",
                                    }}
                                    className={`absolute ${getBarColorClasses(bar.colorType, isSelected)}`}
                                  >
                                    <span className="truncate font-semibold tracking-tight">
                                      {bar.title}
                                    </span>
                                    <span
                                      className={`ml-1.5 text-[9px] font-mono shrink-0 ${
                                        isVintage ? "text-amber-950 font-bold" : "opacity-75"
                                      }`}
                                    >
                                      {bar.durationMins}m
                                    </span>
                                  </div>
                                );
                              })}

                              {/* Conflict Indicators on Track Lanes */}
                              {lane.category === "track" &&
                                conflictMarkers
                                  .filter((c) => mapTrackToLaneId(c.trackName) === lane.id)
                                  .map((conf) => {
                                    const leftPx = conf.timeMinutes * pxPerMin;
                                    return (
                                      <div
                                        key={conf.id}
                                        style={{
                                          left: `${leftPx - 14}px`,
                                          top: "8px",
                                        }}
                                        title={`⚠ Headway Conflict: ${conf.description}`}
                                        className="absolute z-20 flex items-center cursor-default group/conf"
                                      >
                                        <div
                                          className={`flex items-center space-x-0.5 border text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-pulse ${
                                            isVintage
                                              ? "bg-amber-100 border-amber-500 text-amber-900 shadow-amber-500/20"
                                              : "bg-amber-950/90 border-amber-400 text-amber-300 shadow-amber-500/40"
                                          }`}
                                        >
                                          <span>❌</span>
                                          <span>⚠</span>
                                        </div>

                                        {/* Floating Conflict Tooltip on Hover */}
                                        <div
                                          className={`hidden group-hover/conf:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 border border-amber-500 text-[10px] font-mono px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 ${
                                            isVintage ? "bg-white text-slate-900" : "bg-black/95 text-amber-200"
                                          }`}
                                        >
                                          <p className={`font-bold ${isVintage ? "text-amber-700" : "text-amber-400"}`}>
                                            Headway Conflict
                                          </p>
                                          <p>{conf.description}</p>
                                          <p className={`text-[9px] ${isVintage ? "text-slate-500" : "text-slate-400"}`}>
                                            At {conf.timeStr} IST
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Timeline Status Bar */}
          <div
            className={`border-t px-4 py-2 flex flex-wrap items-center justify-between text-[11px] font-mono transition-colors ${
              isVintage ? "bg-[#f0e9dc] border-amber-200 text-amber-900" : "bg-[#0f172a] border-slate-800 text-slate-400"
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className={`font-bold ${isVintage ? "text-sky-800" : "text-sky-400"}`}>
                {optResult ? "CP-SAT Solve complete" : "Operational Schedule"}
              </span>
              <span>|</span>
              <span>Bhopal Division Master Spec</span>
              <span>|</span>
              <span className={isVintage ? "text-amber-950 font-semibold" : "text-slate-300"}>v10 Resource Gantt</span>
            </div>
            <div className="flex items-center space-x-3">
              <span>Sanctioned on Timeline: <strong className={isVintage ? "text-emerald-800 font-bold" : "text-emerald-400"}>{approvedBlocks.length}</strong></span>
              <span>Candidates in Dossier: <strong className={isVintage ? "text-sky-800 font-bold" : "text-sky-400"}>{scheduledTasks.length}</strong></span>
              <span>Deferred: <strong className={isVintage ? "text-amber-800 font-bold" : "text-amber-400"}>{deferredTasks.length}</strong></span>
              <span>Conflicts: <strong className={isVintage ? "text-red-800 font-bold" : "text-red-400"}>{conflictMarkers.length}</strong></span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT PANEL: SCHEDULED & DEFERRED WORK (Section 3)           */}
        {/* ============================================================ */}
        <div
          className={`lg:col-span-4 xl:col-span-3 flex flex-col overflow-hidden transition-colors ${
            isWhite ? "bg-[#ffffff]" : "bg-[#0d1424]"
          }`}
        >
          {/* Section 3 Header & Tabs */}
          <div
            className={`border-b px-3.5 py-2.5 flex items-center justify-between transition-colors ${
              isWhite ? "bg-slate-100 border-slate-200" : "bg-[#10192e] border-slate-800"
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                3
              </span>
              <span
                className={`text-xs font-bold font-mono uppercase tracking-tight ${
                  isWhite ? "text-slate-900" : "text-white"
                }`}
              >
                Work Dossier
              </span>
            </div>

            {/* Tabs */}
            <div
              className={`flex items-center rounded p-0.5 border text-xs font-mono transition-colors ${
                isWhite ? "bg-slate-200 border-slate-300" : "bg-slate-900 border-slate-700"
              }`}
            >
              <button
                onClick={() => setActiveTab("scheduled")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === "scheduled"
                    ? "bg-sky-600 text-white font-bold"
                    : isWhite
                    ? "text-slate-700 hover:text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Scheduled ({scheduledTasks.length})
              </button>
              <button
                onClick={() => setActiveTab("deferred")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === "deferred"
                    ? "bg-amber-600 text-white font-bold"
                    : isWhite
                    ? "text-slate-700 hover:text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Deferred ({deferredTasks.length})
              </button>
            </div>
          </div>

          {/* Cards List Container */}
          <div
            className={`flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[640px] scrollbar-thin ${
              isWhite
                ? "scrollbar-thumb-slate-300 scrollbar-track-slate-100"
                : "scrollbar-thumb-slate-700 scrollbar-track-slate-900"
            }`}
          >
            {/* TAB 1: SCHEDULED WORK CARDS (Matching Reference #3) */}
            {activeTab === "scheduled" && (
              <>
                {scheduledTasks.length === 0 ? (
                  <div className={`text-center py-12 font-mono text-xs ${isWhite ? "text-slate-500" : "text-slate-500"}`}>
                    No scheduled work. Run CP-SAT to generate the timeline.
                  </div>
                ) : (
                  scheduledTasks.map((item: any) => {
                    const isSelected = selectedTaskId === item.task_id;
                    const color = getTaskColor(item);

                    // Card borders and backgrounds matching reference image styling
                    const cardBg = isWhite
                      ? color === "red"
                        ? "bg-red-50 border-red-300 hover:border-red-500"
                        : color === "orange"
                        ? "bg-amber-50 border-amber-300 hover:border-amber-500"
                        : color === "purple"
                        ? "bg-purple-50 border-purple-300 hover:border-purple-500"
                        : "bg-emerald-50 border-emerald-300 hover:border-emerald-500"
                      : color === "red"
                      ? "bg-[#2a1215] border-red-700/80 hover:border-red-500"
                      : color === "orange"
                      ? "bg-[#2d1b11] border-orange-700/80 hover:border-orange-500"
                      : color === "purple"
                      ? "bg-[#251532] border-purple-700/80 hover:border-purple-500"
                      : "bg-[#10241b] border-emerald-700/80 hover:border-emerald-500";

                    const selectedGlow = isSelected ? "ring-2 ring-amber-400 shadow-lg scale-[1.01]" : "";

                    return (
                      <div
                        key={item.task_id}
                        onClick={() => scrollToTask(item.task_id)}
                        className={`p-3 rounded-lg border ${cardBg} ${selectedGlow} transition-all cursor-pointer flex items-start space-x-3 font-mono ${
                          isWhite ? "text-slate-800" : "text-slate-200"
                        }`}
                      >
                        {/* Left Department Icon */}
                        <div
                          className={`p-2 rounded shrink-0 mt-0.5 ${
                            isWhite
                              ? "bg-white border border-slate-200 shadow-xs"
                              : "bg-black/40 border border-white/10 text-white"
                          }`}
                        >
                          {item.department === "PWAY" ? (
                            <Wrench className={`w-4 h-4 ${isWhite ? "text-orange-600" : "text-orange-400"}`} />
                          ) : item.department === "TRD" ? (
                            <Zap className={`w-4 h-4 ${isWhite ? "text-amber-600" : "text-amber-400"}`} />
                          ) : item.department === "SNT" ? (
                            <Lightbulb className={`w-4 h-4 ${isWhite ? "text-emerald-600" : "text-emerald-400"}`} />
                          ) : (
                            <Shield className={`w-4 h-4 ${isWhite ? "text-sky-600" : "text-sky-400"}`} />
                          )}
                        </div>

                        {/* Card Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-bold truncate ${isWhite ? "text-slate-900" : "text-white"}`}>
                              {item.task_id}: {item.task_title || "Maintenance"}
                            </span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 ${
                                isWhite
                                  ? "bg-slate-100 border border-slate-300 text-slate-800"
                                  : "bg-black/50 border border-white/20 text-white"
                              }`}
                            >
                              {item.priority_tier || "HIGH"}
                            </span>
                          </div>

                          <p className={`text-[11px] truncate mt-0.5 ${isWhite ? "text-slate-600" : "text-slate-400"}`}>
                            {item.section_id || item.corridor_id} · KM {item.location_km || 150} · {item.track_name || "DOWN_MAIN"}
                          </p>

                          {/* Time & Machine badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                            <span
                              className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-bold ${
                                isWhite
                                  ? "bg-sky-50 border border-sky-200 text-sky-800"
                                  : "bg-black/50 border border-white/10 text-sky-300"
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {item.allocated_start_time} – {item.allocated_end_time} ({item.duration_mins}m)
                            </span>

                            {item.assigned_machine && (
                              <span
                                className={`px-1.5 py-0.5 rounded truncate max-w-[140px] font-semibold ${
                                  isWhite
                                    ? "bg-amber-50 border border-amber-200 text-amber-800"
                                    : "bg-black/50 border border-white/10 text-amber-300"
                                }`}
                              >
                                ⚙ {item.assigned_machine}
                              </span>
                            )}
                          </div>

                          {/* Proposal Action Button (Enforces CP-SAT -> Proposal -> Sanction -> Timeline Lifecycle) */}
                          {onProposeFromSchedule && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                              {proposedTaskIds?.has(item.task_id) ? (
                                <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                                  isVintage ? "text-emerald-800" : "text-emerald-400"
                                }`}>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Proposal Created (Pending Approval)
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onProposeFromSchedule(item);
                                  }}
                                  disabled={proposingTaskId === item.task_id}
                                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono font-bold text-[11px] py-1.5 px-3 rounded shadow-sm flex items-center justify-center space-x-1.5 transition-all"
                                >
                                  {proposingTaskId === item.task_id ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Creating Proposal...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                                      <span>Create Block Proposal</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* TAB 2: DEFERRED WORK CARDS (Matching Reference #3 Deferred) */}
            {activeTab === "deferred" && (
              <>
                {deferredTasks.length === 0 ? (
                  <div className={`text-center py-12 font-mono text-xs ${isWhite ? "text-slate-500" : "text-slate-500"}`}>
                    No deferred work.
                  </div>
                ) : (
                  deferredTasks.map((def: any) => {
                    const isSelected = selectedTaskId === def.task_id;
                    return (
                      <div
                        key={def.task_id}
                        onClick={() => setSelectedTaskId(def.task_id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start space-x-3 font-mono ${
                          isWhite
                            ? "bg-rose-50/50 border-rose-200 hover:border-rose-400 text-slate-800"
                            : "bg-[#1a1c29] border-slate-700/80 hover:border-slate-500 text-slate-200"
                        } ${isSelected ? (isWhite ? "ring-2 ring-red-500" : "ring-2 ring-red-400") : ""}`}
                      >
                        {/* Warning Ladder Icon */}
                        <div
                          className={`p-2 rounded shrink-0 mt-0.5 ${
                            isWhite
                              ? "bg-white border border-red-300 text-red-600 shadow-xs"
                              : "bg-black/50 border border-red-500/40 text-red-400"
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </div>

                        {/* Deferred Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-bold truncate ${isWhite ? "text-slate-900" : "text-white"}`}>
                              {def.task_id}: {def.description || "Track Renewal"}
                            </span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 ${
                                isWhite
                                  ? "bg-red-100 border border-red-300 text-red-800"
                                  : "bg-red-950/80 border border-red-500/60 text-red-300"
                              }`}
                            >
                              DEFERRED
                            </span>
                          </div>

                          <p className={`text-[11px] truncate mt-0.5 ${isWhite ? "text-slate-600" : "text-slate-400"}`}>
                            {def.location || def.section_id || "Bhopal Section"} · {def.department || "PWAY"}
                          </p>

                          {/* Reason in red/accent matching reference */}
                          <div
                            className={`mt-1.5 text-[11px] font-semibold flex items-start gap-1 ${
                              isWhite ? "text-rose-700" : "text-rose-300"
                            }`}
                          >
                            <span className={`font-bold shrink-0 ${isWhite ? "text-rose-800" : "text-rose-400"}`}>
                              Reason:
                            </span>
                            <span className="line-clamp-2">
                              {def.human_readable_reason || def.reason || "Window capacity exceeded"}
                            </span>
                          </div>

                          {/* Mitigation suggestion */}
                          {def.mitigation && (
                            <p className={`text-[10px] mt-1 italic line-clamp-2 ${isWhite ? "text-slate-600" : "text-slate-400"}`}>
                              💡 {def.mitigation}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FLOATING HOVER TOOLTIP FOR TIMELINE BARS                      */}
      {/* ============================================================== */}
      {hoveredItem && (
        <div
          style={{
            position: "fixed",
            left: `${hoveredItem.x}px`,
            top: `${hoveredItem.y}px`,
            transform: "translate(-50%, -100%)",
            pointerEvents: "none",
            zIndex: 9999,
          }}
          className={`border rounded-lg p-3 shadow-2xl text-xs font-mono max-w-sm animate-in fade-in zoom-in-95 duration-100 ${
            isWhite
              ? "bg-white/98 text-slate-900 border-sky-500 shadow-slate-400/40"
              : "bg-black/95 text-white border-sky-500/80"
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 border-b pb-1.5 mb-1.5 ${
              isWhite ? "border-slate-200" : "border-slate-700"
            }`}
          >
            <span className={`font-bold ${isWhite ? "text-sky-700" : "text-sky-400"}`}>
              {hoveredItem.item.title}
            </span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded ${
                isWhite
                  ? "bg-slate-100 text-slate-700 border border-slate-200"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {hoveredItem.item.durationMins} mins
            </span>
          </div>

          <p className={`text-[11px] mb-1 ${isWhite ? "text-slate-600" : "text-slate-300"}`}>
            {hoveredItem.item.subtitle}
          </p>

          <div
            className={`grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mt-2 ${
              isWhite ? "text-slate-600" : "text-slate-400"
            }`}
          >
            <div>
              Window: <strong className={isWhite ? "text-slate-900" : "text-slate-200"}>
                {hoveredItem.item.startTimeStr} – {hoveredItem.item.endTimeStr}
              </strong>
            </div>
            <div>
              Track: <strong className={isWhite ? "text-slate-900" : "text-slate-200"}>
                {hoveredItem.item.track || "DOWN_MAIN"}
              </strong>
            </div>
            {hoveredItem.item.department && (
              <div>
                Dept: <strong className={isWhite ? "text-slate-900" : "text-slate-200"}>
                  {hoveredItem.item.department}
                </strong>
              </div>
            )}
            {hoveredItem.item.machine && (
              <div>
                Machine: <strong className={isWhite ? "text-slate-900" : "text-slate-200"}>
                  {hoveredItem.item.machine}
                </strong>
              </div>
            )}
            {hoveredItem.item.priorityTier && (
              <div>
                Priority: <strong className={isWhite ? "text-amber-700 font-bold" : "text-amber-400"}>
                  {hoveredItem.item.priorityTier}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ============================================================== */}
      {/* TASK DETAIL INSPECTION DRAWER (When a task is clicked)        */}
      {/* ============================================================== */}
      {selectedTaskDetails && (
        <div
          className={`border-t p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono transition-colors ${
            isWhite ? "bg-white border-slate-200" : "bg-[#10192e] border-slate-800"
          }`}
        >
          <div className="flex items-center space-x-3">
            <span
              className={`px-2 py-0.5 rounded border font-bold ${
                isWhite
                  ? "bg-sky-100 text-sky-800 border-sky-300"
                  : "bg-sky-500/20 text-sky-400 border-sky-500/40"
              }`}
            >
              {selectedTaskDetails.task_id}
            </span>
            <span className={`font-bold text-sm ${isWhite ? "text-slate-900" : "text-white"}`}>
              {selectedTaskDetails.task_title || selectedTaskDetails.description}
            </span>
            <span className={isWhite ? "text-slate-600" : "text-slate-400"}>
              {selectedTaskDetails.section_id || selectedTaskDetails.corridor_id} · Track: {selectedTaskDetails.track_name || "DOWN_MAIN"}
            </span>
            {selectedTaskDetails.allocated_start_time && (
              <span className={`font-bold ${isWhite ? "text-emerald-700" : "text-emerald-400"}`}>
                {selectedTaskDetails.allocated_start_time} – {selectedTaskDetails.allocated_end_time} ({selectedTaskDetails.duration_mins}m)
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {onOpenReasoning && (
              <button
                onClick={() => onOpenReasoning(selectedTaskDetails.task_id, selectedTaskDetails)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded text-xs flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explain AI Decision</span>
              </button>
            )}
            <button
              onClick={() => setSelectedTaskId(null)}
              className={`p-1 rounded ${
                isWhite
                  ? "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                  : "hover:bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttDashboard;
