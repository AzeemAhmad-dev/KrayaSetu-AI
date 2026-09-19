import React, { useState } from 'react';
import { usePredictPriority } from '../api/queries';

export const ScenarioAnalysis: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState('T-10492');
  const [result, setResult] = useState<any>(null);
  
  const predictMutation = usePredictPriority();

  const handlePredict = () => {
    // Mock payload matching JYOTI's behavior
    const payload = {
      task_id: selectedTask,
      days_overdue: 2,
      estimated_duration_min: 180,
      operational_impact: 0.9,
      failure_risk: 0.85,
      asset_criticality: 1.0,
      defect_severity: 'HIGH',
      department: 'Engineering'
    };
    
    predictMutation.mutate(payload, {
      onSuccess: (data) => setResult(data),
      onError: (err) => console.error(err)
    });
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-ink flex items-center gap-2">
          🧪 Priority Model Explainer
        </h3>
        <p className="text-muted mt-1 text-sm">Inspect how the AI priority model evaluated and scored maintenance tasks.</p>
      </div>

      <div className="bg-white border border-line rounded-xl p-6 shadow-sm">
        <p className="mb-3 text-sm text-gray-700">Pick any task to see why the AI scored it the way it did.</p>
        <div className="flex gap-4 items-center mb-6">
          <select 
            className="flex-1 border border-gray-300 rounded-lg p-2.5 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-rail-blue-2 outline-none"
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
          >
            <option value="T-10492">T-10492 — Major track fracture detected</option>
            <option value="T-10891">T-10891 — Overhead wire snapped</option>
            <option value="T-10222">T-10222 — Interlocking failure</option>
          </select>
          <button 
            onClick={handlePredict}
            disabled={predictMutation.isPending}
            className="bg-rail-blue-2 hover:bg-blue-800 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            {predictMutation.isPending ? 'Analyzing...' : '💡 Explain this task\'s priority'}
          </button>
        </div>

        {predictMutation.isError && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 mb-4">
            Priority prediction failed. Check if backend is running.
          </div>
        )}

        {result && (
          <div className="mt-8 border-t border-line pt-6">
            <h4 className="font-bold text-lg text-gray-900 mb-1">Track fault: Major track fracture detected</h4>
            <p className="text-sm text-muted mb-4">Section Sec-A · Engineering department</p>
            
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-1">
                Priority: <span className="text-critical">{result.priority || 'CRITICAL'}</span>
              </h3>
              <p className="text-xs text-muted">
                Raw ML prediction: {result.ml_priority || 'CRITICAL'} · ML confidence contribution to planning score: {result.ml_confidence || 'High'}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p className="font-bold mb-2">Why:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">
                {result.explanation ? (
                  result.explanation.map((e: string, i: number) => <li key={i}>{e}</li>)
                ) : (
                  <>
                    <li>Asset criticality (Track) is absolute (1.0).</li>
                    <li>Failure risk (0.85) indicates imminent functional loss.</li>
                    <li>Operational impact (0.9) causes massive network delays.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
