import { Card } from "@/components/ui/card";
import { Flame } from "lucide-react";

type StreakCardProps = {
  days: number;
  bestWeek: number;
  message: string;
};

export const StreakCard = ({ days, bestWeek, message }: StreakCardProps) => (
  <Card className="card-subtle mt-4 rounded-[28px] px-5 py-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="section-caption">Streak</p>
        <h2 className="text-lg font-display font-semibold text-foreground">
          {days} day flow
        </h2>
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
