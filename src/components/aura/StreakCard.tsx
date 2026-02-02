import { Card } from "@/components/ui/card";
import { Flame } from "lucide-react";

type StreakCardProps = {
  days: number;
  bestWeek: number;
  message: string;
};

export const StreakCard = ({ days, bestWeek, message }: StreakCardProps) => (
  <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
          Streak
        </p>
        <h3 className="text-lg font-display font-semibold text-slate-900">
          {days} day flow
        </h3>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-500">
        <Flame className="h-5 w-5" />
      </div>
    </div>
    <p className="mt-3 text-sm text-slate-600">{message}</p>
    <div className="mt-4 flex items-center gap-3">
      <div className="flex-1 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
        Best week: {bestWeek} days
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        {days}
      </div>
    </div>
  </Card>
);
