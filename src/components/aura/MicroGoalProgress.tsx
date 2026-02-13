import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type MicroGoalProgressProps = {
  label: string;
  current: number;
  goal: number;
  unit: string;
  className?: string;
};

/**
 * Goal-type micronutrient UI: progress toward a minimum target (e.g. fiber).
 * Matches macro goal UX: bar fills as user approaches goal; "Goal met" when at or over.
 */
export function MicroGoalProgress({
  label,
  current,
  goal,
  unit,
  className,
}: MicroGoalProgressProps) {
  const safeGoal = goal > 0 ? goal : 1;
  const percent = Math.min(100, (current / safeGoal) * 100);
  const met = current >= goal;

  return (
    <Card
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 px-3 py-3",
        met && "border-primary/30 bg-primary/5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {met && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary" aria-hidden>
            <Check className="h-3.5 w-3.5" />
            Goal met
          </span>
        )}
      </div>
      <Progress
        value={percent}
        className={cn(
          "mt-2 h-2 bg-primary/15",
          met && "[&>div]:bg-primary",
        )}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-label={`${label}: ${current} of ${goal} ${unit}${met ? ", goal met" : ""}`}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {current.toLocaleString()} / {goal.toLocaleString()} {unit}
      </p>
    </Card>
  );
}
