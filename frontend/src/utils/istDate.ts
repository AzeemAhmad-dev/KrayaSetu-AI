/**
 * IST (Asia/Kolkata) Date & Time Utilities for KrayaSetu AI
 * Standardizes all date generation across frontend to Indian Standard Time (UTC+5:30).
 * Prevents midnight UTC date skew bugs in Marey diagram and Block Planner.
 */

/**
 * Returns the current date in Indian Standard Time (Asia/Kolkata) as 'YYYY-MM-DD'.
 */
export function getISTDateString(date: Date = new Date()): string {
  // Use en-CA locale which outputs standard ISO YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Returns current time string in Indian Standard Time as 'HH:MM:SS' or 'HH:MM'.
 */
export function getISTTimeString(date: Date = new Date(), includeSeconds: boolean = true): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
    hour12: false,
  }).format(date);
}

/**
 * Adds days to a given YYYY-MM-DD string and returns the new YYYY-MM-DD string.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}
