import { WifiOff, RefreshCw, Check } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { cn } from "@/lib/utils";

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  const { pendingCount, isProcessing } = useOfflineQueue();

  // Show syncing state when coming back online with pending changes
  const isSyncing = isOnline && isProcessing && pendingCount > 0;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-50",
        "flex justify-center pt-[env(safe-area-inset-top)]",
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Offline Banner */}
      <div
        className={cn(
          "pointer-events-auto mt-2 flex items-center gap-2 rounded-full",
          "bg-accent/95 px-3 py-1 text-xs font-medium text-accent-foreground",
          "shadow-md backdrop-blur transition-all duration-200",
          isOnline && !isSyncing
            ? "-translate-y-6 opacity-0"
            : "translate-y-0 opacity-100",
          isSyncing && "bg-primary/95 text-primary-foreground",
        )}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Syncing {pendingCount} change{pendingCount !== 1 ? "s" : ""}...</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5" />
            <span>
              Offline mode
              {pendingCount > 0
                ? ` • ${pendingCount} pending change${pendingCount !== 1 ? "s" : ""}`
                : " • Changes will sync when reconnected"}
            </span>
          </>
        )}
      </div>

      {/* Sync Complete Toast (brief flash) */}
      <SyncCompleteBanner
        show={isOnline && !isProcessing && pendingCount === 0}
      />
    </div>
  );
};

/**
 * Brief "synced" indicator that appears after successful sync
 */
const SyncCompleteBanner = ({ show }: { show: boolean }) => {
  // This shows briefly when sync completes
  // The actual toast notification is handled by useOfflineQueue

  return null; // Toast handled by hook, remove visual duplication
};

export default OfflineBanner;
