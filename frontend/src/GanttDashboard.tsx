import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import type { GanttTask } from './types/contract';
import { BlockData, TrainMovementData } from './types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './services/api';
import {
  Lock,
  XCircle,
  Info,
  Sparkles,
  Clock,
  Calendar,
  X,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Train,
  Shield,
  ZoomIn,
  ZoomOut,
  Check,
  Zap,
} from 'lucide-react';

export interface ExtendedGanttTask extends GanttTask {
  task_kind?: "lane" | "opt" | "block" | "train";
  raw_opt?: any;
  raw_block?: BlockData;
  raw_train?: TrainMovementData;
  department?: string;
  machine?: string;
  protection?: string;
  priority_tier?: string;
}

export interface GanttDashboardProps {
  tasks?: GanttTask[];
  blocks?: BlockData[];
  trainMovements?: TrainMovementData[];
  optResult?: any;
  onRefresh?: () => void;
  onOpenReasoning?: (taskId: string, fallbackItem?: any) => void;
}

export interface GanttZoomTier {
  id: string;
  label: string;
  minColumnWidth: number;
  scaleHeight: number;
  scales: any;
}

export const ZOOM_TIERS: GanttZoomTier[] = [
  {
    id: "5min",
    label: "5 Min",
    minColumnWidth: 32,
    scaleHeight: 54,
    scales: [
      { unit: "hour", step: 1, format: "%H:00 (%d %M)" },
      { unit: "minute", step: 5, format: "%i" },
    ],
  },
  {
    id: "15min",
    label: "15 Min",
    minColumnWidth: 36,
    scaleHeight: 54,
    scales: [
      { unit: "hour", step: 1, format: "%H:00 (%d %M)" },
      { unit: "minute", step: 15, format: "%i" },
    ],
  },
  {
    id: "30min",
    label: "30 Min",
    minColumnWidth: 44,
    scaleHeight: 54,
    scales: [
      { unit: "hour", step: 1, format: "%H:00 (%d %M)" },
      { unit: "minute", step: 30, format: "%i" },
    ],
  },
  {
    id: "1hour",
    label: "1 Hour",
    minColumnWidth: 50,
    scaleHeight: 54,
    scales: [
      { unit: "day", step: 1, format: "%d %M %Y" },
      { unit: "hour", step: 1, format: "%H:%i" },
    ],
  },
  {
    id: "2hour",
    label: "2 Hours",
    minColumnWidth: 55,
    scaleHeight: 54,
    scales: [
      { unit: "day", step: 1, format: "%d %M %Y" },
      { unit: "hour", step: 2, format: "%H:00" },
    ],
  },
  {
    id: "6hour",
    label: "6 Hours",
    minColumnWidth: 65,
    scaleHeight: 54,
    scales: [
      { unit: "day", step: 1, format: "%d %M %Y" },
      { unit: "hour", step: 6, format: "%H:00" },
    ],
  },
  {
    id: "12hour",
    label: "12 Hours",
    minColumnWidth: 70,
    scaleHeight: 54,
    scales: [
      { unit: "day", step: 1, format: "%d %M %Y" },
      { unit: "hour", step: 12, format: "%H:00" },
    ],
  },
  {
    id: "24hour",
    label: "24 Hours",
    minColumnWidth: 75,
    scaleHeight: 54,
    scales: [
      { unit: "month", step: 1, format: "%F %Y" },
      { unit: "day", step: 1, format: "%d %D" },
    ],
  },
];

const formatGanttDate = (dateStr?: string, timeStr?: string, fallbackH = 12, fallbackM = 0): string => {
  const baseDate = dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr) ? dateStr.slice(0, 10) : "2026-03-25";
  if (!timeStr) {
    return `${baseDate} ${String(fallbackH).padStart(2, "0")}:${String(fallbackM).padStart(2, "0")}`;
  }
  const match = timeStr.match(/^([01]?\d|2[0-3]):([0-5]\d)/);
  if (match) {
    return `${baseDate} ${match[1].padStart(2, "0")}:${match[2]}`;
  }
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  }
  return `${baseDate} ${String(fallbackH).padStart(2, "0")}:${String(fallbackM).padStart(2, "0")}`;
};

