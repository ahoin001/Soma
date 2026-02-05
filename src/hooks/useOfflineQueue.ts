/**
 * React hook for offline mutation queue
 *
 * Provides:
 * - Pending mutations count for UI indicators
 * - Automatic processing when coming back online
 * - Manual trigger to process queue
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  getPendingMutationsCount,
  processPendingMutations,
} from "@/lib/offlineQueue";

type UseOfflineQueueOptions = {
  /** Auto-process queue when coming back online (default: true) */
  autoProcess?: boolean;
  /** Show toast notifications (default: true) */
  showNotifications?: boolean;
};

type UseOfflineQueueReturn = {
  /** Number of pending mutations */
  pendingCount: number;
  /** Whether queue is currently processing */
  isProcessing: boolean;
  /** Manually trigger queue processing */
  processQueue: () => Promise<void>;
  /** Refresh pending count */
  refreshCount: () => Promise<void>;
};

export const useOfflineQueue = (
  options?: UseOfflineQueueOptions
): UseOfflineQueueReturn => {
  const { autoProcess = true, showNotifications = true } = options ?? {};

  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Refresh pending count
  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingMutationsCount();
      setPendingCount(count);
    } catch {
      // Ignore errors (IndexedDB may not be available)
    }
  }, []);

  // Process the queue
  const processQueue = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await processPendingMutations({
        onProgress: (processed, total) => {
          // Could be used for progress UI
          if (import.meta.env.DEV) {
            console.info(`[OfflineQueue] Processing ${processed}/${total}`);
          }
        },
      });

      // Refresh count after processing
      await refreshCount();

      // Show notification
      if (showNotifications && result.processed > 0) {
        toast("Changes synced", {
          description: `${result.processed} update${result.processed !== 1 ? "s" : ""} saved.`,
        });
      }

      if (showNotifications && result.failed > 0) {
        toast("Some changes failed to sync", {
          description: `${result.failed} update${result.failed !== 1 ? "s" : ""} will retry.`,
        });
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("[OfflineQueue] Processing error:", err);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, refreshCount, showNotifications]);

  // Track offline → online transitions
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    }
  }, [isOnline]);

  // Auto-process when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && autoProcess && pendingCount > 0) {
      setWasOffline(false);
      void processQueue();
    }
  }, [isOnline, wasOffline, autoProcess, pendingCount, processQueue]);

  // Initial count fetch
  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  // Refresh count periodically when offline (in case mutations are queued)
  useEffect(() => {
    if (isOnline) return;

    const interval = setInterval(() => {
      void refreshCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [isOnline, refreshCount]);

  return {
    pendingCount,
    isProcessing,
    processQueue,
    refreshCount,
  };
};

/**
 * Simple hook for just the pending count
 */
export const usePendingMutationsCount = (): number => {
  const { pendingCount } = useOfflineQueue({ autoProcess: false, showNotifications: false });
  return pendingCount;
};
