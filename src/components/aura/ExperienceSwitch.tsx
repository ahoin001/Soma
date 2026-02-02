import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

type ExperienceSwitchProps = {
  variant?: "light" | "dark";
  className?: string;
};

export const ExperienceSwitch = ({
  variant = "light",
  className,
}: ExperienceSwitchProps) => {
  const containerTone =
    variant === "dark"
      ? "border-white/10 bg-slate-950/60 text-white"
      : "border-black/5 bg-white/80 text-slate-700";
  const activeTone =
    variant === "dark"
      ? "bg-white/15 text-white"
      : "bg-white text-slate-900 shadow-sm";
  const inactiveTone =
    variant === "dark" ? "text-white/70" : "text-slate-500";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-1 text-xs font-semibold backdrop-blur",
        containerTone,
        className,
      )}
      role="tablist"
      aria-label="Switch experience"
    >
      <NavLink
        to="/nutrition"
        className={({ isActive }) =>
          cn(
            "rounded-full px-3 py-1 transition",
            isActive ? activeTone : inactiveTone,
          )
        }
        role="tab"
        aria-label="Nutrition experience"
      >
        Nutrition
      </NavLink>
      <NavLink
        to="/fitness"
        className={({ isActive }) =>
          cn(
            "rounded-full px-3 py-1 transition",
            isActive ? activeTone : inactiveTone,
          )
        }
        role="tab"
        aria-label="Fitness experience"
      >
        Fitness
      </NavLink>
    </div>
  );
};
