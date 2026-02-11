import { Card } from "@/components/ui/card";
import { Flame } from "lucide-react";

type StreakCardProps = {
  days: number;
  bestWeek: number;
  message: string;
};

export const StreakCard = ({ days, bestWeek, message }: StreakCardProps) => (
  <Card className="mt-6 rounded-[28px] border border-border/60 bg-card px-5 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary/70">
          Streak
        </p>
        <h3 className="text-lg font-display font-semibold text-foreground">
          {days} day flow
        </h3>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Flame className="h-5 w-5" />
      </div>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    <div className="mt-4 flex items-center gap-3">
      <div className="flex-1 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
        Best week: {bestWeek} days
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
        {days}
      </div>
    </div>
  </Card>
);
