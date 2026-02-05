import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  /** Whether loading is active */
  isLoading: boolean;
  /** Content to show when not loading */
  children: React.ReactNode;
  /** Delay before showing loading indicator (ms). Prevents flicker on fast loads. Default: 200ms */
  delay?: number;
  /** Type of loading indicator */
  variant?: "spinner" | "skeleton" | "dots";
  /** Custom skeleton to match content dimensions (prevents CLS) */
  skeleton?: React.ReactNode;
  /** Additional className for the loading container */
  className?: string;
  /** Minimum height to prevent layout shift */
  minHeight?: string | number;
};

/**
 * Loading state wrapper with deferred loading indicator.
 * 
 * Features:
 * - Prevents flicker by delaying indicator appearance (200ms default)
 * - Prevents CLS by maintaining dimensions during load
 * - Multiple indicator variants (spinner, skeleton, dots)
 * 
 * Usage:
 * ```tsx
 * <LoadingState isLoading={isLoading} skeleton={<MySkeleton />}>
 *   <MyContent />
 * </LoadingState>
 * ```
 */
export function LoadingState({
  isLoading,
  children,
  delay = 200,
  variant = "skeleton",
  skeleton,
  className,
  minHeight,
}: LoadingStateProps) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false);
      return;
    }

    // Delay showing loading state to prevent flicker on fast connections
    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  // Not loading - show content
  if (!isLoading) {
    return <>{children}</>;
  }

  // Loading but delay hasn't passed - show nothing (prevents flicker)
  if (!showLoading) {
    return (
      <div
        className={cn("min-h-[inherit]", className)}
        style={{ minHeight }}
        aria-busy="true"
        aria-live="polite"
      />
    );
  }

  // Custom skeleton provided
  if (skeleton) {
    return (
      <div aria-busy="true" aria-live="polite" className={className}>
        {skeleton}
      </div>
    );
  }

  // Default loading indicators
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        className
      )}
      style={{ minHeight }}
      aria-busy="true"
      aria-live="polite"
    >
      {variant === "spinner" && (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      )}
      {variant === "dots" && <LoadingDots />}
      {variant === "skeleton" && <DefaultSkeleton />}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <div className="w-full space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

/**
 * Pre-built skeleton for list items (matches FoodList item dimensions)
 */
export function ListItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

/**
 * Pre-built skeleton for card layouts
 */
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full-page loading state
 */
export function PageLoadingState() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default LoadingState;