const ensureEndAfterStart = (startDateStr: string, endDateStr: string, durationMins = 120): string => {
  const startD = new Date(startDateStr.replace(" ", "T") + ":00");
  const endD = new Date(endDateStr.replace(" ", "T") + ":00");
  if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD <= startD) {
    const adjusted = new Date(startD.getTime() + (durationMins || 120) * 60 * 1000);
    const year = adjusted.getFullYear();
    const month = String(adjusted.getMonth() + 1).padStart(2, "0");
    const day = String(adjusted.getDate()).padStart(2, "0");
    const hours = String(adjusted.getHours()).padStart(2, "0");
    const minutes = String(adjusted.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
  return endDateStr;
};

export const GanttDashboard: React.FC<GanttDashboardProps> = ({
  tasks,
  blocks,
  trainMovements,
  optResult,
  onRefresh,
  onOpenReasoning,
}) => {
  const ganttContainer = useRef<HTMLDivElement>(null);
  const [zoomTierIndex, setZoomTierIndex] = useState<number>(3); // Default: 1 Hour (index 3)
  const [wheelZoomMode, setWheelZoomMode] = useState<boolean>(true); // Default: Scroll zooms time axis

  const zoomTierIndexRef = useRef<number>(3);
  zoomTierIndexRef.current = zoomTierIndex;

  const wheelZoomModeRef = useRef<boolean>(true);
  wheelZoomModeRef.current = wheelZoomMode;
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    taskId: string;
    taskText: string;
    task: any;
  } | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Fallback state if neither tasks nor blocks are passed
  const [fallbackBlocks, setFallbackBlocks] = useState<BlockData[]>([]);
  const [fallbackMovements, setFallbackMovements] = useState<TrainMovementData[]>([]);

  useEffect(() => {
    if (!tasks && !blocks) {
      Promise.all([
        api.getBlocks().catch(() => []),
        api.getTrainMovements().catch(() => []),
      ]).then(([b, m]) => {
        setFallbackBlocks(b || []);
        setFallbackMovements(m || []);
      });
    }
  }, [tasks, blocks]);

  const activeBlocks = blocks || fallbackBlocks;
  const activeMovements = trainMovements || fallbackMovements;

  const queryClient = useQueryClient();
  const overrideMutation = useMutation({
    mutationFn: async (payload: { type: 'LOCK_POSSESSION' | 'REJECT_CANDIDATE', taskId: string }) => {
      if (payload.type === 'LOCK_POSSESSION') {
        return await api.approveBlockDirect(payload.taskId, {
          actor: "Divisional Section Controller",
          role: "CONTROLLER",
          notes: "MANUAL_OVERRIDE_LOCK_POSSESSION"
        });
      } else {
        return await api.rejectBlockDirect(payload.taskId, {
          actor: "Divisional Section Controller",
          role: "CONTROLLER",
          notes: "MANUAL_OVERRIDE_REJECT_CANDIDATE"
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      if (onRefresh) onRefresh();
    }
  });

  const formattedTasks = useMemo(() => {
    if (tasks && tasks.length > 0) {
      return tasks as ExtendedGanttTask[];
    }

    const result: ExtendedGanttTask[] = [];
    const baseDate = "2026-03-25";

    // Track Lanes (Parent Containers)
    const lanes: ExtendedGanttTask[] = [
      {
        id: "lane_DOWN_MAIN",
        text: "🛤️ DOWN MAIN — Corridor Spine (Towards Bina/Delhi)",
        start_date: `${baseDate} 00:00`,
        end_date: `${baseDate} 23:59`,
        parent: "0",
        type: "project",
        priority_color: "blue",
        conflict: false,
        task_kind: "lane",
      },
      {
        id: "lane_UP_MAIN",
        text: "🛤️ UP MAIN — Corridor Spine (Towards Itarsi/Mumbai)",
        start_date: `${baseDate} 00:00`,
        end_date: `${baseDate} 23:59`,
        parent: "0",
        type: "project",
        priority_color: "blue",
        conflict: false,
        task_kind: "lane",
      },
      {
        id: "lane_THIRD_LINE",
        text: "🛤️ 3RD LINE / LOOP — Freight & Overtake Lane",
        start_date: `${baseDate} 00:00`,
        end_date: `${baseDate} 23:59`,
        parent: "0",
        type: "project",
        priority_color: "blue",
        conflict: false,
        task_kind: "lane",
      },
      {
        id: "lane_YARD_LINE",
        text: "🛤️ STATION YARD & LOOPS — Junction Platforms",
        start_date: `${baseDate} 00:00`,
        end_date: `${baseDate} 23:59`,
        parent: "0",
        type: "project",
        priority_color: "blue",
        conflict: false,
        task_kind: "lane",
      },
    ];

    result.push(...lanes);

    const getLaneId = (trackName?: string, direction?: string) => {
      const lower = (trackName || "").toLowerCase();
      const dirLower = (direction || "").toLowerCase();
      if (lower.includes("down") || dirLower.includes("down")) return "lane_DOWN_MAIN";
      if (lower.includes("up") || dirLower.includes("up")) return "lane_UP_MAIN";
      if (lower.includes("3rd") || lower.includes("third") || lower.includes("loop")) return "lane_THIRD_LINE";
      return "lane_YARD_LINE";
    };

    // 1. Add CP-SAT Optimizer newly scheduled items if present
    if (optResult?.schedule && Array.isArray(optResult.schedule)) {
      optResult.schedule.forEach((item: any, idx: number) => {
        const lane = getLaneId(item.track_name);
        const sTime = formatGanttDate(item.date || baseDate, item.allocated_start_time, 9, 0);
        const rawETime = formatGanttDate(item.date || baseDate, item.allocated_end_time, 11, 0);
        const eTime = ensureEndAfterStart(sTime, rawETime, item.duration_mins || 120);
        const isCritical = item.priority_tier === "CRITICAL" || item.task_priority === "CRITICAL";

        result.push({
          id: `opt_${item.task_id || idx}`,
          text: `⚡ [CP-SAT OPTIMAL] ${item.task_id}: ${item.task_title || "Maintenance Window"} (${item.duration_mins || 120}m)`,
          start_date: sTime,
          end_date: eTime,
          parent: lane,
          type: "task",
          priority_color: isCritical ? "red" : "green",
          conflict: false,
          task_kind: "opt",
          raw_opt: item,
          department: item.department_id || "PWAY",
          machine: item.assigned_machine,
          protection: item.required_protection || "TRAFFIC_BLOCK",
          priority_tier: item.priority_tier || "HIGH",
        });
      });
    }

    // 2. Add Planned & Active Blocks from blocks ledger
    if (activeBlocks && Array.isArray(activeBlocks)) {
      activeBlocks.forEach((b) => {
        const lane = getLaneId(b.track_name);
        const date = b.date || baseDate;
        const sTime = formatGanttDate(date, b.requested_start_time, 12, 0);
        const rawETime = formatGanttDate(date, b.requested_end_time, 14, 0);
        const eTime = ensureEndAfterStart(sTime, rawETime, b.duration_mins || 120);
        const isCritical = b.task_priority === "CRITICAL" || b.protection_type === "EMERGENCY_PROTECTION";
        const isApproved = b.status === "APPROVED" || b.status === "SANCTIONED" || b.status === "SELECTED";
        const hasConflict = b.conflict_status === "CONFLICT";

        result.push({
          id: b.id,
          text: `🛡️ [${b.status}] ${b.task_title || b.id} · KM ${b.location_km || "N/A"} (${b.duration_mins}m)`,
          start_date: sTime,
          end_date: eTime,
          parent: lane,
          type: "task",
          priority_color: hasConflict ? "red" : isCritical ? "orange" : isApproved ? "green" : "yellow",
          conflict: hasConflict,
          task_kind: "block",
          raw_block: b,
          department: b.department_id || "PWAY",
          machine: b.assigned_machine,
          protection: b.protection_type,
          priority_tier: b.task_priority || "MEDIUM",
        });
      });
    }

    // 3. Add Train Movements (Passenger & Freight paths)
    if (activeMovements && Array.isArray(activeMovements)) {
      activeMovements.slice(0, 15).forEach((tm, idx) => {
        const lane = getLaneId(tm.current_track, tm.direction);
        const sTime = formatGanttDate(baseDate, tm.scheduled_time || "10:00", 10 + (idx % 12), (idx * 15) % 60);
        const rawETime = formatGanttDate(baseDate, tm.estimated_time, 11 + (idx % 12), ((idx * 15) + 30) % 60);
        const eTime = ensureEndAfterStart(sTime, rawETime, 30);

        const hasDelay = tm.delay_minutes > 15;
        const isSevere = tm.delay_category === "SEVERE" || tm.delay_minutes > 45;

        result.push({
          id: `train_${tm.train_number || idx}`,
          text: `🚆 ${tm.train_number} ${tm.train_name} (${tm.direction}) ${hasDelay ? `+${tm.delay_minutes}m` : 'ON-TIME'}`,
          start_date: sTime,
          end_date: eTime,
          parent: lane,
          type: "task",
          priority_color: isSevere ? "red" : hasDelay ? "orange" : "blue",
          conflict: isSevere,
          task_kind: "train",
          raw_train: tm,
        });
      });
    }

    return result;
  }, [tasks, activeBlocks, activeMovements, optResult]);

  // Smoothly apply zoom tier and maintain cursor-centered timeline position
  const applyZoomTier = useCallback((tierIndex: number, clientX?: number) => {
    const index = Math.max(0, Math.min(ZOOM_TIERS.length - 1, tierIndex));
    const tier = ZOOM_TIERS[index];
    setZoomTierIndex(index);
    zoomTierIndexRef.current = index;

    const container = ganttContainer.current;
    let targetDate: Date | null = null;
    let mouseXInTimeline = 0;

    if (container) {
      const gridWidth = gantt.config.grid_width || 340;
      const currentScroll = typeof gantt.getScrollState === 'function' ? gantt.getScrollState() : { x: 0 };
      const rect = container.getBoundingClientRect();

      if (clientX !== undefined) {
        mouseXInTimeline = clientX - rect.left - gridWidth;
      } else {
        const viewportWidth = container.clientWidth - gridWidth;
        mouseXInTimeline = Math.max(0, viewportWidth / 2);
      }

      if (mouseXInTimeline > 0 && typeof gantt.dateFromPos === 'function') {
        try {
          const timelinePos = mouseXInTimeline + (currentScroll?.x || 0);
          targetDate = gantt.dateFromPos(timelinePos);
        } catch {
          targetDate = null;
        }
      }
    }

    gantt.config.scales = tier.scales as any;
    gantt.config.min_column_width = tier.minColumnWidth;
    gantt.config.scale_height = tier.scaleHeight;
    gantt.render();

    if (targetDate && typeof gantt.posFromDate === 'function' && typeof gantt.scrollTo === 'function') {
      try {
        const newPos = gantt.posFromDate(targetDate);
        const newScrollX = Math.max(0, newPos - mouseXInTimeline);
        gantt.scrollTo(newScrollX, null);
      } catch {
        // Fallback safely
      }
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (zoomTierIndexRef.current > 0) {
      applyZoomTier(zoomTierIndexRef.current - 1);
    }
  }, [applyZoomTier]);

  const zoomOut = useCallback(() => {
    if (zoomTierIndexRef.current < ZOOM_TIERS.length - 1) {
      applyZoomTier(zoomTierIndexRef.current + 1);
    }
  }, [applyZoomTier]);

  useEffect(() => {
    if (!ganttContainer.current) return;

    const eventIds: string[] = [];

    // Enable DHTMLX Plugins
    gantt.plugins({
      tooltip: true,
      quick_info: false,
    });

    gantt.config.columns = [
      { name: "text", label: "Corridor Track Lane / Operational Task", tree: true, width: 340, resize: true },
      { name: "start_date", label: "Start", align: "center", width: 90 },
      { name: "end_date", label: "End", align: "center", width: 90 },
    ];

    gantt.templates.task_class = (_start, _end, task: any) => {
      const classes = [];
      if (task.type === "project") {
        classes.push("gantt-project-lane font-bold");
      }
      if (task.priority_color) {
        classes.push(`priority-${task.priority_color.toLowerCase()}`);
      }
      if (task.conflict) {
        classes.push("gantt-conflict-marker");
      }
      if (task.task_kind === "train" || task.id.toString().startsWith("train_")) {
        classes.push("gantt-train-bar");
      } else if (task.type !== "project") {
        classes.push("gantt-block-bar");
      }
      return classes.join(" ");
    };

    // Rich Custom Tooltip Template
    gantt.templates.tooltip_text = (_start, _end, task: any) => {
      if (task.type === "project") {
        return `<div style="font-weight:700;font-size:12px;">${task.text}</div><div style="font-size:10px;color:#94a3b8;margin-top:2px;">Corridor Spine Lane (Tracks & Loops)</div>`;
      }

      // Train Tooltip
      if (task.task_kind === "train" || task.raw_train || task.id.toString().startsWith("train_")) {
        const tm = task.raw_train;
        const trainNum = tm?.train_number || task.id.replace("train_", "");
        const trainName = tm?.train_name || "Express Service";
        const type = tm?.train_type || "PASSENGER";
        const service = tm?.service_type || "EXPRESS";
        const dir = tm?.direction || "DOWN";
        const sched = tm?.scheduled_time || "N/A";
        const est = tm?.estimated_time || "N/A";
        const delay = tm?.delay_minutes ?? 0;
        const delayCat = tm?.delay_category || (delay > 15 ? "MODERATE" : "ON_TIME");
        const delayColor = delay > 15 ? "#ef4444" : "#10b981";

        return `
          <div style="padding:2px;font-family:monospace;font-size:11px;min-width:260px;">
            <div style="font-weight:700;font-size:13px;color:#38bdf8;border-bottom:1px solid #334155;padding-bottom:4px;margin-bottom:6px;">
              🚆 ${trainNum} · ${trainName}
            </div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 8px;font-size:11px;">
              <span style="color:#94a3b8;">Service:</span><span>${type} (${service}) · ${dir}</span>
              <span style="color:#94a3b8;">Timetable:</span><span>${sched} → ${est}</span>
              <span style="color:#94a3b8;">Delay:</span><span style="color:${delayColor};font-weight:700;">${delay > 0 ? `+${delay}m` : '0m'} (${delayCat})</span>
              ${tm?.current_track ? `<span style="color:#94a3b8;">Track / KM:</span><span>${tm.current_track} · KM ${tm.current_km || 'N/A'}</span>` : ''}
              ${tm?.hold_location ? `<span style="color:#f59e0b;font-weight:700;">Hold:</span><span style="color:#f59e0b;">${tm.hold_location} (${tm.hold_reason || 'Regulated'})</span>` : ''}
            </div>
            <div style="font-size:9px;color:#64748b;margin-top:6px;border-top:1px solid #334155;padding-top:4px;">
              Click bar to inspect full movement specs
            </div>
          </div>
        `;
      }

      // Maintenance Block Tooltip
      const b = task.raw_block;
      const opt = task.raw_opt;
      const blockId = b?.id || opt?.task_id || task.id;
      const taskTitle = b?.task_title || opt?.task_title || task.text;
      const dept = b?.department_id || opt?.department_id || task.department || "PWAY";
      const protection = b?.protection_type || opt?.required_protection || task.protection || "TRAFFIC_BLOCK";
      const machine = b?.assigned_machine || opt?.assigned_machine || task.machine || "Manual Gang";
      const prio = b?.task_priority || opt?.priority_tier || task.priority_tier || "HIGH";
      const status = b?.status || (opt ? "OPTIMAL_SCHEDULE" : "PLANNED");
      const powerIso = b?.power_isolation_required || opt?.requires_power_isolation ? "25kV Isolated" : "Not Required";
      const prioColor = prio === "CRITICAL" ? "#ef4444" : prio === "HIGH" ? "#f97316" : "#10b981";

      return `
        <div style="padding:2px;font-family:monospace;font-size:11px;min-width:280px;">
          <div style="font-weight:700;font-size:13px;color:#4ade80;border-bottom:1px solid #334155;padding-bottom:4px;margin-bottom:6px;display:flex;justify-content:space-between;">
            <span>🛡️ ${blockId}</span>
            <span style="font-size:10px;background:#1e293b;padding:1px 4px;border-radius:3px;color:#38bdf8;">${status}</span>
          </div>
          <div style="font-weight:600;color:#f8fafc;margin-bottom:6px;">${taskTitle}</div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 8px;font-size:11px;">
            <span style="color:#94a3b8;">Department:</span><span>${dept}</span>
            <span style="color:#94a3b8;">Priority:</span><span style="color:${prioColor};font-weight:700;">${prio}</span>
            <span style="color:#94a3b8;">Protection:</span><span>${protection}</span>
            <span style="color:#94a3b8;">Power (OHE):</span><span>${powerIso}</span>
            <span style="color:#94a3b8;">Machine:</span><span>${machine}</span>
          </div>
          <div style="font-size:9px;color:#93c5fd;margin-top:6px;border-top:1px solid #334155;padding-top:4px;">
            💡 Click to inspect specs · Right-click for Controller Override
          </div>
        </div>
      `;
    };

    // Configure Interactive Dragging & Resizing for Maintenance Blocks
    gantt.config.drag_move = true;
    gantt.config.drag_resize = true;
    gantt.config.drag_progress = false;
    gantt.config.drag_links = false;
    gantt.config.smart_rendering = false;
    gantt.config.date_format = "%Y-%m-%d %H:%i";
    gantt.config.row_height = 36;
    gantt.config.readonly = false;

    // Apply active zoom scale
    const activeTier = ZOOM_TIERS[zoomTierIndexRef.current];
    gantt.config.scales = activeTier.scales as any;
    gantt.config.min_column_width = activeTier.minColumnWidth;
    gantt.config.scale_height = activeTier.scaleHeight;

    // Prevent dragging project lanes or train paths (Only maintenance blocks can be dragged/resized)
    const dragBeforeId = gantt.attachEvent("onBeforeTaskDrag", (id) => {
      const task = gantt.getTask(id);
      if (task.type === "project" || task.task_kind === "train" || id.toString().startsWith("train_")) {
        return false; // Trains & project lanes are locked / read-only
      }
      return true; // Allow maintenance blocks to be moved and resized
    });
    eventIds.push(dragBeforeId);

    // Update block times when user finishes dragging/resizing
    const dragAfterId = gantt.attachEvent("onAfterTaskDrag", (id, mode) => {
      const task = gantt.getTask(id);
      if (!task.start_date || !task.end_date) return;
      const sStr = gantt.date.date_to_str("%H:%i")(task.start_date);
      const eStr = gantt.date.date_to_str("%H:%i")(task.end_date);
      const durMins = Math.max(15, Math.round((task.end_date.getTime() - task.start_date.getTime()) / 60000));

      if (task.raw_block) {
        task.raw_block.requested_start_time = sStr;
        task.raw_block.requested_end_time = eStr;
        task.raw_block.duration_mins = durMins;
      }
      if (task.raw_opt) {
        task.raw_opt.allocated_start_time = sStr;
        task.raw_opt.allocated_end_time = eStr;
        task.raw_opt.duration_mins = durMins;
      }
      task.text = task.text.replace(/\(\d+m\)/, `(${durMins}m)`);
      gantt.updateTask(id);
    });
    eventIds.push(dragAfterId);

    // Click to Inspect: Open Detailed Specifications Drawer
    const clickId = gantt.attachEvent("onTaskClick", (id) => {
      const task = gantt.getTask(id);
      if (task.type !== "project") {
        setSelectedTask(task);
      }
      return true;
    });
    eventIds.push(clickId);

    // Working Right-Click Context Menu for Overrides
    const ctxId = gantt.attachEvent("onContextMenu", (taskId, _linkId, e: any) => {
      if (e) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
      }
      if (taskId) {
        const task = gantt.getTask(taskId);
        if (task.type !== "project") {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            taskId: taskId.toString(),
            taskText: task.text,
            task: task,
          });
          return false;
        }
      }
      setContextMenu(null);
      return false;
    });
    eventIds.push(ctxId);

    const emptyClickId = gantt.attachEvent("onEmptyClick", () => {
      setContextMenu(null);
    });
    eventIds.push(emptyClickId);

    // Native right-click interceptor on container to prevent browser default context menu
    const domElem = ganttContainer.current;
    const handleNativeContext = (e: MouseEvent) => {
      e.preventDefault();
    };
    domElem.addEventListener("contextmenu", handleNativeContext);

    // Native wheel zoom & horizontal pan listener (passive: false is essential for preventDefault)
    let accumulatedDelta = 0;
    let lastZoomTime = 0;
    const WHEEL_THRESHOLD = 45;
    const COOLDOWN_MS = 80;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest('.gantt-inspection-drawer') || target.closest('.gantt-context-menu'))) {
        return;
      }

      // Horizontal panning via Trackpad swipe or Shift+Wheel
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 8) {
        if (typeof gantt.getScrollState === 'function' && typeof gantt.scrollTo === 'function') {
          const scrollState = gantt.getScrollState();
          gantt.scrollTo((scrollState?.x || 0) + e.deltaX, null);
          e.preventDefault();
        }
        return;
      }

      if (e.shiftKey) {
        if (typeof gantt.getScrollState === 'function' && typeof gantt.scrollTo === 'function') {
          const scrollState = gantt.getScrollState();
          gantt.scrollTo((scrollState?.x || 0) + e.deltaY, null);
          e.preventDefault();
        }
        return;
      }

      // Zoom if wheelZoomMode is on, or holding Ctrl/Meta (trackpad pinch), or hovering over time scale header
      const isOverScaleHeader = !!(
        target && (
          target.closest('.gantt_task_scale') ||
          target.closest('.gantt_scale_line') ||
          target.closest('.gantt_grid_scale') ||
          target.closest('.gantt_task_header')
        )
      );

      const shouldZoom = wheelZoomModeRef.current || e.ctrlKey || e.metaKey || isOverScaleHeader;
      if (!shouldZoom) {
        return;
      }

      // Prevent browser zoom or window scrolling
      e.preventDefault();

      const now = performance.now();
      accumulatedDelta += e.deltaY;

      if (Math.abs(accumulatedDelta) >= WHEEL_THRESHOLD && (now - lastZoomTime) >= COOLDOWN_MS) {
        const zoomStep = accumulatedDelta < 0 ? -1 : 1; // deltaY < 0 = scroll up -> zoom in; deltaY > 0 = scroll down -> zoom out
        accumulatedDelta = 0;
        lastZoomTime = now;

        const currentIndex = zoomTierIndexRef.current;
        const nextIndex = Math.max(0, Math.min(ZOOM_TIERS.length - 1, currentIndex + zoomStep));

        if (nextIndex !== currentIndex) {
          applyZoomTier(nextIndex, e.clientX);
        }
      }
    };

    domElem.addEventListener("wheel", handleWheel, { passive: false });

    // Initialize and Parse
    gantt.init(ganttContainer.current);
    gantt.clearAll();
    gantt.parse({ data: formattedTasks, links: [] });
    gantt.render();

    return () => {
      domElem.removeEventListener("wheel", handleWheel);
      domElem.removeEventListener("contextmenu", handleNativeContext);
      eventIds.forEach((id) => {
        try {
          gantt.detachEvent(id);
        } catch {}
      });
      gantt.clearAll();
    };
  }, [formattedTasks, applyZoomTier]);

  const handleOverride = (type: 'LOCK_POSSESSION' | 'REJECT_CANDIDATE') => {
    if (!contextMenu) return;

    overrideMutation.mutate(
      { type, taskId: contextMenu.taskId },
      {
        onSettled: () => setContextMenu(null)
      }
    );
  };

  const handleInspectReasoning = () => {
    const task = contextMenu?.task || selectedTask;
    if (!task) return;
    const taskId = task.raw_opt?.task_id || task.raw_block?.task_id || task.id;
    const fallbackItem = task.raw_opt || task.raw_block || task;
    setContextMenu(null);
    if (onOpenReasoning) {
      onOpenReasoning(taskId, fallbackItem);
    }
  };

  return (
    <div
      className="h-full w-full flex flex-col relative rounded-xl overflow-hidden border border-slate-200 bg-white select-none"
      onClick={() => contextMenu && setContextMenu(null)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Interactive Toolbar: Scale / Zoom & Quick Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border-b border-slate-200 text-xs">
        {/* Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-bold text-slate-700 font-mono text-[11px] uppercase flex items-center gap-1">
            <ZoomIn className="w-3.5 h-3.5 text-sky-600" />
            Zoom / Scale:
          </span>

          {/* Stepper Controls [-] Active Label [+] */}
          <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoomTierIndex === 0}
              className={`px-2 py-1 font-bold border-r border-slate-200 transition-colors flex items-center justify-center cursor-pointer ${
                zoomTierIndex === 0
                  ? "text-slate-300 bg-slate-50 cursor-not-allowed"
                  : "text-slate-700 hover:bg-slate-100 hover:text-sky-700 active:bg-slate-200"
              }`}
              title="Zoom In (Finer time scale)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <span className="px-2.5 py-1 font-mono font-bold text-slate-800 bg-slate-50 text-[11px] min-w-[65px] text-center select-none">
              {ZOOM_TIERS[zoomTierIndex].label}
            </span>

            <button
              type="button"
              onClick={zoomOut}
              disabled={zoomTierIndex === ZOOM_TIERS.length - 1}
              className={`px-2 py-1 font-bold border-l border-slate-200 transition-colors flex items-center justify-center cursor-pointer ${
                zoomTierIndex === ZOOM_TIERS.length - 1
                  ? "text-slate-300 bg-slate-50 cursor-not-allowed"
                  : "text-slate-700 hover:bg-slate-100 hover:text-sky-700 active:bg-slate-200"
              }`}
              title="Zoom Out (Broader time scale)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => applyZoomTier(1)} // 15min
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                zoomTierIndex === 1
                  ? "bg-white text-sky-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="15-minute intervals for detailed section dispatching"
            >
              15 Min
            </button>
            <button
              type="button"
              onClick={() => applyZoomTier(3)} // 1hour
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                zoomTierIndex === 3
                  ? "bg-white text-sky-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Hourly standard corridor operations view"
            >
              1 Hour
            </button>
            <button
              type="button"
              onClick={() => applyZoomTier(7)} // 24hour
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                zoomTierIndex === 7
                  ? "bg-white text-sky-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Daily macro planning horizon"
            >
              24 Hours
            </button>
          </div>

          {/* Wheel Zoom Mode Toggle */}
          <button
            type="button"
            onClick={() => setWheelZoomMode(!wheelZoomMode)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-mono font-medium transition-colors cursor-pointer shadow-2xs ${
              wheelZoomMode
                ? "bg-sky-50 border-sky-300 text-sky-800"
                : "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
            }`}
            title="Toggle between mouse wheel zooming timeline vs scrolling"
          >
            <span>{wheelZoomMode ? "🔍" : "↕️"}</span>
            <span>Wheel: <strong>{wheelZoomMode ? "Zoom" : "Pan"}</strong></span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block"></span>
            <span className="text-slate-600 font-medium">Approved / Optimal</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block"></span>
            <span className="text-slate-600 font-medium">Planned</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-600 inline-block"></span>
            <span className="text-slate-600 font-medium">Critical / Conflict</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block"></span>
            <span className="text-slate-600 font-medium">Train Path (Locked)</span>
          </div>
        </div>

        {/* Action hint */}
        <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1">
          <Info className="w-3.5 h-3.5 text-sky-500" />
          <span>Scroll wheel / pinch to Zoom · Shift+Scroll to Pan · Click to Inspect</span>
        </div>
      </div>

      {/* Main Gantt Canvas */}
      <div className="relative flex-1 min-h-[560px] w-full overflow-hidden">
        <div
          ref={ganttContainer}
          className="h-full w-full min-h-[560px]"
        />

        {/* Slide-Over Inspection Drawer for Selected Item */}
        {selectedTask && (
          <div
            className="gantt-inspection-drawer absolute top-0 right-0 h-full w-80 sm:w-96 bg-white/95 backdrop-blur-md border-l border-slate-300 shadow-2xl z-40 flex flex-col transition-transform animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                {selectedTask.task_kind === "train" ? (
                  <Train className="w-5 h-5 text-sky-400" />
                ) : (
                  <Shield className="w-5 h-5 text-emerald-400" />
                )}
                <div>
                  <h3 className="font-bold text-sm tracking-tight font-mono">
                    {selectedTask.raw_train
                      ? `TRAIN ${selectedTask.raw_train.train_number}`
                      : selectedTask.raw_block?.id || selectedTask.raw_opt?.task_id || selectedTask.id}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {selectedTask.task_kind === "train" ? "Live Train Movement" : "Maintenance Possession Block"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
              {/* Train Movement Details */}
              {selectedTask.task_kind === "train" && selectedTask.raw_train ? (
                <>
                  <div className="bg-sky-50 p-3 rounded-lg border border-sky-200 space-y-1">
                    <span className="text-[10px] text-sky-800 font-bold uppercase tracking-wider">Train Information</span>
                    <div className="text-sm font-bold text-slate-900">{selectedTask.raw_train.train_name}</div>
                    <div className="text-slate-600">
                      {selectedTask.raw_train.origin} → {selectedTask.raw_train.destination}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Service Type</span>
                      <span className="font-bold text-slate-800">{selectedTask.raw_train.train_type}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Direction</span>
                      <span className="font-bold text-slate-800">{selectedTask.raw_train.direction}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Scheduled Entry</span>
                      <span className="font-bold text-slate-800">{selectedTask.raw_train.scheduled_time}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Estimated Entry</span>
                      <span className="font-bold text-slate-800">{selectedTask.raw_train.estimated_time}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Delay & Telemetry</span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Delay Status:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        selectedTask.raw_train.delay_minutes > 15
                          ? "bg-red-100 text-red-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {selectedTask.raw_train.delay_minutes > 0 ? `+${selectedTask.raw_train.delay_minutes} mins` : "On Time"} ({selectedTask.raw_train.delay_category})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Track Position:</span>
                      <span className="font-bold text-slate-800">
                        {selectedTask.raw_train.current_track} · KM {selectedTask.raw_train.current_km}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Speed:</span>
                      <span className="font-bold text-slate-800">{selectedTask.raw_train.speed_kmph} km/h</span>
                    </div>
                  </div>

                  {selectedTask.raw_train.hold_location && (
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-300 text-amber-950 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Operational Hold Active
                      </span>
                      <div>Held at: <strong>{selectedTask.raw_train.hold_location}</strong></div>
                      <div className="text-[10px] text-amber-800">{selectedTask.raw_train.hold_reason || "Regulated for maintenance corridor"}</div>
                    </div>
                  )}
                </>
              ) : (
                /* Maintenance Block Details */
                <>
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                        {selectedTask.raw_block?.status || "OPTIMAL_SCHEDULE"}
                      </span>
                      <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold">
                        {selectedTask.raw_block?.task_priority || selectedTask.raw_opt?.priority_tier || "HIGH"}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {selectedTask.raw_block?.task_title || selectedTask.raw_opt?.task_title || selectedTask.text}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Originating Task: {selectedTask.raw_block?.task_id || selectedTask.raw_opt?.task_id || "N/A"}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Possession Window</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Start Time</span>
                        <span className="font-bold text-slate-800">
                          {selectedTask.raw_block?.requested_start_time || selectedTask.raw_opt?.allocated_start_time || "12:00"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">End Time</span>
                        <span className="font-bold text-slate-800">
                          {selectedTask.raw_block?.requested_end_time || selectedTask.raw_opt?.allocated_end_time || "14:00"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Duration</span>
                        <span className="font-bold text-emerald-700">
                          {selectedTask.raw_block?.duration_mins || selectedTask.raw_opt?.duration_mins || 120} mins
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Track Line</span>
                        <span className="font-bold text-slate-800">
                          {selectedTask.raw_block?.track_name || selectedTask.raw_opt?.track_name || "DOWN_MAIN"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Engineering Specs</span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Department:</span>
                      <span className="font-bold text-slate-800">
                        {selectedTask.raw_block?.department_id || selectedTask.raw_opt?.department_id || "PWAY"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Protection:</span>
                      <span className="font-bold text-slate-800">
                        {selectedTask.raw_block?.protection_type || selectedTask.raw_opt?.required_protection || "TRAFFIC_BLOCK"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">25kV Traction Power:</span>
                      <span className="font-bold text-amber-700 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-600" />
                        {selectedTask.raw_block?.power_isolation_required || selectedTask.raw_opt?.requires_power_isolation
                          ? "Isolated (OHE Disconnect)"
                          : "Permitted Energized"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Machinery:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[180px]" title={selectedTask.raw_block?.assigned_machine || selectedTask.raw_opt?.assigned_machine}>
                        {selectedTask.raw_block?.assigned_machine || selectedTask.raw_opt?.assigned_machine || "Plasser 09-32 CSM Tamper"}
                      </span>
                    </div>
                  </div>

                  {selectedTask.raw_block?.conflict_summary && (
                    <div className={`p-3 rounded-lg border text-[11px] space-y-1 ${
                      selectedTask.raw_block.conflict_status === "CONFLICT"
                        ? "bg-red-50 border-red-300 text-red-900"
                        : "bg-emerald-50 border-emerald-300 text-emerald-900"
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        {selectedTask.raw_block.conflict_status === "CONFLICT" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        Conflict Status: {selectedTask.raw_block.conflict_status}
                      </span>
                      <div>{selectedTask.raw_block.conflict_summary}</div>
                    </div>
                  )}

                  {/* Quick Override Actions */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => handleInspectReasoning()}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center space-x-1.5 transition-colors border border-indigo-200 cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Inspect AI Decision Rationale</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const bId = selectedTask.raw_block?.id || selectedTask.raw_opt?.task_id || selectedTask.id;
                          overrideMutation.mutate({ type: 'LOCK_POSSESSION', taskId: bId });
                          setSelectedTask(null);
                        }}
                        className="py-2 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer shadow-xs text-[11px]"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Lock Possession</span>
                      </button>
                      <button
                        onClick={() => {
                          const bId = selectedTask.raw_block?.id || selectedTask.raw_opt?.task_id || selectedTask.id;
                          overrideMutation.mutate({ type: 'REJECT_CANDIDATE', taskId: bId });
                          setSelectedTask(null);
                        }}
                        className="py-2 px-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer shadow-xs text-[11px]"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Reject Candidate</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Custom Floating Context Menu */}
        {contextMenu && (
          <div
            className="gantt-context-menu fixed bg-white border border-slate-300 rounded-lg shadow-2xl py-1.5 z-50 w-64 text-xs font-mono animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 200),
              left: Math.min(contextMenu.x, window.innerWidth - 270),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-slate-200 mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Controller Override</span>
              <div className="font-bold text-slate-900 truncate mt-0.5" title={contextMenu.taskText}>
                {contextMenu.taskText}
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedTask(contextMenu.task);
                setContextMenu(null);
              }}
              className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Eye size={13} className="text-slate-500" />
              <span>Inspect Full Specifications</span>
            </button>

            {onOpenReasoning && (
              <button
                onClick={handleInspectReasoning}
                className="w-full text-left px-3.5 py-1.5 hover:bg-indigo-50 text-indigo-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles size={13} className="text-indigo-600" />
                <span>Inspect AI Reasoning</span>
              </button>
            )}

            <button
              onClick={() => handleOverride('LOCK_POSSESSION')}
              className="w-full text-left px-3.5 py-1.5 hover:bg-emerald-50 text-emerald-800 flex items-center gap-2 transition-colors cursor-pointer font-medium"
            >
              <Lock size={13} className="text-emerald-600" />
              <span>Lock Block Possession</span>
            </button>

            <button
              onClick={() => handleOverride('REJECT_CANDIDATE')}
              className="w-full text-left px-3.5 py-1.5 hover:bg-red-50 text-red-700 flex items-center gap-2 transition-colors cursor-pointer font-medium"
            >
              <XCircle size={13} className="text-red-600" />
              <span>Reject / Cancel Block</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        /* Tooltip Dark Railway Styling */
        .gantt_tooltip {
          background-color: #0f172a !important;
          color: #f8fafc !important;
          border: 1px solid #334155 !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4) !important;
          padding: 8px 12px !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
          font-size: 11px !important;
          line-height: 1.4 !important;
          z-index: 99999 !important;
          pointer-events: none !important;
          max-width: 340px !important;
        }

        /* Priority Bar Colors */
        .gantt_task_line.priority-red { background-color: #DC2626 !important; border-color: #991B1B !important; }
        .gantt_task_line.priority-orange { background-color: #EA580C !important; border-color: #9A3412 !important; }
        .gantt_task_line.priority-yellow { background-color: #D97706 !important; border-color: #B45309 !important; color: #FFFFFF !important; }
        .gantt_task_line.priority-blue { background-color: #2563EB !important; border-color: #1E40AF !important; }
        .gantt_task_line.priority-green { background-color: #16A34A !important; border-color: #166534 !important; }

        .gantt_task_line.gantt-conflict-marker {
          border: 2px dashed #DC2626 !important;
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.7) !important;
          background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.15) 10px, rgba(0,0,0,0.15) 20px);
        }

        .gantt-project-lane {
          background-color: #0b2545 !important;
          border-color: #134074 !important;
          color: #ffffff !important;
          font-weight: 700;
        }

        .gantt_grid_scale, .gantt_task_scale {
          background-color: #F8FAFC !important;
          color: #334155 !important;
          font-weight: 600 !important;
        }
        .gantt_row.gantt_row_project {
          background-color: #F1F5F9 !important;
          font-weight: 700 !important;
        }

        /* Distinct styles for draggable blocks vs locked trains */
        .gantt-block-bar {
          cursor: grab !important;
        }
        .gantt-block-bar:active {
          cursor: grabbing !important;
        }
        .gantt-train-bar {
          cursor: pointer !important;
          opacity: 0.95;
        }
      `}</style>
    </div>
  );
};
