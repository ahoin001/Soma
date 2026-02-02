import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

type WeeklyPreviewProps = {
  weeklyKcal: { day: string; kcal: number }[];
  goal: number;
};

export const WeeklyPreview = ({ weeklyKcal, goal }: WeeklyPreviewProps) => (
  <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
          Weekly preview
        </p>
        <h3 className="text-lg font-display font-semibold text-slate-900">
          Nourishment rhythm
        </h3>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
        <Sparkles className="h-5 w-5" />
      </div>
    </div>

    <div className="mt-4 flex items-end justify-between gap-2">
      {weeklyKcal.map((entry) => {
        const pct = Math.min(entry.kcal / goal, 1);
        return (
          <div key={entry.day} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-16 w-full flex-col justify-end rounded-full bg-emerald-50">
              <div
                className="w-full rounded-full bg-emerald-400/80"
                style={{ height: `${Math.max(pct * 100, 15)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500">
              {entry.day}
            </span>
          </div>
        );
      })}
    </div>
  </Card>
);
