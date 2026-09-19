import React from 'react';

type MetricProps = {
  title: string;
  value: string | number;
};

const MetricCard: React.FC<MetricProps> = ({ title, value }) => {
  return (
    <div className="bg-white border border-line rounded-xl p-4 shadow-metric-card">
      <div className="text-gray-600 text-xs font-medium mb-1">{title}</div>
      <div className="text-gray-900 text-3xl font-bold">{value}</div>
    </div>
  );
};

export const MetricCards: React.FC = () => {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <MetricCard title="🔴 Critical now" value={1} />
      <MetricCard title="🟠 High priority" value={5} />
      <MetricCard title="🟩 Available blocks" value={12} />
      <MetricCard title="🔷 Network sections" value={8} />
    </div>
  );
};
