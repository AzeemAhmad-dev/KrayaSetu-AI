import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ProvenanceBadge } from "../common/ProvenanceBadge";
import {
  Layers,
  MapPin,
  ShieldCheck,
  Zap,
  Gauge,
  Compass,
  ArrowRight,
  ExternalLink
} from "lucide-react";

export interface RailwaySectionInfo {
  id: string;
  name: string;
  corridorId: string;
  corridorName: string;
  fromStation: string;
  toStation: string;
  startKm: number;
  endKm: number;
  lengthKm: number;
  tracksCount: number;
  trackConfiguration: "TRIPLE_LINE" | "DOUBLE_LINE" | "SINGLE_LINE" | "SINGLE_LINE_WITH_DOUBLING";
  speedKmph: number;
  electrification: string;
  gradient?: string;
  specialFeatures: string;
}

export const VERIFIED_RAILWAY_SECTIONS: RailwaySectionInfo[] = [
  // CORR-01 Sections
  {
    id: "SEC-01",
    name: "Itarsi – Narmadapuram",
    corridorId: "CORR-01",
    corridorName: "Itarsi – Bhopal",
    fromStation: "Itarsi (ET)",
    toStation: "Narmadapuram (NDPM)",
    startKm: 0.0,
    endKm: 18.0,
    lengthKm: 18.0,
    tracksCount: 3,
    trackConfiguration: "TRIPLE_LINE",
    speedKmph: 130,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "Level / 1 in 200",
    specialFeatures: "Narmada River major bridge approach with continuous 60kg welded rails."
  },
  {
    id: "SEC-02",
    name: "Narmadapuram – Budni (Ghat Entry)",
    corridorId: "CORR-01",
    corridorName: "Itarsi – Bhopal",
    fromStation: "Narmadapuram (NDPM)",
    toStation: "Budni (BNI)",
    startKm: 18.0,
    endKm: 25.0,
    lengthKm: 7.0,
    tracksCount: 3,
    trackConfiguration: "TRIPLE_LINE",
    speedKmph: 110,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 150",
    specialFeatures: "Major Narmada rail bridge (Span 12 x 60m girder). Ghat transition section."
  },
  {
    id: "SEC-03",
    name: "Budni – Barkhera (Vindhyachal Ghat)",
    corridorId: "CORR-01",
    corridorName: "Itarsi – Bhopal",
    fromStation: "Budni (BNI)",
    toStation: "Barkhera (BKA)",
    startKm: 25.0,
    endKm: 52.0,
    lengthKm: 27.0,
    tracksCount: 3,
    trackConfiguration: "TRIPLE_LINE",
    speedKmph: 80,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 80 (Severe Mountainous Ghat)",
    specialFeatures: "Heavy mountain ghat section with Midghat catch siding, tunnels, and 3rd dedicated line."
  },
  {
    id: "SEC-04",
    name: "Barkhera – Rani Kamlapati",
    corridorId: "CORR-01",
    corridorName: "Itarsi – Bhopal",
    fromStation: "Barkhera (BKA)",
    toStation: "Rani Kamlapati (RKMP)",
    startKm: 52.0,
    endKm: 86.0,
    lengthKm: 34.0,
    tracksCount: 3,
    trackConfiguration: "TRIPLE_LINE",
    speedKmph: 130,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 200",
    specialFeatures: "High-density trunk line connecting Mandideep industrial hub to Bhopal metropolis."
  },
  {
    id: "SEC-05",
    name: "Rani Kamlapati – Bhopal Junction",
    corridorId: "CORR-01",
    corridorName: "Itarsi – Bhopal",
    fromStation: "Rani Kamlapati (RKMP)",
    toStation: "Bhopal Junction (BPL)",
    startKm: 86.0,
    endKm: 92.0,
    lengthKm: 6.0,
    tracksCount: 4,
    trackConfiguration: "TRIPLE_LINE",
    speedKmph: 60,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "Level",
    specialFeatures: "Urban multi-track approach with automatic signaling and continuous crossovers."
  },

  // CORR-02 Sections
  {
    id: "SEC-06",
    name: "Bhopal – Vidisha",
    corridorId: "CORR-02",
    corridorName: "Bhopal – Bina",
    fromStation: "Bhopal Junction (BPL)",
    toStation: "Vidisha (BHS)",
    startKm: 0.0,
    endKm: 54.0,
    lengthKm: 54.0,
    tracksCount: 2,
    trackConfiguration: "DOUBLE_LINE",
    speedKmph: 130,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 150",
    specialFeatures: "Northern trunk section passing Sukhi Sewaniya, Salamatpur, and UNESCO Sanchi station."
  },
  {
    id: "SEC-07",
    name: "Vidisha – Ganj Basoda",
    corridorId: "CORR-02",
    corridorName: "Bhopal – Bina",
    fromStation: "Vidisha (BHS)",
    toStation: "Ganj Basoda (BAQ)",
    startKm: 54.0,
    endKm: 94.0,
    lengthKm: 40.0,
    tracksCount: 2,
    trackConfiguration: "DOUBLE_LINE",
    speedKmph: 130,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 200",
    specialFeatures: "High-speed continuous welded rail track with intermediate passing loop stations (Sorai, Gulabganj)."
  },
  {
    id: "SEC-08",
    name: "Ganj Basoda – Bina Junction",
    corridorId: "CORR-02",
    corridorName: "Bhopal – Bina",
    fromStation: "Ganj Basoda (BAQ)",
    toStation: "Bina Junction (BINA)",
    startKm: 94.0,
    endKm: 143.0,
    lengthKm: 49.0,
    tracksCount: 2,
    trackConfiguration: "DOUBLE_LINE",
    speedKmph: 130,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 150",
    specialFeatures: "Bina yard approach with connection to BPCL refinery siding and Katni chord."
  },

  // CORR-03 Sections
  {
    id: "SEC-09",
    name: "Khandwa – Khirkiya",
    corridorId: "CORR-03",
    corridorName: "Khandwa – Itarsi",
    fromStation: "Khandwa (KNW)",
    toStation: "Khirkiya (KKN)",
    startKm: 0.0,
    endKm: 75.0,
    lengthKm: 75.0,
    tracksCount: 2,
    trackConfiguration: "DOUBLE_LINE",
    speedKmph: 110,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 150",
    specialFeatures: "Inter-division boundary section with heavy freight transit from Bhusawal / Central Railway."
  },
  {
    id: "SEC-10",
    name: "Khirkiya – Harda",
    corridorId: "CORR-03",
    corridorName: "Khandwa – Itarsi",
    fromStation: "Khirkiya (KKN)",
    toStation: "Harda (HD)",
    startKm: 75.0,
    endKm: 124.0,
    lengthKm: 49.0,
    tracksCount: 2,
    trackConfiguration: "DOUBLE_LINE",
    speedKmph: 110,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "Level",
    specialFeatures: "High-density passenger and agricultural freight route through Narmada valley flat terrain."
  },
  {
    id: "SEC-11",
    name: "Harda – Itarsi Junction",
    corridorId: "CORR-03",
    corridorName: "Khandwa – Itarsi",
    fromStation: "Harda (HD)",
    toStation: "Itarsi (ET)",
    startKm: 124.0,
    endKm: 184.0,
    lengthKm: 60.0,
    tracksCount: 2,
    trackConfiguration: "DOUBLE_LINE",
    speedKmph: 110,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 200",
    specialFeatures: "Major trunk feeder connecting Banapura and Dharamkundi to Itarsi yard interchange."
  },

  // CORR-04 Sections
  {
    id: "SEC-12",
    name: "Bina – Ashok Nagar",
    corridorId: "CORR-04",
    corridorName: "Bina – Guna",
    fromStation: "Bina Junction (BINA)",
    toStation: "Ashok Nagar (ASKN)",
    startKm: 0.0,
    endKm: 77.0,
    lengthKm: 77.0,
    tracksCount: 1,
    trackConfiguration: "SINGLE_LINE_WITH_DOUBLING",
    speedKmph: 100,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 150",
    specialFeatures: "Electrified branch line with ongoing track doubling work. Crossing loops at Mungaoli and Pipraigaon."
  },
  {
    id: "SEC-13",
    name: "Ashok Nagar – Guna Junction",
    corridorId: "CORR-04",
    corridorName: "Bina – Guna",
    fromStation: "Ashok Nagar (ASKN)",
    toStation: "Guna Junction (GUNA)",
    startKm: 77.0,
    endKm: 119.0,
    lengthKm: 42.0,
    tracksCount: 1,
    trackConfiguration: "SINGLE_LINE_WITH_DOUBLING",
    speedKmph: 100,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 150",
    specialFeatures: "Connection into Guna Junction yard with crossing lines at Shadhoragaon and Pilighat."
  },

  // CORR-05 Sections
  {
    id: "SEC-14",
    name: "Guna – Shivpuri",
    corridorId: "CORR-05",
    corridorName: "Guna – Gwalior",
    fromStation: "Guna Junction (GUNA)",
    toStation: "Shivpuri (SVPI)",
    startKm: 0.0,
    endKm: 102.0,
    lengthKm: 102.0,
    tracksCount: 1,
    trackConfiguration: "SINGLE_LINE",
    speedKmph: 100,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 100 (Plateau Climb)",
    specialFeatures: "Single-line branch passing through Badarwas and Kolaras in northern Vindhyachal foothills."
  },
  {
    id: "SEC-15",
    name: "Shivpuri – Gwalior Junction",
    corridorId: "CORR-05",
    corridorName: "Guna – Gwalior",
    fromStation: "Shivpuri (SVPI)",
    toStation: "Gwalior Junction (GWL)",
    startKm: 102.0,
    endKm: 227.0,
    lengthKm: 125.0,
    tracksCount: 1,
    trackConfiguration: "SINGLE_LINE",
    speedKmph: 100,
    electrification: "25 kV AC 50 Hz OHE",
    gradient: "1 in 100 (Ghat descent into Gwalior basin)",
    specialFeatures: "Scenic Chambal-Gwalior descent passing Ghatigaon and Panihar. Terminus at Gwalior trunk line."
  }
];

