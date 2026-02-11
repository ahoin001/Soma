import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { WeightGuidance } from "@/hooks/useWeightProgress";

type SmartCoachCardProps = {
  guidance: WeightGuidance;
  currentGoal: number;
  onApplySuggestion: (nextGoal: number) => void;
};

export const SmartCoachCard = ({
  guidance,
  currentGoal,
  onApplySuggestion,
}: SmartCoachCardProps) => {
  const nextGoal = Math.max(currentGoal + guidance.adjust, 1200);

  return (
    <Card className="mt-6 rounded-[28px] border border-border/60 bg-card px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">
        Smart coach
      </p>
      <h2 className="mt-2 text-lg font-display font-semibold text-foreground">
        {guidance.status === "on"
          ? "You are on track"
          : guidance.status === "slow"
            ? "Progress is slower than expected"
            : "Progress is faster than expected"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Current trend is{" "}
        <span className="font-semibold text-primary">
          {guidance.rate.toFixed(2)} lb/week
        </span>{" "}
        for your {guidance.goal} goal. Ideal range is {guidance.min} to{" "}
        {guidance.max} lb/week.
      </p>
      {guidance.adjust !== 0 ? (
        <div className="mt-4 rounded-[18px] bg-secondary/80 px-4 py-3 text-sm text-secondary-foreground">
          Consider{" "}
          {guidance.adjust > 0 ? "increasing" : "decreasing"} your calorie goal
          by about{" "}
          <span className="font-semibold">{Math.abs(guidance.adjust)} cal</span>{" "}
          per day.
        </div>
      ) : (
        <div className="mt-4 rounded-[18px] bg-secondary/80 px-4 py-3 text-sm text-secondary-foreground">
          Keep your current goal steady and check in weekly.
        </div>
      )}
      {guidance.adjust !== 0 && (
        <Button
          type="button"
          className="mt-4 w-full rounded-full bg-primary py-5 text-sm font-semibold text-primary-foreground shadow-[0_16px_30px_rgba(15,23,42,0.35)] hover:bg-primary/90"
          onClick={() => onApplySuggestion(nextGoal)}
        >
          Apply suggestion
        </Button>
      )}
    </Card>
  );
};
