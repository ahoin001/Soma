import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

export type SegmentedOption = {
  value: string;
  label: React.ReactNode;
};

type SegmentedControlProps = {
  value: string;
  options: SegmentedOption[];
  onValueChange: (value: string) => void;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  indicatorClassName?: string;
};

export const SegmentedControl = ({
  value,
  options,
  onValueChange,
  className,
  itemClassName,
  activeClassName,
  inactiveClassName,
  indicatorClassName,
}: SegmentedControlProps) => {
  const layoutId = useId();

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={cn(
              "relative rounded-full px-3 py-2 text-xs font-semibold transition",
              isActive ? "text-white" : "text-emerald-700 hover:text-emerald-900",
              itemClassName,
              isActive ? activeClassName : inactiveClassName,
            )}
            aria-pressed={isActive}
          >
            {isActive ? (
              <motion.div
                layoutId={`segmented-pill-${layoutId}`}
                className={cn(
                  "absolute inset-0 rounded-full bg-emerald-500 shadow-[0_8px_20px_rgba(16,185,129,0.3)]",
                  indicatorClassName,
                )}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
              />
            ) : null}
            <span className="relative z-10 flex items-center gap-2">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
