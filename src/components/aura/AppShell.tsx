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

  // Nutrition experience: soft, luminous gradient that flows under the status bar
  const nutritionHudGradient =
    "radial-gradient(circle_at_15%_10%,_rgba(191,219,254,0.8),_transparent_45%),radial-gradient(circle_at_85%_0%,_rgba(167,243,208,0.9),_transparent_45%),radial-gradient(circle_at_70%_80%,_rgba(253,224,71,0.35),_transparent_55%),linear-gradient(180deg,_rgba(240,253,244,1)_0%,_rgba(236,253,245,0.92)_50%,_rgba(209,250,229,0.88)_100%)";

  // Fitness experience: dark, immersive background
  const fitnessGradient =
    "linear-gradient(180deg,_#020617_0%,_#0f172a_100%)";

  return (
    <div
      className={cn(
        // NO pt-[env(safe-area-inset-top)] here! Let backgrounds flow edge-to-edge
        "relative min-h-screen overflow-x-hidden text-foreground",
        showNav && "pb-[calc(6rem+var(--sab,0px))]",
        experience === "nutrition"
          ? "experience-nutrition bg-aura-surface"
          : "experience-fitness bg-slate-950",
        className,
      )}
    >
      {/* 
        IMMERSIVE BACKGROUND LAYER
        These gradients flow under the status bar for that premium edge-to-edge feel.
        The gradient starts at the very top of the screen (top: 0).
      */}
      {experience === "nutrition" ? (
        <>
          {/* Main ambient gradient - extends under status bar */}
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-20 h-[400px]"
            style={{ background: nutritionHudGradient }}
          />
          {/* Decorative orbs */}
          <div className="pointer-events-none fixed inset-0 z-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,_rgba(125,211,252,0.28),_transparent_45%),radial-gradient(circle_at_80%_15%,_rgba(134,239,172,0.32),_transparent_45%),radial-gradient(circle_at_70%_80%,_rgba(253,224,71,0.2),_transparent_50%),radial-gradient(circle_at_10%_85%,_rgba(59,130,246,0.18),_transparent_45%)] opacity-70" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.9)_0%,_rgba(255,255,255,0.7)_35%,_rgba(255,255,255,0.85)_100%)]" />
          </div>
        </>
      ) : (
        /* Fitness: dark gradient that extends under status bar */
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-20 h-screen"
          style={{ background: fitnessGradient }}
        />
      )}

      {/* 
        STATUS BAR SCRIM
        A subtle blur layer that sits ONLY in the status bar area.
        This ensures the time/battery icons are always legible while
        our beautiful gradient shows through.
      */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40"
        style={{ height: "var(--sat, 0px)" }}
      >
        <div
          className={cn(
            "h-full w-full backdrop-blur-md",
            experience === "nutrition"
              ? "bg-white/30"
              : "bg-slate-950/50"
          )}
        />
      </div>

      {/* 
        SCROLL-AWARE HEADER BAR
        As user scrolls, a solid/blurred bar fades in below the status bar
        to separate the header from content.
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
