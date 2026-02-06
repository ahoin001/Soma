import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";

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
        STATUS BAR SCRIM — scroll-reactive
        At scroll=0 the header gradient flows seamlessly under the status bar
        icons (the "invisible header" effect). As the user scrolls and the
        gradient moves off-screen, a frosted-glass scrim fades in so the
        time/battery text stays readable over whatever content is underneath.
      */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40"
        style={{ height: "var(--sat, 0px)" }}
      >
        <div
          className={cn(
            "h-full w-full backdrop-blur-md transition-opacity duration-200",
            experience === "nutrition"
              ? "bg-white/80"
              : "bg-slate-950/85"
          )}
          style={{ opacity: solidOpacity }}
        />
      </div>

      {/* 
        SCROLL-AWARE HEADER BAR
        As user scrolls, a solid/blurred bar fades in below the status bar
        to separate the header from content. When combined with the status
        bar scrim above, they form one unified frosted-glass region.
      */}
      <div
        className="pointer-events-none fixed inset-x-0 z-40 backdrop-blur-md transition-opacity duration-200"
        style={{
          top: "var(--sat, 0px)",
          height: "56px",
          opacity: solidOpacity,
          background: experience === "nutrition"
            ? "rgba(255,255,255,0.85)"
            : "rgba(15,23,42,0.92)",
          boxShadow: solidOpacity > 0.5 
            ? "0 4px 20px rgba(0,0,0,0.08)" 
            : "none",
        }}
      />

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
