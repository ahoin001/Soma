import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type PullToRefreshProps = {
  experience: "nutrition" | "fitness";
  threshold?: number;
  maxPull?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const PullToRefresh = ({
  experience,
  threshold = 80,
  maxPull = 140,
}: PullToRefreshProps) => {
  const queryClient = useQueryClient();
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Best practice: refetch active queries instead of full reload (preserves state, faster, smoother UX).
  const handleRefresh = useCallback(async () => {
    await queryClient.refetchQueries({ type: "active" });
  }, [queryClient]);

  const tone = useMemo(
    () =>
      experience === "nutrition"
        ? {
            ring: "bg-emerald-100 text-emerald-700",
            text: "text-emerald-700/80",
            accent: "bg-emerald-500",
          }
        : {
            ring: "bg-white/10 text-white",
            text: "text-white/70",
            accent: "bg-emerald-400",
          },
    [experience],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("ontouchstart" in window)) return;

    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) return;
      startYRef.current = event.touches[0]?.clientY ?? null;
      pullingRef.current = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startYRef.current === null || refreshing) return;
      const currentY = event.touches[0]?.clientY ?? startYRef.current;
      const delta = currentY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        pullingRef.current = false;
        return;
      }
      pullingRef.current = true;
      const distance = clamp(delta, 0, maxPull);
      setPullDistance(distance);
      if (distance > 4) {
        event.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) {
        startYRef.current = null;
        return;
      }
      const shouldRefresh = pullDistance >= threshold;
      setPullDistance(0);
      startYRef.current = null;
      pullingRef.current = false;
      if (shouldRefresh) {
        setRefreshing(true);
        try {
          await handleRefresh();
        } finally {
          setRefreshing(false);
        }
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [handleRefresh, maxPull, pullDistance, refreshing, threshold]);

  const progress = clamp(pullDistance / threshold, 0, 1);
  const translateY = Math.min(pullDistance - 56, 0);
  const indicatorText = refreshing
    ? "Refreshing…"
    : progress >= 1
      ? "Release to refresh"
      : "Pull to refresh";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[45] flex justify-center"
      style={{
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        className={cn(
          "mt-[calc(var(--sat,0px)+6px)] flex items-center gap-3 rounded-full px-4 py-2 text-xs font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm",
          tone.ring,
        )}
        style={{ opacity: refreshing || pullDistance > 0 ? 1 : 0 }}
      >
        <span className={cn("relative h-5 w-5", tone.text)}>
          <span className="absolute inset-0 rounded-full border border-current/40" />
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(currentColor ${progress * 360}deg, transparent 0deg)`,
              mask: "radial-gradient(transparent 55%, #000 56%)",
              WebkitMask: "radial-gradient(transparent 55%, #000 56%)",
            }}
          />
          <span
            className={cn("absolute inset-1.5 rounded-full", tone.accent)}
            style={{ opacity: refreshing ? 1 : progress }}
          />
        </span>
        <span className={tone.text}>{indicatorText}</span>
      </div>
    </div>
  );
};
