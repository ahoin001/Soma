import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ─── Constants (best practice: named values, single source of truth) ───
const AT_TOP_THRESHOLD_PX = 10;
const PULL_PREVENT_SCROLL_THRESHOLD_PX = 4;
const INDICATOR_OFFSET_PX = 56;
const MIN_DRAG_START_PX = 6;

type PullToRefreshProps = {
  experience: "nutrition" | "fitness";
  threshold?: number;
  maxPull?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isInteractiveElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, button, a, [role='button'], [contenteditable='true'], [data-no-pull-refresh='true']",
    ),
  );
};

const shouldAllowPull = (): boolean => {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (window.scrollY > 0) return false;
  // Avoid conflicts with open drawers/dialogs and explicit scroll locks.
  if (document.documentElement.classList.contains("scroll-locked")) return false;
  if (document.body?.dataset?.sheetOpen === "true") return false;
  return true;
};

export const PullToRefresh = ({
  experience,
  threshold = 80,
  maxPull = 140,
}: PullToRefreshProps) => {
  const queryClient = useQueryClient();
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  /** Current pull distance at touch time; used in touchend to avoid stale state. */
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [atTop, setAtTop] = useState(true);

  // Refetch active queries instead of full reload (preserves state, faster, smoother UX).
  const handleRefresh = useCallback(async () => {
    await queryClient.refetchQueries(
      { type: "active" },
      { throwOnError: true, cancelRefetch: false },
    );
  }, [queryClient]);

  const tone = useMemo(
    () =>
      experience === "nutrition"
        ? {
            ring: "bg-secondary text-primary",
            text: "text-primary/80",
            accent: "bg-primary",
          }
        : {
            ring: "bg-card/20 text-foreground",
            text: "text-foreground/80",
            accent: "bg-primary",
          },
    [experience],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setAtTop(window.scrollY <= AT_TOP_THRESHOLD_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("ontouchstart" in window)) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const onTouchStart = (event: TouchEvent) => {
      if (refreshing || !shouldAllowPull()) return;
      if (isInteractiveElement(event.target)) return;
      if (event.touches.length !== 1) return;
      startYRef.current = event.touches[0]?.clientY ?? null;
      pullingRef.current = false;
      pullDistanceRef.current = 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startYRef.current === null || refreshing) return;
      const currentY = event.touches[0]?.clientY ?? startYRef.current;
      const delta = currentY - startYRef.current;
      if (delta <= 0 || !shouldAllowPull()) {
        setPullDistance(0);
        pullDistanceRef.current = 0;
        pullingRef.current = false;
        return;
      }
      if (delta < MIN_DRAG_START_PX && !pullingRef.current) return;
      pullingRef.current = true;
      const distance = clamp(delta, 0, maxPull);
      pullDistanceRef.current = distance;
      setPullDistance(distance);
      if (distance > PULL_PREVENT_SCROLL_THRESHOLD_PX) {
        event.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) {
        startYRef.current = null;
        return;
      }
      const distanceAtRelease = pullDistanceRef.current;
      const shouldRefresh = distanceAtRelease >= threshold;
      setPullDistance(0);
      pullDistanceRef.current = 0;
      startYRef.current = null;
      pullingRef.current = false;
      if (shouldRefresh) {
        setRefreshing(true);
        try {
          await handleRefresh();
        } catch {
          appToast.error("Refresh failed", {
            description: "Check your connection and try again.",
          });
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
  }, [handleRefresh, maxPull, refreshing, threshold]);

  const progress = clamp(pullDistance / threshold, 0, 1);
  const translateY = Math.min(pullDistance - INDICATOR_OFFSET_PX, 0);
  const indicatorText = refreshing
    ? "Refreshing…"
    : progress >= 1
      ? "Release to refresh"
      : "Pull to refresh";
  const showHint = atTop && !refreshing && pullDistance === 0;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[45] flex justify-center"
      style={{
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        role="status"
        aria-live="polite"
        aria-label={refreshing ? "Refreshing content" : indicatorText}
        className={cn(
          "mt-[calc(var(--sat,0px)+6px)] flex items-center gap-3 rounded-full px-4 py-2 text-xs font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm",
          tone.ring,
        )}
        style={{
          opacity: refreshing || pullDistance > 0 ? 1 : showHint ? 0.5 : 0,
          transition: "opacity 0.2s ease",
        }}
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
