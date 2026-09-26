/**
 * Global distance formatter for KrayaSetu AI.
 * Formats every distance / location value in kilometers (KM) with EXACTLY TWO DECIMAL PLACES.
 * 
 * Examples:
 * - 12 -> "12.00 km"
 * - 8.5 -> "8.50 km"
 * - 0.25 -> "0.25 km"
 * - 0 -> "0.00 km"
 * - null / undefined -> "0.00 km"
 */

export function formatDistanceKm(km: number | string | null | undefined): string {
  if (km === null || km === undefined || km === "") return "0.00 km";
  const num = typeof km === "string" ? parseFloat(km) : km;
  if (isNaN(num)) return "0.00 km";
  return `${num.toFixed(2)} km`;
}

export function formatKmValue(km: number | string | null | undefined): string {
  if (km === null || km === undefined || km === "") return "0.00";
  const num = typeof km === "string" ? parseFloat(km) : km;
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
}

export function formatKmBadge(km: number | string | null | undefined): string {
  return `KM ${formatKmValue(km)}`;
}
