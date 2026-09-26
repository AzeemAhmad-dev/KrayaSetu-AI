/**
 * Planned Blocks Helper for KrayaSetu AI
 * Provides date windows, corridor filtering, and remarks sanitization
 * for Daily / Weekly / Monthly planned block visibility views.
 */

import { getISTDateString } from "./istDate";

export const CURRENT_SYSTEM_DATE = getISTDateString();

export interface ActiveCorridorMeta {
  id: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
}

export const ACTIVE_CORRIDORS: ActiveCorridorMeta[] = [
  { id: "CORR-01", name: "Itarsi – Bhopal", code: "ET-BPL", origin: "Itarsi Junction (ET)", destination: "Bhopal Junction (BPL)" },
  { id: "CORR-02", name: "Bhopal – Bina", code: "BPL-BINA", origin: "Bhopal Junction (BPL)", destination: "Bina Junction (BINA)" },
  { id: "CORR-03", name: "Khandwa – Itarsi", code: "KNW-ET", origin: "Khandwa Junction (KNW)", destination: "Itarsi Junction (ET)" },
  { id: "CORR-04", name: "Bina – Guna", code: "BINA-GUNA", origin: "Bina Junction (BINA)", destination: "Guna Junction (GUNA)" },
  { id: "CORR-05", name: "Guna – Gwalior", code: "GUNA-GWL", origin: "Guna Junction (GUNA)", destination: "Gwalior Junction (GWL)" },
];

export const ACTIVE_CORRIDOR_IDS = new Set(["CORR-01", "CORR-02", "CORR-03", "CORR-04", "CORR-05"]);

export function isRuthiyaiMaksiExcluded(corridorId?: string, text?: string): boolean {
  if (!corridorId && !text) return false;
  const check = `${corridorId || ""} ${text || ""}`.toLowerCase();
  return check.includes("maksi") || check.includes("ruthiyai-maksi") || check.includes("ruthiyai  maksi");
}

export function getBlockDate(b: {
  scheduled_date?: string;
  execution_date?: string;
  date?: string;
  planning_date?: string;
  scheduledDate?: string;
}): string {
  return b.scheduled_date || b.execution_date || b.scheduledDate || b.date || b.planning_date || CURRENT_SYSTEM_DATE;
}

export function parseDateParts(dateStr: string): [number, number, number] | null {
  if (!dateStr) return null;
  const clean = dateStr.trim().split("T")[0].split(" ")[0];
  const parts = clean.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return [parts[0], parts[1], parts[2]];
}

export function getWeekRange(dateStr: string): { mondayStr: string; sundayStr: string } | null {
  const parts = parseDateParts(dateStr);
  if (!parts) return null;
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dt.getUTCDay(); // 0 is Sun, 1 is Mon...
  const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const mon = new Date(dt.getTime() + diffToMon * 86400000);
  const sun = new Date(mon.getTime() + 6 * 86400000);
  return {
    mondayStr: mon.toISOString().split("T")[0],
    sundayStr: sun.toISOString().split("T")[0],
  };
}

/**
 * Filter planned blocks for the selected corridor where date matches current day
 */
export function isDailyBlock(b: any, refDate: string = CURRENT_SYSTEM_DATE): boolean {
  const d = getBlockDate(b);
  if (!d) return false;
  const cleanD = d.split("T")[0].split(" ")[0];
  const cleanRef = refDate.split("T")[0].split(" ")[0];
  return cleanD === cleanRef;
}

/**
 * Filter planned blocks scheduled for the current week (Monday to Sunday)
 */
export function isWeeklyBlock(b: any, refDate: string = CURRENT_SYSTEM_DATE): boolean {
  const d = getBlockDate(b);
  if (!d) return false;
  const cleanD = d.split("T")[0].split(" ")[0];
  const range = getWeekRange(refDate);
  if (!range) return false;
  return cleanD >= range.mondayStr && cleanD <= range.sundayStr;
}

/**
 * Filter planned blocks scheduled for the current calendar month
 */
export function isMonthlyBlock(b: any, refDate: string = CURRENT_SYSTEM_DATE): boolean {
  const d = getBlockDate(b);
  if (!d) return false;
  const cleanD = d.split("T")[0].split(" ")[0];
  const refMonth = refDate.slice(0, 7);
  return cleanD.startsWith(refMonth);
}

/**
 * Strips raw JSON objects/dumps and extracts clean human notes if present
 */
export function cleanApprovalRemarks(notes?: string | null): string | null {
  if (!notes) return null;
  const trimmed = notes.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed.approval_notes || parsed.selection_notes || parsed.rejection_notes || parsed.notes || null;
    } catch {
      return null;
    }
  }
  return trimmed;
}
