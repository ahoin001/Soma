import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ExperienceSwitchProps = {
  variant?: "light" | "dark";
  className?: string;
};

export const ExperienceSwitch = ({
  variant = "light",
  className,
}: ExperienceSwitchProps) => {
  const location = useLocation();
  const isFitness = location.pathname.startsWith("/fitness");
  const options = [
    { label: "Nutrition", to: "/nutrition", active: !isFitness },
    { label: "Fitness", to: "/fitness", active: isFitness },
  ] as const;
  const containerTone =
    variant === "dark"
      ? "border-border/70 bg-background/60 text-foreground"
      : "border-border/60 bg-card/80 text-secondary-foreground";
  const activeTone =
    variant === "dark"
      ? "bg-card/55 text-foreground"
      : "bg-card text-foreground shadow-sm";
  const inactiveTone =
    variant === "dark" ? "text-foreground/80" : "text-muted-foreground";

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
      {options.map((option) => (
        <NavLink
          key={option.to}
          to={option.to}
          className={cn(
            "relative rounded-full px-3 py-1 transition",
            option.active ? activeTone : inactiveTone,
          )}
          role="tab"
          aria-label={`${option.label} experience`}
        >
          {option.active ? (
            <motion.span
              layoutId="experience-switch-pill"
              className={cn(
                "absolute inset-0 rounded-full",
                activeTone,
                variant === "dark"
                  ? "shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
                  : "shadow-[0_10px_22px_rgba(15,23,42,0.2)]",
              )}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            />
          ) : null}
          <motion.span
            layout="position"
            className="relative z-10"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {option.label}
          </motion.span>
        </NavLink>
      ))}
    </div>
  );
};
