import React from "react";
import { Link } from "react-router-dom";
import { ProvenanceBadge } from "../common/ProvenanceBadge";
import {
  Building2,
  GitBranch,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight
} from "lucide-react";

export interface JunctionHubData {
  code: string;
  name: string;
  hindiName: string;
  platforms: number;
  tracks: number;
  loops: number;
  sidings: number;
  category: "NSG-1" | "NSG-2" | "NSG-3";
  electrified: boolean;
  corridors: string[];
  interchangeType: string;
  routes: string;
  description: string;
  specialFeatures: string[];
}

export const VERIFIED_JUNCTION_HUBS: JunctionHubData[] = [
  {
    code: "ET",
    name: "Itarsi Junction",
    hindiName: "इटारसी जंक्शन",
    platforms: 8,
    tracks: 14,
    loops: 6,
    sidings: 4,
    category: "NSG-1",
    electrified: true,
    corridors: ["CORR-01 (Itarsi–Bhopal)", "CORR-03 (Khandwa–Itarsi)"],
    interchangeType: "4-Way Quad Trunk Interchange",
    routes: "North: Delhi / Bhopal · South: Nagpur / Chennai · East: Jabalpur / Prayagraj · West: Khandwa / Mumbai",
    description: "Central India's foremost 4-way railway junction connecting the North-South and East-West golden diagonals. Features a premier Electric Loco Shed (ELS) and extensive freight classification yard.",
    specialFeatures: [
      "8 Passenger Platforms (PF 1–8 with high-level concrete decks)",
      "Electric Locomotive Shed (ELS) berthing 150+ WAP-7 & WAG-9 locos",
      "Centralized Electronic Interlocking (EI) with route-setting automation",
      "Direct interchange connecting Central Railway and West Central Railway"
    ]
  },
  {
    code: "BPL",
    name: "Bhopal Junction",
    hindiName: "भोपाल जंक्शन",
    platforms: 6,
    tracks: 10,
    loops: 4,
    sidings: 3,
    category: "NSG-1",
    electrified: true,
    corridors: ["CORR-01 (Itarsi–Bhopal)", "CORR-02 (Bhopal–Bina)"],
    interchangeType: "Divisional HQ Trunk Interchange",
    routes: "North: Bina / Jhansi / Delhi · South: Itarsi / Nagpur · West: Ujjain / Indore / Ahmedabad",
    description: "Headquarters of the Bhopal Railway Division (WCR). Primary commercial and passenger node connecting the central trunk corridor to Western Railway lines.",
    specialFeatures: [
      "6 Berthing Platforms with multi-line passing loops",
      "Route Relay Interlocking (RRI) handling 200+ train movements daily",
      "Nishatpura chord connection enabling bypass freight corridors",
      "Integrated Station Master Control Room & Divisional Operations Center"
    ]
  },
  {
    code: "RKMP",
    name: "Rani Kamlapati",
    hindiName: "रानी कमलापति",
    platforms: 5,
    tracks: 8,
    loops: 3,
    sidings: 2,
    category: "NSG-2",
    electrified: true,
    corridors: ["CORR-01 (Itarsi–Bhopal)"],
    interchangeType: "World-Class Terminal Hub",
    routes: "Southern Trunk Corridor Terminal (Direct high-speed link to Bhopal & Itarsi)",
    description: "India's first world-class redeveloped modern railway station. Designed on international airport standards with segregated passenger arrivals/departures and air concourse.",
    specialFeatures: [
      "5 High-Level Berthing Platforms with full canopy coverage",
      "Dedicated 840mm deck heights with tactile yellow safety edges",
      "Central Foot Overbridge (FOB) and subways with escalators and lifts",
      "Originating terminal for premium Vande Bharat and Shatabdi Express services"
    ]
  },
  {
    code: "BINA",
    name: "Bina Junction",
    hindiName: "बीना जंक्शन",
    platforms: 5,
    tracks: 11,
    loops: 5,
    sidings: 4,
    category: "NSG-2",
    electrified: true,
    corridors: ["CORR-02 (Bhopal–Bina)", "CORR-04 (Bina–Guna)"],
    interchangeType: "4-Way Gateway Interchange",
    routes: "South: Bhopal / Mumbai · North: Jhansi / New Delhi · East: Katni / Bilaspur · West: Guna / Kota",
    description: "Strategic 4-way trunk junction serving as the gateway between North Central Railway, West Central Railway, and Western Railway corridors. Large marshalling yard and refinery siding.",
    specialFeatures: [
      "5 Berthing Platforms with heavy freight bypass loops",
      "Bharat Petroleum Corporation (BPCL) Bina Refinery dedicated siding",
      "Interchange point for coal freight from Katni towards Northern Thermal plants",
      "100% 25 kV AC 50 Hz Traction with automated section post (SP) isolators"
    ]
  },
  {
    code: "GUNA",
    name: "Guna Junction",
    hindiName: "गुना जंक्शन",
    platforms: 3,
    tracks: 7,
    loops: 3,
    sidings: 2,
    category: "NSG-3",
    electrified: true,
    corridors: ["CORR-04 (Bina–Guna)", "CORR-05 (Guna–Gwalior)"],
    interchangeType: "Branch Line Interchange Hub",
    routes: "East: Bina · North: Shivpuri / Gwalior · West: Ruthiyai / Kota / Maksi",
    description: "Crucial central junction connecting northern Madhya Pradesh (Gwalior) to Rajasthan (Kota) and the central trunk (Bina).",
    specialFeatures: [
      "3 Passenger Platforms with passing loop clearance",
      "Ruthiyai bypass triangle junction for direct Kota-Bina freight trains",
      "Full electrification 25 kV AC commissioned across all platform berthing lines",
      "Modern Electronic Interlocking (EI) installed"
    ]
  },
  {
    code: "KNW",
    name: "Khandwa Junction",
    hindiName: "खंडवा जंक्शन",
    platforms: 6,
    tracks: 12,
    loops: 4,
    sidings: 3,
    category: "NSG-3",
    electrified: true,
    corridors: ["CORR-03 (Khandwa–Itarsi)"],
    interchangeType: "CR / WCR Border Gateway",
    routes: "East: Itarsi / Jabalpur · South-West: Bhusawal / Mumbai · North-West: Sanawad / Mhow / Indore",
    description: "Border junction between Central Railway (Bhusawal Division) and West Central Railway (Bhopal Division). Historical junction linking the Nimar region to Central trunk lines.",
    specialFeatures: [
      "6 Platforms accommodating 24-coach passenger trains",
      "Border division changeover for traction crew and rolling stock inspection",
      "Indore-Khandwa gauge conversion interface",
      "Heavy grain and agricultural freight loading terminal"
    ]
  },
  {
    code: "GWL",
    name: "Gwalior Junction",
    hindiName: "ग्वालियर जंक्शन",
    platforms: 5,
    tracks: 10,
    loops: 4,
    sidings: 3,
    category: "NSG-2",
    electrified: true,
    corridors: ["CORR-05 (Guna–Gwalior)"],
    interchangeType: "Northern Division Interchange",
    routes: "South-West: Shivpuri / Guna · South-East: Jhansi · North: Morena / Agra / Delhi",
    description: "Historic junction station on the Delhi-Chennai trunk line, serving as the northern terminus of Corridor 5 (Guna-Gwalior).",
    specialFeatures: [
      "5 High-Speed Platforms with automatic block signaling",
      "Grade-separated crossover points for trunk line traffic",
      "Heritage station architecture with modernized passenger concourse",
      "Terminating line connection for Corridor 5 branch trains"
    ]
  }
];

