/**
 * Bhopal Railway Division / Bhopal Regional Corridor Configuration
 * Specifically: Bina Jn (0 km) -> Itarsi Jn (231 km)
 * Primary reference: Working Time-Table & Central Control Marey Diagram
 */

export interface BhopalStation {
  code: string;
  name: string;
  shortName: string;
  hindiName?: string;
  km: number;
  isMajor: boolean;
  lat: number;
  lon: number;
}

export const BHOPAL_CORRIDOR_STATIONS: BhopalStation[] = [
  { code: "BINA", name: "BINA JN", shortName: "BINA", hindiName: "बीना जंक्शन", km: 0, isMajor: true, lat: 24.175, lon: 78.183 },
  { code: "MABA", name: "MANDI BAMORA", shortName: "MABA", hindiName: "मंडी बामोरा", km: 17, isMajor: false, lat: 24.062, lon: 78.077 },
  { code: "KAH", name: "KALHAR", shortName: "KAH", hindiName: "कल्हार", km: 26, isMajor: false, lat: 23.993, lon: 78.012 },
  { code: "BET", name: "BARETH", shortName: "BET", hindiName: "बरेठ", km: 36, isMajor: false, lat: 23.918, lon: 77.940 },
  { code: "BAQ", name: "GANJ BASODA", shortName: "BAQ", hindiName: "गंज बासोदा", km: 46, isMajor: true, lat: 23.850, lon: 77.935 },
  { code: "PAV", name: "PABAI", shortName: "PAV", hindiName: "पबई", km: 55, isMajor: false, lat: 23.785, lon: 77.892 },
  { code: "GLG", name: "GULABGANJ", shortName: "GLG", hindiName: "गुलाबगंज", km: 63, isMajor: false, lat: 23.712, lon: 77.850 },
  { code: "SUMR", name: "SUMER", shortName: "SUMR", hindiName: "सुमेर", km: 71, isMajor: false, lat: 23.645, lon: 77.830 },
  { code: "BHS", name: "VIDISHA", shortName: "BHS", hindiName: "विदिशा", km: 85, isMajor: true, lat: 23.525, lon: 77.817 },
  { code: "SOR", name: "SORAI", shortName: "SOR", hindiName: "सोराई", km: 91, isMajor: false, lat: 23.475, lon: 77.785 },
  { code: "SCI", name: "SANCHI", shortName: "SCI", hindiName: "सांची", km: 94, isMajor: false, lat: 23.486, lon: 77.738 },
  { code: "SMX", name: "SALAMATPUR", shortName: "SMX", hindiName: "सलामतपुर", km: 101, isMajor: false, lat: 23.442, lon: 77.685 },
  { code: "DWG", name: "DEWANGANJ", shortName: "DWG", hindiName: "दीवानगंज", km: 108, isMajor: false, lat: 23.398, lon: 77.632 },
  { code: "BVA", name: "BHADBHADA GHAT", shortName: "BVA", hindiName: "भदभदा घाट", km: 116, isMajor: false, lat: 23.360, lon: 77.585 },
  { code: "SUW", name: "SUKHI SEWANIYA", shortName: "SUW", hindiName: "सूखी सेवनिया", km: 124, isMajor: false, lat: 23.315, lon: 77.525 },
  { code: "NSZ", name: "NISHATPURA", shortName: "NSZ", hindiName: "निशातपुरा", km: 134, isMajor: false, lat: 23.275, lon: 77.425 },
  { code: "BPL", name: "BHOPAL JN", shortName: "BPL", hindiName: "भोपाल जंक्शन", km: 138, isMajor: true, lat: 23.268, lon: 77.412 },
  { code: "RKMP", name: "KAMALAPATI", shortName: "RKMP", hindiName: "रानी कमलापति", km: 144, isMajor: true, lat: 23.220, lon: 77.438 },
  { code: "MDDP", name: "MANDIDEEP", shortName: "MDDP", hindiName: "मंडीदीप", km: 161, isMajor: false, lat: 23.080, lon: 77.518 },
  { code: "ODG", name: "OBAIDULLA GANJ", shortName: "ODG", hindiName: "ओबैदुल्लागंज", km: 174, isMajor: false, lat: 22.980, lon: 77.650 },
  { code: "BKA", name: "BARKHERA", shortName: "BKA", hindiName: "बरखेड़ा", km: 183, isMajor: false, lat: 22.910, lon: 77.720 },
  { code: "MDG", name: "MIDGHAT", shortName: "MDG", hindiName: "मिडघाट", km: 192, isMajor: false, lat: 22.845, lon: 77.740 },
  { code: "CHQ", name: "CHOKA", shortName: "CHQ", hindiName: "चौका", km: 198, isMajor: false, lat: 22.802, lon: 77.755 },
  { code: "BNI", name: "BUDNI", shortName: "BNI", hindiName: "बुधनी", km: 205, isMajor: false, lat: 22.775, lon: 77.770 },
  { code: "NDPM", name: "HOSHANGABAD / NARMADAPURAM", shortName: "NDPM", hindiName: "नर्मदापुरम", km: 212, isMajor: true, lat: 22.750, lon: 77.725 },
  { code: "PRB", name: "POWARKHEDA", shortName: "PRB", hindiName: "पंवारखेड़ा", km: 223, isMajor: false, lat: 22.700, lon: 77.740 },
  { code: "ET", name: "ITARSI JN", shortName: "ET", hindiName: "इटारसी जंक्शन", km: 231, isMajor: true, lat: 22.613, lon: 77.764 },
];