export const NetworkSectionsView: React.FC = () => {
  const [selectedCorridorFilter, setSelectedCorridorFilter] = useState<string>("ALL");

  const filteredSections = selectedCorridorFilter === "ALL"
    ? VERIFIED_RAILWAY_SECTIONS
    : VERIFIED_RAILWAY_SECTIONS.filter((s) => s.corridorId === selectedCorridorFilter);

  return (
    <div className="space-y-5 font-sans">
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#0b2545] text-white">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-800 font-mono">
                RAILWAY NETWORK SPECIFICATIONS · SECTION DIRECTORY
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Divisional Sections ({VERIFIED_RAILWAY_SECTIONS.length} Segments)
              </h2>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
          Inspection directory of all physical railway block sections across Bhopal Division (WCR). Each section is defined by exact chainage (KM), number of tracks, speed ceilings, ruling gradients, and permanent way specifications according to the Working Time Table (WTT).
        </p>

        {/* Engineering Standards Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Rail Profile Standard</div>
            <div className="font-bold text-slate-900 mt-0.5">60 kg / 90 UTS Continuous Welded Rail (LWR/CWR)</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Sleeper Density & Ballast</div>
            <div className="font-bold text-slate-900 mt-0.5">Prestressed Concrete (PSC-1660/km) · 300mm Cushion</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Electrification & Signaling</div>
            <div className="font-bold text-slate-900 mt-0.5">25 kV AC 50 Hz OHE · Multiple Aspect Color Light (MACLS)</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-[11px] font-bold text-slate-500 uppercase px-2">Filter By Corridor:</span>

        <button
          type="button"
          onClick={() => setSelectedCorridorFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            selectedCorridorFilter === "ALL"
              ? "bg-[#0b2545] text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All Sections ({VERIFIED_RAILWAY_SECTIONS.length})
        </button>

        {["CORR-01", "CORR-02", "CORR-03", "CORR-04", "CORR-05"].map((cId) => (
          <button
            key={cId}
            type="button"
            onClick={() => setSelectedCorridorFilter(cId)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedCorridorFilter === cId
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            {cId}
          </button>
        ))}
      </div>

      {/* Sections Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredSections.map((sec) => (
            <div
              key={sec.id}
              className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-[#0b2545] text-white">
                    {sec.id}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-sky-50 text-sky-800 border border-sky-200">
                    {sec.corridorId} · {sec.corridorName}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {sec.trackConfiguration.replace(/_/g, " ")} ({sec.tracksCount} Tracks)
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {sec.name}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sec.fromStation} → {sec.toStation}</span>
                  </div>
                  <div>Chainage: <strong>KM {sec.startKm} to {sec.endKm} ({sec.lengthKm} KM)</strong></div>
                  <div>Max Speed: <strong className="text-sky-800">{sec.speedKmph} km/h</strong></div>
                  {sec.gradient && <div>Gradient: <strong className="text-amber-800">{sec.gradient}</strong></div>}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-sans pt-1">
                  {sec.specialFeatures}
                </p>
              </div>

              <div className="flex items-center space-x-2 self-end md:self-center flex-shrink-0">
                <Link
                  to={`/corridors/${sec.corridorId}?tab=infrastructure`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-[#0b2545] hover:text-white text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition-colors flex items-center space-x-1"
                >
                  <span>Inspect Section</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
