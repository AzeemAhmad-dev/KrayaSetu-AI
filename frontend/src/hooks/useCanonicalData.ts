/**
 * Shared React Query hooks for canonical KrayaSetu dataset.
 *
 * DESIGN DECISION:
 * All canonical data (blocks, priorities, trains, summaries) is fetched via
 * useQuery with staleTime=Infinity. This means data survives component
 * unmount/remount during navigation and is ONLY re-fetched when explicitly
 * invalidated by the "Regenerate 50 Blocks" button or a block-mutating action.
 *
 * This eliminates the bug where navigating away and back caused a full data
 * reload, making the user perceive a "different" dataset.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { BlockData, TrainMovementData, DivisionSummary } from "../types";

// Shared query keys — used across all pages for cache coherence
export const QUERY_KEYS = {
  blocks: ["canonical-blocks"] as const,
  mareyBlocks: ["canonical-marey-blocks"] as const,
  trains: ["canonical-trains"] as const,
  priorities: ["canonical-priorities"] as const,
  summary: ["canonical-summary"] as const,
  dashboardSummary: ["canonical-dashboard-summary"] as const,
  baselineComparison: ["canonical-baseline-comparison"] as const,
} as const;

/** Canonical 50-block dataset. staleTime=Infinity: only refetches on invalidation. */
export function useCanonicalBlocks(enabled = true) {
  return useQuery<BlockData[]>({
    queryKey: QUERY_KEYS.blocks,
    queryFn: () => api.getBlocks(),
    staleTime: Infinity,
    enabled,
  });
}

/**
 * Marey Diagram Maintenance Blocks.
 * Strictly loads only proposed / sanctioned blocks (ledgerOnly=true).
 * Raw PLANNED / DRAFT candidate blocks are strictly excluded.
 */
export function useMareyBlocks(enabled = true) {
  return useQuery<BlockData[]>({
    queryKey: QUERY_KEYS.mareyBlocks,
    queryFn: async () => {
      const res = await api.getBlocks(undefined, undefined, undefined, undefined, undefined, false, true);
      return (res || []).filter(
        (b) =>
          b.status !== "PLANNED" &&
          b.approval_status !== "DRAFT" &&
          ["PROPOSED", "PENDING_APPROVAL", "APPROVED", "SANCTIONED", "ACTIVE", "COMPLETED", "SELECTED"].includes(b.status)
      );
    },
    staleTime: 0,
    enabled,
  });
}

/** Train movements. staleTime=5 minutes (live telemetry may change). */
export function useTrainMovements(enabled = true) {
  return useQuery<TrainMovementData[]>({
    queryKey: QUERY_KEYS.trains,
    queryFn: () => api.getTrainMovements(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });
}

/** S-R-C-A-O priority queue. staleTime=Infinity: deterministic from stored scores. */
export function usePriorityTasks(limit = 1000, enabled = true) {
  return useQuery<any>({
    queryKey: [...QUERY_KEYS.priorities, limit],
    queryFn: () => api.getTaskPriorities(undefined, undefined, limit),
    staleTime: Infinity,
    enabled,
  });
}

/** Network summary. staleTime=Infinity. */
export function useNetworkSummary(enabled = true) {
  return useQuery<DivisionSummary>({
    queryKey: QUERY_KEYS.summary,
    queryFn: () => api.getNetworkSummary(),
    staleTime: Infinity,
    enabled,
  });
}

/** Dashboard KPI summary. staleTime=Infinity. */
export function useDashboardSummary(enabled = true) {
  return useQuery<any>({
    queryKey: QUERY_KEYS.dashboardSummary,
    queryFn: () => api.getPlanningDashboardSummary(),
    staleTime: Infinity,
    enabled,
  });
}

/** Baseline uncoordinated vs co-located optimizer comparison. staleTime=Infinity. */
export function useBaselineComparison(corridorId?: string, weekStart?: string, enabled = true) {
  return useQuery<any>({
    queryKey: [...QUERY_KEYS.baselineComparison, corridorId || "ALL", weekStart || "ALL"],
    queryFn: () => api.getBaselineComparison(corridorId, weekStart),
    staleTime: Infinity,
    enabled,
  });
}

/**
 * Invalidate all canonical data queries.
 * Call this after:
 * - "Regenerate 50 Blocks" button click
 * - Block lifecycle actions (approve, reject, submit, propose, select)
 *
 * Returns a function that invalidates all canonical query caches.
 */
export function useInvalidateCanonicalData() {
  const queryClient = useQueryClient();

  return async () => {
    // 1. Reset all canonical block & ledger caches immediately to purge any old/previous dataset records
    queryClient.setQueryData(QUERY_KEYS.blocks, []);
    queryClient.setQueryData(QUERY_KEYS.mareyBlocks, []);
    await Promise.all([
      queryClient.resetQueries({ queryKey: QUERY_KEYS.blocks }),
      queryClient.resetQueries({ queryKey: QUERY_KEYS.mareyBlocks }),
      queryClient.resetQueries({ queryKey: QUERY_KEYS.priorities }),
      queryClient.resetQueries({ queryKey: QUERY_KEYS.summary }),
      queryClient.resetQueries({ queryKey: QUERY_KEYS.dashboardSummary }),
      queryClient.resetQueries({ queryKey: QUERY_KEYS.baselineComparison }),
    ]);
    // 2. Refetch active queries from database to ensure exact synchronization
    // Note: Trains and live telemetry are NOT reset or cleared during block regeneration.
    await Promise.all([
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.blocks, type: 'all' }),
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.mareyBlocks, type: 'all' }),
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.priorities, type: 'all' }),
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.dashboardSummary, type: 'all' }),
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.summary, type: 'all' }),
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.baselineComparison, type: 'all' }),
    ]);
  };
}
