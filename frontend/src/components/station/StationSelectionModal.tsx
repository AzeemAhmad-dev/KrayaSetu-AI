import React, { useState } from "react";
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  X,
  MapPin,
  Train
} from "lucide-react";
import { TARGET_STATION_CHOICES } from "../../data/stationInfrastructure";
import { ProvenanceBadge } from "../common/ProvenanceBadge";

interface StationSelectionModalProps {
  isOpen: boolean;
  currentStationCode?: string;
  onSelectStation: (stationCode: string) => void;
  onClose?: () => void;
  allowDismiss?: boolean;
}

export const StationSelectionModal: React.FC<StationSelectionModalProps> = ({
  isOpen,
  currentStationCode = "RKMP",
  onSelectStation,
  onClose,
  allowDismiss = false,
}) => {
  const [selectedCode, setSelectedCode] = useState<string>(
    currentStationCode.toUpperCase()
  );

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedCode) {
      onSelectStation(selectedCode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#0b2545] text-white p-5 sm:p-6 border-b border-[#134074] relative">
          {allowDismiss && onClose && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="p-1.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/30">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300">
              Station Master Console Deployment
            </span>
            <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            From which station are you?
          </h2>
          <p className="text-sm text-sky-100/90 font-sans mt-1 leading-relaxed">
            Select your assigned station control desk to load its engineering track schematic and physical asset directory.
          </p>
        </div>

        {/* Station Choices Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center justify-between mb-1">
            <span>Verified Stations ({TARGET_STATION_CHOICES.length})</span>
            <span className="text-xs text-slate-400 font-medium">Bhopal Division & WCR Network</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TARGET_STATION_CHOICES.map((stn) => {
              const isSelected = selectedCode === stn.code;
              return (
                <button
                  key={stn.code}
                  type="button"
                  onClick={() => setSelectedCode(stn.code)}
                  className={`relative p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-sky-50/80 border-sky-600 shadow-md ring-2 ring-sky-500/30"
                      : "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-base">
                          {stn.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-[#0b2545] text-white">
                          {stn.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-sans mt-0.5">
                        {stn.division}
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? "bg-sky-600 border-sky-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-mono text-slate-600">
                    <span className="flex items-center space-x-1.5 font-medium">
                      <Train className="w-3.5 h-3.5 text-slate-400" />
                      <span>{stn.platforms} Platforms</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-bold">
                      {stn.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center space-x-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-xs">
              Selected Station: <strong className="text-slate-800 font-mono">{selectedCode}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {allowDismiss && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0b2545] hover:bg-[#134074] text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer group"
            >
              <span>Continue to Station</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
