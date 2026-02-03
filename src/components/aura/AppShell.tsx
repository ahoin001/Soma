import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";

type AppShellProps = {
  experience: "nutrition" | "fitness";
  children: ReactNode;
  className?: string;
  showNav?: boolean;
  onAddAction?: () => void;
};

export const AppShell = ({
  experience,
  children,
  className,
  showNav = true,
  onAddAction,
}: AppShellProps) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("experience-nutrition", "experience-fitness");
    root.classList.add(
      experience === "nutrition" ? "experience-nutrition" : "experience-fitness",
    );
  }, [experience]);

  useEffect(() => {
    const update = () => {
      const next = Math.min(window.scrollY / 120, 1);
      setScrollProgress(next);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const scrimOpacity = 1 - scrollProgress;
  const solidOpacity = scrollProgress;
  const nutritionHudGradient =
    "radial-gradient(circle_at_15%_10%,_rgba(191,219,254,0.8),_transparent_45%),radial-gradient(circle_at_85%_0%,_rgba(167,243,208,0.9),_transparent_45%),radial-gradient(circle_at_70%_80%,_rgba(253,224,71,0.35),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(236,253,245,0.92)_50%,_rgba(209,250,229,0.88)_100%)";
  const fitnessScrim =
    "linear-gradient(180deg,rgba(15,23,42,0.9)_0%,rgba(15,23,42,0.6)_55%,rgba(15,23,42,0)_100%)";
  const solidBar =
    experience === "nutrition"
      ? nutritionHudGradient
      : "rgba(15,23,42,0.92)";

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-hidden pt-[env(safe-area-inset-top)] text-foreground",
        showNav && "pb-[calc(8rem+env(safe-area-inset-bottom))]",
        experience === "nutrition"
          ? "experience-nutrition bg-aura-surface"
          : "experience-fitness bg-background",
        className,
      )}
    >
      {experience === "nutrition" ? (
        <>
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[360px]"
            style={{ background: nutritionHudGradient }}
          />
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[calc(env(safe-area-inset-top)+56px)] backdrop-blur-sm"
            style={{
              background: "rgba(255,255,255,0.6)",
              opacity: solidOpacity,
            }}
          />
        </>
      ) : (
        <>
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[calc(env(safe-area-inset-top)+16px)] backdrop-blur-sm"
            style={{
              background: fitnessScrim,
              opacity: scrimOpacity,
            }}
          />
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[calc(env(safe-area-inset-top)+16px)] shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            style={{ background: solidBar, opacity: solidOpacity }}
          />
        </>
      )}
      {experience === "nutrition" ? (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,_rgba(125,211,252,0.28),_transparent_45%),radial-gradient(circle_at_80%_15%,_rgba(134,239,172,0.32),_transparent_45%),radial-gradient(circle_at_70%_80%,_rgba(253,224,71,0.2),_transparent_50%),radial-gradient(circle_at_10%_85%,_rgba(59,130,246,0.18),_transparent_45%)] opacity-70" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.9)_0%,_rgba(255,255,255,0.7)_35%,_rgba(255,255,255,0.85)_100%)]" />
        </div>
      ) : null}
      <div className="relative z-10">{children}</div>
      {showNav ? (
        <BottomNav experience={experience} onAddAction={onAddAction} />
      ) : null}
    </div>
  );
};
