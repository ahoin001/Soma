/**
 * Tracking hooks - now powered by React Query
 *
 * These hooks provide automatic caching, background refetch,
 * optimistic updates, and offline support.
 *
 * @see useTrackingQuery.ts for implementation details
 */
export {
  useWeightLogsQuery as useWeightLogs,
  useStepsSummaryQuery as useStepsSummary,
  useWaterSummaryQuery as useWaterSummary,
  type WeightEntry,
} from "./useTrackingQuery";