export const TOTAL_CORRIDOR_KM = 231;

export const BHOPAL_REGION_BBOX = {
  minLat: 22.50,
  maxLat: 24.35,
  minLon: 77.20,
  maxLon: 78.35,
};

export interface TrainCategoryConfig {
  key: string;
  name: string;
  color: string;
  stroke: string;
  dash?: number[];
  bg: string;
}

export const TRAIN_CATEGORIES: Record<string, TrainCategoryConfig> = {
  VANDE_BHARAT: {
    key: "VANDE_BHARAT",
    name: "Vande Bharat",
    color: "#ea580c",
    stroke: "#ea580c",
    bg: "bg-orange-500",
  },
  RAJDHANI_SHATABDI: {
    key: "RAJDHANI_SHATABDI",
    name: "Rajdhani / Shatabdi",
    color: "#dc2626",
    stroke: "#dc2626",
    bg: "bg-red-600",
  },
  SUPERFAST: {
    key: "SUPERFAST",
    name: "Superfast",
    color: "#2563eb",
    stroke: "#2563eb",
    bg: "bg-blue-600",
  },
  MAIL_EXPRESS: {
    key: "MAIL_EXPRESS",
    name: "Mail / Express",
    color: "#16a34a",
    stroke: "#16a34a",
    bg: "bg-emerald-600",
  },
  FREIGHT: {
    key: "FREIGHT",
    name: "Freight Path",
    color: "#64748b",
    stroke: "#64748b",
    dash: [4, 4],
    bg: "bg-slate-500",
  },
  OTHER: {
    key: "OTHER",
    name: "Passenger / Other",
    color: "#9333ea",
    stroke: "#9333ea",
    bg: "bg-purple-600",
  },
};

/**
 * Maps GPS latitude/longitude to approximate distance in kilometers along the Bina-Itarsi corridor.
 */
export function projectLatLonToRailwayKm(lat: number, lon: number): number {
  let closestDist = Infinity;
  let estimatedKm = 138; // Default to Bhopal

  for (let i = 0; i < BHOPAL_CORRIDOR_STATIONS.length - 1; i++) {
    const s1 = BHOPAL_CORRIDOR_STATIONS[i];
    const s2 = BHOPAL_CORRIDOR_STATIONS[i + 1];

    // Vector projection onto segment (s1 -> s2)
    const dx = s2.lon - s1.lon;
    const dy = s2.lat - s1.lat;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) continue;

    const t = Math.max(0, Math.min(1, ((lon - s1.lon) * dx + (lat - s1.lat) * dy) / lenSq));
    const projLon = s1.lon + t * dx;
    const projLat = s1.lat + t * dy;

    const dSq = (lon - projLon) * (lon - projLon) + (lat - projLat) * (lat - projLat);
    if (dSq < closestDist) {
      closestDist = dSq;
      estimatedKm = s1.km + t * (s2.km - s1.km);
    }
  }

  return Math.max(0, Math.min(TOTAL_CORRIDOR_KM, estimatedKm));
}

/**
 * Returns station pair between which a given chainage km falls.
 */
export function findStationSegmentForKm(km: number): {
  prev: BhopalStation;
  next: BhopalStation;
  fraction: number;
} {
  const clampedKm = Math.max(0, Math.min(TOTAL_CORRIDOR_KM, km));
  for (let i = 0; i < BHOPAL_CORRIDOR_STATIONS.length - 1; i++) {
    const s1 = BHOPAL_CORRIDOR_STATIONS[i];
    const s2 = BHOPAL_CORRIDOR_STATIONS[i + 1];
    if (clampedKm >= s1.km && clampedKm <= s2.km) {
      const span = s2.km - s1.km || 1;
      return {
        prev: s1,
        next: s2,
        fraction: (clampedKm - s1.km) / span,
      };
    }
  }
  return {
    prev: BHOPAL_CORRIDOR_STATIONS[0],
    next: BHOPAL_CORRIDOR_STATIONS[1],
    fraction: 0,
  };
}
