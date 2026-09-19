import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScheduleResponse } from '../types/contract';

const API_BASE = 'http://localhost:8000';

export function useSchedulePlan() {
  return useQuery<ScheduleResponse>({
    queryKey: ['plan'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error(`Backend error: ${res.status} ${res.statusText}`);
      return res.json();
    }
  });
}

export function useDispatcherOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: { override_type: string; target_id: string; reason_code: string }) => {
      const res = await fetch(`${API_BASE}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Backend error: ${res.status} ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch schedule to reflect the locked/rejected block
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    }
  });
}

export function usePredictPriority() {
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${API_BASE}/api/predict-priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Backend error: ${res.status} ${res.statusText}`);
      return res.json();
    }
  });
}
