import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { PullToRefresh } from "./PullToRefresh";

type AppShellProps = {
  experience: "nutrition" | "fitness";
  children: ReactNode;
  className?: string;
  showNav?: boolean;
  onAddAction?: () => void;
  contentClassName?: string;
  safeAreaTop?: "none" | "default" | "extra";
};

/**
 * AppShell provides the immersive edge-to-edge PWA experience.
 * 
 * Key design decisions for native-like feel:
 * 1. NO top padding on the main container - backgrounds flow UNDER the status bar
 * 2. Fixed gradient overlays start at top: 0 and extend through the notch area
 * 3. A subtle blur scrim sits behind the status bar for text legibility
 * 4. Content areas handle their own safe-area padding internally
 * 5. The status bar appears to "float" over our app's beautiful gradients
 */
export const AppShell = ({
  experience,
  children,
  className,
  showNav = true,
  onAddAction,
  contentClassName,
  safeAreaTop = "none",
}: AppShellProps) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastValue = useRef(0);

  useEffect(() => {
    const update = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const next = Math.min(window.scrollY / 120, 1);
        if (Math.abs(next - lastValue.current) < 0.01) return;
        lastValue.current = next;
        setScrollProgress(next);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const solidOpacity = scrollProgress;

  return (
    <div
      className={cn(
        // NO pt-[env(safe-area-inset-top)] here! Let backgrounds flow edge-to-edge
        "relative min-h-screen min-h-[100svh] overflow-x-hidden text-foreground",
        showNav && "pb-[calc(6rem+var(--sab,0px))]",
        experience === "nutrition"
          ? "experience-nutrition bg-aura-surface"
          : "experience-fitness bg-slate-950",
        className,
      )}
    >
      {/*
        UNIFIED STATUS BAR GLASS — single element, scroll-reactive.
        
        At scroll = 0  → fully transparent so the header gradient bleeds
                          seamlessly under the system clock/battery icons.
        As user scrolls → a single frosted-glass bar fades in covering
                          exactly the safe-area height.  A soft gradient
                          mask below it lets content "dissolve" into the
                          blur instead of hitting a hard edge.
        
        Modern trend (iOS 18 / Arc / Linear): one thin glass region,
        no thick opaque header bar, content peeks through the blur.
      */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40 transition-opacity duration-300"
        style={{ opacity: solidOpacity }}
      >
        {/* Frosted glass — covers exactly the safe-area (notch / status bar) */}
        <div
          className={cn(
            "w-full backdrop-blur-xl backdrop-saturate-150",
            experience === "nutrition"
              ? "bg-white/70"
              : "bg-slate-950/75",
          )}
          style={{ height: "var(--sat, 0px)" }}
        />
        {/* Soft gradient fade — dissolves the hard edge into content below */}
        <div
          className="w-full"
          style={{
            height: "20px",
            background:
              experience === "nutrition"
                ? "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0))"
                : "linear-gradient(to bottom, rgba(15,23,42,0.6), rgba(15,23,42,0))",
          }}
        />
      </div>

      <PullToRefresh experience={experience} />

      <OfflineBanner />

      {/* Main content - safe area padding is handled by individual pages/headers */}
      <div
        className={cn(
          "relative z-30",
          safeAreaTop === "default" && "pt-[var(--sat,0px)]",
          safeAreaTop === "extra" && "pt-[calc(var(--sat,0px)+16px)]",
          contentClassName,
        )}
      >
        {children}
      </div>

      {showNav ? (
        <BottomNav experience={experience} onAddAction={onAddAction} />
      ) : null}
    </div>
  );
};
