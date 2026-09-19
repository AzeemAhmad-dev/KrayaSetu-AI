import React from 'react';

type Task = {
  id: string;
  priority: 'CRITICAL' | 'HIGH';
  section: string;
  asset: string;
  description: string;
  duration: number;
  score: number;
};

// Hardcoded sample data to mirror the JYOTI prototype aesthetic
const sampleTasks: Task[] = [
  { id: 'T-10492', priority: 'CRITICAL', section: 'Sec-A (Track km 142.5)', asset: 'Track', description: 'Major track fracture detected', duration: 180, score: 98.5 },
  { id: 'T-10891', priority: 'CRITICAL', section: 'Sec-D (near Station Y)', asset: 'OHE', description: 'Overhead wire snapped', duration: 120, score: 95.2 },
  { id: 'T-10222', priority: 'HIGH', section: 'Sec-B (Track km 89.0)', asset: 'Signals', description: 'Interlocking failure', duration: 90, score: 88.0 },
  { id: 'T-10555', priority: 'HIGH', section: 'Sec-A (Track km 145.2)', asset: 'Track', description: 'Routine ballast tamping needed', duration: 150, score: 82.1 },
];

export const PriorityQueue: React.FC = () => {
  return (
    <div className="mt-8">
      <div className="mb-4 border-t border-line pt-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          🚦 Priority Queue
        </h3>
        <p className="text-muted text-sm mt-1">Top ranked Critical & High priority tasks requiring immediate operational intervention.</p>
      </div>

      <div className="border border-line rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F8FAFC] border-b-2 border-slate-300">
            <tr>
              <th className="px-4 py-3 text-center text-gray-500 font-bold w-12">#</th>
              <th className="px-4 py-3 font-bold">Task ID</th>
              <th className="px-4 py-3 font-bold">Priority</th>
              <th className="px-4 py-3 font-bold">Section & Fault Location</th>
              <th className="px-4 py-3 font-bold">Asset</th>
              <th className="px-4 py-3 font-bold">Issue Description</th>
              <th className="px-4 py-3 font-bold text-right">Duration</th>
              <th className="px-4 py-3 font-bold text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {sampleTasks.map((task, index) => (
              <tr key={task.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-center font-bold text-gray-500">{index + 1}</td>
                <td className="px-4 py-3 font-extrabold text-blue-900">{task.id}</td>
                <td className="px-4 py-3">
                  <span className={task.priority === 'CRITICAL' ? 'priority-critical text-sm' : 'priority-high text-sm'}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold">{task.section}</td>
                <td className="px-4 py-3 font-semibold text-gray-700">{task.asset}</td>
                <td className="px-4 py-3 text-gray-900">{task.description}</td>
                <td className="px-4 py-3 font-bold text-gray-600 text-right">{task.duration} min</td>
                <td className="px-4 py-3 font-extrabold text-gray-900 text-right">{task.score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