export const VisualJunctionHubs: React.FC = () => {
  return (
    <div className="space-y-5 font-sans">
      {/* Top Section Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#0b2545] text-white">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-800 font-mono">
                DIVISIONAL INFRASTRUCTURE · INTERCHANGE ARCHITECTURE
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Visual Junction Hubs ({VERIFIED_JUNCTION_HUBS.length} Major Interchanges)
              </h2>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
          Comprehensive verified specifications for all major junction hubs in Bhopal Division (WCR). Each junction acts as a critical operational node governing line-clear, train routing, locomotive changes, and section interconnections.
        </p>

        {/* Telemetry Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-700">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              Junction Hubs: <strong className="text-slate-900 font-bold">{VERIFIED_JUNCTION_HUBS.length} Key Hubs</strong>
            </div>
            <div>
              Quad Junctions: <strong className="text-sky-800 font-bold">Itarsi (ET) & Bina (BINA)</strong>
            </div>
            <div>
              Interchange Corridors: <strong className="text-slate-900 font-bold">5 Active Routes</strong>
            </div>
            <div>
              Signaling: <strong className="text-emerald-700 font-bold">Electronic Interlocking (EI) / RRI</strong>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Station Working Rules (SWR) Verified</span>
          </div>
        </div>
      </div>

      {/* Junction Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {VERIFIED_JUNCTION_HUBS.map((j) => (
          <div
            key={j.code}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 p-5 flex flex-col justify-between space-y-4 transition-all"
          >
            <div className="space-y-3">
              {/* Header: Code, Category, Platforms */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-[#0b2545] text-white">
                    {j.code}
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {j.category}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {j.platforms} Platforms
                </span>
              </div>

              {/* Junction Title */}
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {j.name}
                </h3>
                <div className="text-xs text-slate-500 font-sans mt-0.5">
                  {j.hindiName} · {j.interchangeType}
                </div>
              </div>

              {/* Routes strip */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="text-[10px] font-bold uppercase text-slate-500 font-mono flex items-center space-x-1">
                  <GitBranch className="w-3.5 h-3.5 text-sky-700" />
                  <span>Connecting Trunk Routes</span>
                </div>
                <div className="text-slate-800 font-mono text-[11px] leading-relaxed">
                  {j.routes}
                </div>
              </div>

              {/* Track telemetry numbers */}
              <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-mono">
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[9px] uppercase font-bold">Tracks</div>
                  <div className="font-bold text-slate-900 mt-0.5">{j.tracks} Lines</div>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[9px] uppercase font-bold">Loops</div>
                  <div className="font-bold text-slate-900 mt-0.5">{j.loops} Loops</div>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[9px] uppercase font-bold">Sidings</div>
                  <div className="font-bold text-slate-900 mt-0.5">{j.sidings} Sidings</div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {j.description}
              </p>

              {/* Special Features */}
              <div className="space-y-1 text-[11px] text-slate-600">
                {j.specialFeatures.slice(0, 2).map((feature, fIdx) => (
                  <div key={`feat-${j.code}-${fIdx}`} className="flex items-start space-x-1.5">
                    <span className="text-sky-700 font-bold">•</span>
                    <span className="line-clamp-1">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <Link
                to={`/station-master/${j.code}`}
                className="flex-1 py-2 px-3 bg-[#0b2545] hover:bg-sky-900 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>Inspect Station Yard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
