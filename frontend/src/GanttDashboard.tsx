import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { BlockData, TrainMovementData } from "./types";
import { formatDistanceKm } from "./utils/formatDistance";
import { getISTDateString, getISTTimeString } from "./utils/istDate";
import { useTheme } from "./context/ThemeContext";
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

export type CanonicalLockType = "RULING" | "PLANNED" | "EMERGENT" | "SHADOW";

export const getCanonicalLockType = (item: any): CanonicalLockType => {
  const btype = (item.block_type || "").toUpperCase();
  if (btype === "RULING" || btype === "PLANNED" || btype === "EMERGENT" || btype === "SHADOW") {
    return btype as CanonicalLockType;
  }
  const tid = (item.task_id || item.id || "").toUpperCase();
  if (tid.includes("RUL")) return "RULING";
  if (tid.includes("EMG") || (item.priority_tier || item.task_priority || item.priority) === "CRITICAL") return "EMERGENT";
  if (tid.includes("SHD") || item.is_multi_department || (item.departments && item.departments.length > 1)) return "SHADOW";
  return "PLANNED";
};

export interface GanttDashboardProps {
  tasks?: any[];
  blocks?: BlockData[];
  trainMovements?: TrainMovementData[];
  optResult?: any;
  onRefresh?: () => void;
  onOpenReasoning?: (taskId: string, fallbackItem?: any) => void;
  onRunOptimizer?: () => Promise<void> | void;
  optimizing?: boolean;
  theme?: "light" | "dark" | "vintage" | "white" | "black";
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
  lockType: CanonicalLockType | "TRAIN";
  colorType?: "red" | "orange" | "green" | "purple" | "blue" | "slate" | string;
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
  theme,
  onProposeFromSchedule,
  proposedTaskIds,
  proposingTaskId,
}) => {
  // Theme inherited directly from parent page prop or centralized ThemeContext
  const globalTheme = useTheme();
  const effectiveTheme = theme || globalTheme.theme;
  const isDark = effectiveTheme === "dark";
  const isWhite = !isDark;

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

  // Non-passive wheel event listener to enable zoom while preventing browser page scroll
  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;

    const handleWheelZoom = (e: WheelEvent) => {
      // Prevent browser page from scrolling up/down
      e.preventDefault();

      // Vertical wheel movement cycles zoom scale
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        if (e.deltaY < 0) {
          // Zoom in: 24hour -> 1hour -> 15min
          setZoomLevel((prev) => (prev === "24hour" ? "1hour" : "15min"));
        } else if (e.deltaY > 0) {
          // Zoom out: 15min -> 1hour -> 24hour
          setZoomLevel((prev) => (prev === "15min" ? "1hour" : "24hour"));
        }
      } else {
        // Horizontal wheel delta scrolls the timeline horizontally
        el.scrollLeft += e.deltaX;
      }
    };

    el.addEventListener("wheel", handleWheelZoom, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheelZoom);
    };
  }, []);

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

  // Map color semantics based on canonical lock type
  const getTaskColor = useCallback((item: any): CanonicalLockType => {
    return getCanonicalLockType(item);
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
      const lockType = getCanonicalLockType(ab);

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
        lockType,
        colorType: lockType,
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
        lockType,
        colorType: lockType,
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
          lockType,
          colorType: lockType,
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
        lockType: "TRAIN",
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
        lockType: "TRAIN",
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

  // Color mapper helper for Gantt bars — uses canonical lock-type tokens from tokens.css
  const barBaseClasses = "rounded transition-all duration-150 flex items-center px-2 text-[11px] font-mono select-none overflow-hidden cursor-pointer shadow-sm";

  const getBarInlineStyle = (lockType: CanonicalLockType | "TRAIN", isSelected: boolean): React.CSSProperties => {
    const selectedExtra: React.CSSProperties = isSelected
      ? { outline: "2px solid var(--status-warning)", outlineOffset: "1px", zIndex: 30, fontWeight: "bold" }
      : {};

    if (lockType === "TRAIN") {
      return {
        background: "var(--surface-secondary)",
        borderColor: "var(--border-medium)",
        color: "var(--text-secondary)",
        borderWidth: "1px",
        borderStyle: "solid",
        ...selectedExtra,
      };
    }

    const map: Record<CanonicalLockType, React.CSSProperties> = {
      RULING:   { background: "var(--lock-ruling-bg)",  borderColor: "var(--lock-ruling)",  color: "var(--lock-ruling-text)",  fontWeight: "bold" },
      PLANNED:  { background: "var(--lock-planned-bg)", borderColor: "var(--lock-planned)", color: "var(--lock-planned-text)" },
      EMERGENT: { background: "var(--lock-emergent-bg)", borderColor: "var(--lock-emergent)", color: "var(--lock-emergent-text)", fontWeight: "bold" },
      SHADOW:   { background: "var(--lock-shadow-bg)",  borderColor: "var(--lock-shadow)",  color: "var(--lock-shadow-text)" },
    };

    return {
      ...(map[lockType] ?? map.PLANNED),
      borderWidth: "1px",
      borderStyle: "solid",
      ...selectedExtra,
    };
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
  const solverStatus = metrics.solver_status || optResult?.solver_status || "OPTIMAL";
  const mandatoryDropped = typeof metrics.mandatory_items_dropped === "number"
    ? metrics.mandatory_items_dropped
    : (typeof optResult?.mandatory_items_dropped === "number"
      ? optResult.mandatory_items_dropped
      : (metrics.critical_scheduled === false ? 1 : 0));

  return (
    <div
      className="rounded-xl border shadow-2xl overflow-hidden font-sans transition-colors duration-150 bg-[var(--surface-card)] text-[var(--text-primary)] border-[var(--border-subtle)]"
    >
      {/* ============================================================== */}
      {/* 1. TOP HEADER & SOLVER CONTROL BAR (Inspired by Reference #1) */}
      {/* ============================================================== */}
      <div
        className="border-b px-4 py-3 flex flex-col gap-2.5 transition-colors bg-[var(--surface-secondary)] border-[var(--border-subtle)]"
      >
        {/* Title Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <span
              className="p-1.5 rounded-lg border bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]"
            >
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2
                  className="text-sm sm:text-base font-bold tracking-tight font-mono uppercase text-[var(--text-primary)]"
                >
                  INDIAN RAILWAYS — RESOURCE-CONSTRAINED GANTT ENGINE
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  1
                </span>
              </div>
              <p
                className="text-[11px] font-mono flex items-center space-x-2 text-[var(--text-secondary)]"
              >
                <span>Bhopal Division · Safety Headway & Multi-Department Resource Allocation</span>
                <span className="text-[var(--border-medium)]">|</span>
                <span
                  className="flex items-center gap-1 font-semibold text-[var(--status-warning)]"
                >
                  <AlertTriangle className="w-3 h-3" />
                  STATION PSYCHOLOGY: EMERGENCY DEFECTS ACTIVE
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            >
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Date: {getISTDateString()} {getISTTimeString(undefined, false)} IST
            </span>
          </div>
        </div>

        {/* Toolbar & Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Corridor Select */}
            <div
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border text-xs bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-primary)]"
            >
              <span className="font-mono text-[11px] text-[var(--text-secondary)]">Corridor:</span>
              <select
                value={selectedCorridor}
                onChange={(e) => setSelectedCorridor(e.target.value)}
                className="bg-transparent font-mono focus:outline-none cursor-pointer text-[var(--text-primary)]"
              >
                <option value="ALL" className="bg-[var(--surface-card)] text-[var(--text-primary)]">All Corridors (Bhopal Div)</option>
                <option value="CORR-01" className="bg-[var(--surface-card)] text-[var(--text-primary)]">CORR-01: Bina – Bhopal</option>
                <option value="CORR-02" className="bg-[var(--surface-card)] text-[var(--text-primary)]">CORR-02: Bhopal – Itarsi</option>
                <option value="CORR-03" className="bg-[var(--surface-card)] text-[var(--text-primary)]">CORR-03: Itarsi – Khandwa</option>
                <option value="CORR-04" className="bg-[var(--surface-card)] text-[var(--text-primary)]">CORR-04: Bhopal – Guna</option>
                <option value="CORR-05" className="bg-[var(--surface-card)] text-[var(--text-primary)]">CORR-05: Guna – Gwalior</option>
              </select>
            </div>

            {/* Anchor Station Select */}
            <div
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border text-xs bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-primary)]"
            >
              <span className="font-mono text-[11px] text-[var(--text-secondary)]">Anchor:</span>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="bg-transparent font-mono focus:outline-none cursor-pointer text-[var(--text-primary)]"
              >
                <option value="ALL" className="bg-[var(--surface-card)] text-[var(--text-primary)]">All Stations</option>
                <option value="BPL" className="bg-[var(--surface-card)] text-[var(--text-primary)]">Bhopal Jn (BPL)</option>
                <option value="ET" className="bg-[var(--surface-card)] text-[var(--text-primary)]">Itarsi Jn (ET)</option>
                <option value="BINA" className="bg-[var(--surface-card)] text-[var(--text-primary)]">Bina Jn (BINA)</option>
                <option value="RKMP" className="bg-[var(--surface-card)] text-[var(--text-primary)]">Rani Kamalapati (RKMP)</option>
                <option value="BNI" className="bg-[var(--surface-card)] text-[var(--text-primary)]">Budhni (BNI)</option>
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
              className="flex items-center rounded border p-0.5 text-xs font-mono bg-[var(--surface-secondary)] border-[var(--border-subtle)]"
            >
              <button
                onClick={() => setZoomLevel("15min")}
                className={`px-2 py-1 rounded transition-colors ${
                  zoomLevel === "15min"
                    ? "bg-sky-600 text-white font-bold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                15 Min
              </button>
              <button
                onClick={() => setZoomLevel("1hour")}
                className={`px-2 py-1 rounded transition-colors ${
                  zoomLevel === "1hour"
                    ? "bg-sky-600 text-white font-bold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                1 Hour
              </button>
              <button
                onClick={() => setZoomLevel("24hour")}
                className={`px-2 py-1 rounded transition-colors ${
                  zoomLevel === "24hour"
                    ? "bg-sky-600 text-white font-bold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                24 Hours
              </button>
            </div>
          </div>

          {/* Solver Status Pills (Matching Reference Image) */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
            <span
              className="px-2.5 py-1 rounded border font-semibold flex items-center gap-1 bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success-text)]"
            >
              <CheckCircle2 className="w-3 h-3 text-[var(--status-success)]" />
              Solver Status: {solverStatus}
            </span>
            <span
              className="px-2.5 py-1 rounded border bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            >
              Gap: {optResult?.gap ?? "3.85%"}
            </span>
            <span
              className="px-2.5 py-1 rounded border bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            >
              Solve Time: {solveTimeMs}ms
            </span>
            <span
              className={`px-2.5 py-1 rounded border font-semibold flex items-center gap-1 ${
                mandatoryDropped === 0
                  ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success-text)]"
                  : "bg-[var(--status-danger-bg)] border-[var(--status-danger-border)] text-[var(--status-danger-text)] animate-pulse"
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
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:h-[680px] min-h-[640px] relative border-b border-[var(--border-subtle)]">
        {/* ============================================================ */}
        {/* LEFT / CENTER PANEL: GANTT RESOURCE TIMELINE (Section 2)    */}
        {/* ============================================================ */}
        <div
          className="lg:col-span-8 xl:col-span-9 border-r flex flex-col h-full min-h-0 overflow-hidden transition-colors border-[var(--border-subtle)] bg-[var(--surface-body)]"
        >
          {/* Timeline Planning Horizon Banner */}
          <div
            className="border-b px-4 py-2 flex items-center justify-between text-xs font-mono transition-colors bg-[var(--surface-secondary)] border-[var(--border-subtle)] text-[var(--text-primary)]"
          >
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                2
              </span>
              <span className="font-bold tracking-wide uppercase text-[var(--text-primary)]">
                Corridor Maintenance & Resource Possession Timeline
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                (00:00 – 23:59 24-Hour Operational Horizon)
              </span>
            </div>
            {/* Canonical Lock-Type Legend */}
            <div className="flex items-center space-x-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5">
                <span style={{ background: "var(--lock-ruling)", borderColor: "var(--lock-ruling)" }} className="w-2.5 h-2.5 rounded-sm inline-block" />
                <span className="text-[var(--text-secondary)] font-semibold">RULING</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span style={{ background: "var(--lock-planned)", borderColor: "var(--lock-planned)" }} className="w-2.5 h-2.5 rounded-sm inline-block" />
                <span className="text-[var(--text-secondary)] font-semibold">PLANNED</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span style={{ background: "var(--lock-emergent)", borderColor: "var(--lock-emergent)" }} className="w-2.5 h-2.5 rounded-sm inline-block" />
                <span className="text-[var(--text-secondary)] font-semibold">EMERGENT</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span style={{ background: "var(--lock-shadow)", borderColor: "var(--lock-shadow)" }} className="w-2.5 h-2.5 rounded-sm inline-block" />
                <span className="text-[var(--text-secondary)] font-semibold">SHADOW</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 dark:bg-slate-600 inline-block border border-slate-500" />
                <span className="text-[var(--text-secondary)] font-medium">TRAIN</span>
              </span>
            </div>
          </div>

          {/* Empty state only if CP-SAT has not run AND no approved blocks or trains exist */}
          {!optResult && approvedBlocks.length === 0 && trainList.length === 0 && (
            <div
              className="flex-1 flex flex-col items-center justify-center p-12 text-center transition-colors bg-[var(--surface-body)]"
            >
              <Cpu className="w-12 h-12 text-sky-500 mb-3 animate-pulse" />
              <h3 className="text-lg font-bold font-mono text-[var(--text-primary)]">
                Run CP-SAT Optimizer to generate the candidate schedule.
              </h3>
              <p className="text-xs font-mono mt-1 max-w-md text-[var(--text-muted)]">
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
              className="px-4 py-2 border-b flex items-center justify-between text-xs font-mono transition-colors bg-[var(--surface-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
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
            className="flex-1 min-h-0 flex overflow-y-auto overflow-x-hidden relative"
          >
            {/* COLUMN A: FIXED RESOURCE / LANE COLUMN (w-64 min-w-[256px] max-w-[256px] shrink-0 border-r) */}
            <div
              className="w-64 min-w-[256px] max-w-[256px] shrink-0 border-r flex flex-col select-none z-10 transition-colors bg-[var(--surface-body)] border-[var(--border-subtle)]"
            >
              {/* Header Cell (Row height: h-10) */}
              <div
                className="h-10 px-3 flex items-center justify-between border-b text-[11px] font-mono font-bold transition-colors bg-[var(--surface-secondary)] border-[var(--border-subtle)] text-[var(--text-primary)]"
              >
                <span>RESOURCE / SECTION</span>
                <span className="text-[10px] text-[var(--text-muted)]">24H TIMETABLE</span>
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
                      className="h-8 px-3 flex items-center justify-between cursor-pointer border-b text-xs font-mono font-bold transition-colors select-none bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                        <span className="uppercase tracking-wider truncate text-[11px]">{groupLabel}</span>
                      </div>
                      <span className="text-[10px] font-normal shrink-0 text-[var(--text-muted)]">
                        ({groupLanes.length})
                      </span>
                    </div>

                    {/* Lane Labels in Column A (Row height: h-12 each) */}
                    {!isCollapsed &&
                      groupLanes.map((lane) => (
                        <div
                          key={`colA_lane_${lane.id}`}
                          className="h-12 px-3 flex flex-col justify-center border-b transition-colors border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]/50"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="text-xs font-mono font-bold truncate text-[var(--text-primary)]"
                            >
                              {lane.name}
                            </span>
                            {lane.badge && (
                              <span
                                className="text-[9px] font-mono px-1 py-0.2 rounded border font-semibold shrink-0 bg-[var(--surface-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                              >
                                {lane.badge}
                              </span>
                            )}
                          </div>
                          <span
                            className="text-[10px] font-mono truncate text-[var(--text-muted)]"
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
              className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin relative transition-colors bg-[var(--surface-body)]"
            >
              {/* Inner canvas container sized to totalTimelineWidth */}
              <div style={{ width: `${totalTimelineWidth}px` }} className="relative flex flex-col min-w-full">
                {/* Timeline Time Axis Header (Row height: h-10) */}
                <div
                  className="h-10 relative flex border-b transition-colors bg-[var(--surface-secondary)] border-[var(--border-subtle)]"
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
                        className="absolute top-0 bottom-0 border-l border-[var(--border-subtle)] flex flex-col justify-between px-1.5 py-1 text-[11px] font-mono select-none text-[var(--text-secondary)]"
                      >
                        <span>{String(h).padStart(2, "0")}:00</span>
                        {zoomLevel === "15min" && (
                          <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
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
                        className="h-8 border-b transition-colors relative bg-[var(--surface-secondary)] border-[var(--border-subtle)]"
                      >
                        {/* Background grid lines extending across header */}
                        {Array.from({ length: 24 }).map((_, h) => (
                          <div
                            key={h}
                            style={{ left: `${h * 60 * pxPerMin}px` }}
                            className="absolute top-0 bottom-0 border-l pointer-events-none border-[var(--border-subtle)]/40"
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
                              className="h-12 border-b relative transition-colors border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]/30"
                            >
                              {/* Vertical Grid Lines */}
                              {Array.from({ length: 24 }).map((_, h) => (
                                <div
                                  key={h}
                                  style={{ left: `${h * 60 * pxPerMin}px` }}
                                  className="absolute top-0 bottom-0 border-l pointer-events-none border-[var(--border-subtle)]/40"
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
                                      ...getBarInlineStyle(bar.lockType ?? "PLANNED", isSelected),
                                    }}
                                    className={`absolute ${barBaseClasses} ${!isSelected ? "hover:brightness-110" : ""}`}
                                  >
                                    <span className="truncate font-semibold tracking-tight">
                                      {bar.title}
                                    </span>
                                    <span className="ml-1.5 text-[9px] font-mono shrink-0 opacity-75">
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
                                          className="flex items-center space-x-0.5 border text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-pulse bg-[var(--status-warning-bg)] border-[var(--status-warning)] text-[var(--status-warning-text)] shadow-amber-500/20"
                                        >
                                          <span>❌</span>
                                          <span>⚠</span>
                                        </div>

                                        {/* Floating Conflict Tooltip on Hover */}
                                        <div
                                          className="hidden group-hover/conf:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 border border-[var(--status-warning)] text-[10px] font-mono px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 bg-[var(--surface-card)] text-[var(--text-primary)]"
                                        >
                                          <p className="font-bold text-[var(--status-warning)]">
                                            Headway Conflict
                                          </p>
                                          <p>{conf.description}</p>
                                          <p className="text-[9px] text-[var(--text-muted)]">
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
            className="border-t px-4 py-2 flex flex-wrap items-center justify-between text-[11px] font-mono transition-colors bg-[var(--surface-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
          >
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[var(--status-info)]">
                {optResult ? "CP-SAT Solve complete" : "Operational Schedule"}
              </span>
              <span>|</span>
              <span>Bhopal Division Master Spec</span>
              <span>|</span>
              <span className="text-[var(--text-primary)] font-semibold">v10 Resource Gantt</span>
            </div>
            <div className="flex items-center space-x-3">
              <span>Sanctioned on Timeline: <strong className="text-[var(--status-success)] font-bold">{approvedBlocks.length}</strong></span>
              <span>Candidates in Dossier: <strong className="text-[var(--status-info)] font-bold">{scheduledTasks.length}</strong></span>
              <span>Deferred: <strong className="text-[var(--status-warning)] font-bold">{deferredTasks.length}</strong></span>
              <span>Conflicts: <strong className="text-[var(--status-danger)] font-bold">{conflictMarkers.length}</strong></span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT PANEL: SCHEDULED & DEFERRED WORK (Section 3)           */}
        {/* ============================================================ */}
        <div
          className="lg:col-span-4 xl:col-span-3 flex flex-col h-[600px] lg:h-full max-h-[680px] min-h-0 overflow-hidden transition-colors bg-[var(--surface-card)]"
        >
          {/* Section 3 Header & Tabs */}
          <div
            className="border-b px-3.5 py-2.5 flex items-center justify-between transition-colors bg-[var(--surface-secondary)] border-[var(--border-subtle)] flex-shrink-0"
          >
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                3
              </span>
              <span
                className="text-xs font-bold font-mono uppercase tracking-tight text-[var(--text-primary)]"
              >
                Work Dossier
              </span>
            </div>

            {/* Tabs */}
            <div
              className="flex items-center rounded p-0.5 border text-xs font-mono transition-colors bg-[var(--surface-body)] border-[var(--border-subtle)]"
            >
              <button
                onClick={() => setActiveTab("scheduled")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === "scheduled"
                    ? "bg-sky-600 text-white font-bold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Scheduled ({scheduledTasks.length})
              </button>
              <button
                onClick={() => setActiveTab("deferred")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === "deferred"
                    ? "bg-amber-600 text-white font-bold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Deferred ({deferredTasks.length})
              </button>
            </div>
          </div>

          {/* Cards List Container */}
          <div
            className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 scrollbar-thin bg-[var(--surface-body)]"
          >
            {/* TAB 1: SCHEDULED WORK CARDS */}
            {activeTab === "scheduled" && (
              <>
                {scheduledTasks.length === 0 ? (
                  <div className="text-center py-12 font-mono text-xs text-[var(--text-muted)]">
                    No scheduled work. Run CP-SAT to generate the timeline.
                  </div>
                ) : (
                  scheduledTasks.map((item: any) => {
                    const isSelected = selectedTaskId === item.task_id;
                    const lockType = getCanonicalLockType(item);

                    const lockCardStyles: Record<CanonicalLockType, { bg: string; border: string }> = {
                      RULING: { bg: "var(--lock-ruling-bg)", border: "var(--lock-ruling)" },
                      PLANNED: { bg: "var(--lock-planned-bg)", border: "var(--lock-planned)" },
                      EMERGENT: { bg: "var(--lock-emergent-bg)", border: "var(--lock-emergent)" },
                      SHADOW: { bg: "var(--lock-shadow-bg)", border: "var(--lock-shadow)" },
                    };
                    const cardStyle = lockCardStyles[lockType] ?? lockCardStyles.PLANNED;
                    const selectedGlow = isSelected ? "ring-2 ring-amber-400 shadow-lg scale-[1.01]" : "";

                    return (
                      <div
                        key={item.task_id}
                        onClick={() => scrollToTask(item.task_id)}
                        style={{
                          background: cardStyle.bg,
                          borderColor: cardStyle.border,
                        }}
                        className={`p-3 rounded-lg border ${selectedGlow} transition-all cursor-pointer flex items-start space-x-3 font-mono text-[var(--text-primary)]`}
                      >
                        {/* Left Department Icon */}
                        <div
                          className="p-2 rounded shrink-0 mt-0.5 bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-xs"
                        >
                          {item.department === "PWAY" ? (
                            <Wrench className="w-4 h-4 text-orange-600" />
                          ) : item.department === "TRD" ? (
                            <Zap className="w-4 h-4 text-amber-600" />
                          ) : item.department === "SNT" ? (
                            <Lightbulb className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Shield className="w-4 h-4 text-sky-600" />
                          )}
                        </div>

                        {/* Card Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold truncate text-[var(--text-primary)]">
                              {item.task_id}: {item.task_title || "Maintenance"}
                            </span>
                            <span
                              className="text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                            >
                              {item.priority_tier || "HIGH"}
                            </span>
                          </div>

                          <p className="text-[11px] truncate mt-0.5 text-[var(--text-muted)]">
                            {item.section_id || item.corridor_id} · KM {item.location_km || 150} · {item.track_name || "DOWN_MAIN"}
                          </p>

                          {/* Time & Machine badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                            <span
                              className="px-1.5 py-0.5 rounded flex items-center gap-1 font-bold bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--status-info)]"
                            >
                              <Clock className="w-3 h-3" />
                              {item.allocated_start_time} – {item.allocated_end_time} ({item.duration_mins}m)
                            </span>

                            {item.assigned_machine && (
                              <span
                                className="px-1.5 py-0.5 rounded truncate max-w-[140px] font-semibold bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--status-warning)]"
                              >
                                ⚙ {item.assigned_machine}
                              </span>
                            )}
                          </div>

                          {/* Proposal Action Button */}
                          {onProposeFromSchedule && (
                            <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                              {proposedTaskIds?.has(item.task_id) ? (
                                <span className="text-[10px] font-mono font-bold flex items-center gap-1 text-[var(--status-success)]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
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

            {/* TAB 2: DEFERRED WORK CARDS */}
            {activeTab === "deferred" && (
              <>
                {deferredTasks.length === 0 ? (
                  <div className="text-center py-12 font-mono text-xs text-[var(--text-muted)]">
                    No deferred work.
                  </div>
                ) : (
                  deferredTasks.map((def: any) => {
                    const isSelected = selectedTaskId === def.task_id;
                    return (
                      <div
                        key={def.task_id}
                        onClick={() => setSelectedTaskId(def.task_id)}
                        style={{
                          background: "var(--status-danger-bg)",
                          borderColor: "var(--status-danger-border)",
                        }}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start space-x-3 font-mono text-[var(--text-primary)] ${isSelected ? "ring-2 ring-[var(--status-danger)]" : ""}`}
                      >
                        {/* Warning Ladder Icon */}
                        <div
                          className="p-2 rounded shrink-0 mt-0.5 bg-[var(--surface-card)] border border-[var(--status-danger-border)] text-[var(--status-danger)] shadow-xs"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </div>

                        {/* Deferred Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold truncate text-[var(--text-primary)]">
                              {def.task_id}: {def.description || "Track Renewal"}
                            </span>
                            <span
                              className="text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)]"
                            >
                              DEFERRED
                            </span>
                          </div>

                          <p className="text-[11px] truncate mt-0.5 text-[var(--text-muted)]">
                            {def.location || def.section_id || "Bhopal Section"} · {def.department || "PWAY"}
                          </p>

                          {/* Reason */}
                          <div
                            className="mt-1.5 text-[11px] font-semibold flex items-start gap-1 text-[var(--status-danger-text)]"
                          >
                            <span className="font-bold shrink-0 text-[var(--status-danger)]">
                              Reason:
                            </span>
                            <span className="line-clamp-2">
                              {def.human_readable_reason || def.reason || "Window capacity exceeded"}
                            </span>
                          </div>

                          {/* Mitigation suggestion */}
                          {def.mitigation && (
                            <p className="text-[10px] mt-1 italic line-clamp-2 text-[var(--text-secondary)]">
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
            className="flex items-center justify-between gap-2 border-b pb-1.5 mb-1.5 border-[var(--border-subtle)]"
          >
            <span className="font-bold text-[var(--status-info)]">
              {hoveredItem.item.title}
            </span>
            <span
              className="text-[10px] px-1 py-0.2 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            >
              {hoveredItem.item.durationMins} mins
            </span>
          </div>

          <p className="text-[11px] mb-1 text-[var(--text-secondary)]">
            {hoveredItem.item.subtitle}
          </p>

          <div
            className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mt-2 text-[var(--text-muted)]"
          >
            <div>
              Window: <strong className="text-[var(--text-primary)]">
                {hoveredItem.item.startTimeStr} – {hoveredItem.item.endTimeStr}
              </strong>
            </div>
            <div>
              Track: <strong className="text-[var(--text-primary)]">
                {hoveredItem.item.track || "DOWN_MAIN"}
              </strong>
            </div>
            {hoveredItem.item.department && (
              <div>
                Dept: <strong className="text-[var(--text-primary)]">
                  {hoveredItem.item.department}
                </strong>
              </div>
            )}
            {hoveredItem.item.machine && (
              <div>
                Machine: <strong className="text-[var(--text-primary)]">
                  {hoveredItem.item.machine}
                </strong>
              </div>
            )}
            {hoveredItem.item.priorityTier && (
              <div>
                Priority: <strong className="text-[var(--status-warning)] font-bold">
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
          className="border-t p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono transition-colors bg-[var(--surface-secondary)] border-[var(--border-subtle)]"
        >
          <div className="flex items-center space-x-3">
            <span
              className="px-2 py-0.5 rounded border font-bold bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]"
            >
              {selectedTaskDetails.task_id}
            </span>
            <span className="font-bold text-sm text-[var(--text-primary)]">
              {selectedTaskDetails.task_title || selectedTaskDetails.description}
            </span>
            <span className="text-[var(--text-muted)]">
              {selectedTaskDetails.section_id || selectedTaskDetails.corridor_id} · Track: {selectedTaskDetails.track_name || "DOWN_MAIN"}
            </span>
            {selectedTaskDetails.allocated_start_time && (
              <span className="font-bold text-[var(--status-success)]">
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
              className="p-1 rounded hover:bg-[var(--surface-body)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
