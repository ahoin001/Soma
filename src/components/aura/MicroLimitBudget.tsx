import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

type MicroLimitBudgetProps = {
  label: string;
  current: number;
  limit: number;
  unit: string;
  className?: string;
};

/** Threshold (0–1) at which we show "close to limit" warning */
const WARNING_THRESHOLD = 0.8;

/**
 * Limit-type micronutrient UI: budget / "stay under" (e.g. sodium).
 * Bar fills as intake approaches limit; warning when close, danger when over.
 */
export function MicroLimitBudget({
  label,
  current,
  limit,
  unit,
  className,
}: MicroLimitBudgetProps) {
  const safeLimit = limit > 0 ? limit : 1;
  const percent = (current / safeLimit) * 100;
  const isOver = current > limit;
  const isWarning = !isOver && percent >= WARNING_THRESHOLD * 100;

  const status =
    isOver ? "over" : isWarning ? "close" : "under";
  const statusLabel =
    status === "over"
      ? "Over limit"
      : status === "close"
        ? "Close to limit"
        : "Under limit";

  return (
    <Card
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 px-3 py-3",
        isWarning && "border-amber-500/40 bg-amber-500/5",
        isOver && "border-destructive/40 bg-destructive/5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <span
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            status === "under" && "text-muted-foreground",
            status === "close" && "text-amber-600 dark:text-amber-400",
            status === "over" && "text-destructive",
          )}
          aria-live="polite"
        >
          {(isWarning || isOver) && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
          {statusLabel}
        </span>
      </div>
      <Progress
        value={Math.min(100, percent)}
        className={cn(
          "mt-2 h-2 bg-muted",
          status === "under" && "[&>div]:bg-primary",
          status === "close" && "[&>div]:bg-amber-500",
          status === "over" && "[&>div]:bg-destructive",
        )}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={`${label}: ${current} of ${limit} ${unit} limit. ${statusLabel}.`}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {isOver ? (
          <>
            <span className="font-medium text-destructive">
              {(current - limit).toLocaleString()} {unit} over
            </span>
            {" · "}
            {current.toLocaleString()} / {limit.toLocaleString()} {unit}
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">
              {(limit - current).toLocaleString()} {unit} left
            </span>
            {" · "}
            {current.toLocaleString()} / {limit.toLocaleString()} {unit}
          </>
        )}
      </p>
    </Card>
  );
}
