import React from 'react';
import type { SolverStatus } from './types/contract';
import clsx from 'clsx';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

interface StatusBannerProps {
  status: SolverStatus;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'OPTIMAL':
        return { 
          bg: 'bg-[#EAF7ED]', 
          text: 'text-success', 
          border: 'border-[#B9DEC1]',
          label: 'Optimal Plan Found',
          icon: CheckCircle2
        };
      case 'FEASIBLE':
        return { 
          bg: 'bg-[#FFF7D9]', 
          text: 'text-[#8B6500]', 
          border: 'border-[#F4D37A]',
          label: 'Feasible Plan (Time Limit Reached)',
          icon: AlertTriangle
        };
      case 'INFEASIBLE':
        return { 
          bg: 'bg-[#FDECEC]', 
          text: 'text-critical', 
          border: 'border-[#F1B8B8]',
          label: 'Infeasible Plan (Cannot Satisfy Constraints)',
          icon: XCircle
        };
      case 'FALLBACK_HEURISTIC':
        return { 
          bg: 'bg-[#FFF1E5]', 
          text: 'text-[#A95500]', 
          border: 'border-[#F8C496]',
          label: 'Fallback Heuristic Active (Solver Timed Out)',
          icon: AlertCircle
        };
      default:
        return { 
          bg: 'bg-gray-100', 
          text: 'text-gray-700', 
          border: 'border-gray-200',
          label: 'Unknown Status',
          icon: AlertCircle
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div 
      data-testid="status-banner"
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-xl border font-semibold",
        config.bg, config.text, config.border
      )}
    >
      <Icon size={20} className="flex-shrink-0" />
      <span>{config.label}</span>
      <span className="ml-auto px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-black/5">
        {status}
      </span>
    </div>
  );
};
