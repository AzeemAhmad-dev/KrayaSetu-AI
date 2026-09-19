import React from 'react';
import { MetricCards } from '../components/MetricCards';
import { PriorityQueue } from '../components/PriorityQueue';

export const Operations: React.FC = () => {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-ink m-0">Operations overview</h1>
        <p className="text-muted mt-2">RailOne Control Room — Live maintenance operations, real-time priority queue & track fault registers.</p>
      </div>

      <MetricCards />

      {/* CRITICAL ALERT BANNER */}
      <div className="alert-card mb-8">
        <span className="priority-critical text-[1.05rem]">🚨 CRITICAL MAINTENANCE ALERT · PRIORITY 1</span><br />
        <span className="text-[1.15rem] font-extrabold text-gray-900 mt-1 inline-block">T-10492 · Track</span><br />
        <div className="my-1.5 text-gray-900 text-[0.95rem]">Major track fracture detected</div>
        <div className="text-[0.88rem] text-gray-700 mt-1.5">
          <b>Location:</b> Km 142.5 (near Station A) &nbsp;·&nbsp; <b>Section:</b> Sec-A
        </div>
      </div>

      <PriorityQueue />
    </div>
  );
};
