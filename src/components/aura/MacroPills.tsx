import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { MacroTarget } from "@/data/mock";
import { cn } from "@/lib/utils";

type MacroPillsProps = {
  macros: MacroTarget[];
  className?: string;
};

export const MacroPills = ({ macros, className }: MacroPillsProps) => (
  <section className={cn("mt-6 grid grid-cols-3 gap-3", className)}>
    {macros.map((macro) => (
      <Card
        key={macro.key}
        className="rounded-[24px] border border-black/5 bg-white px-3 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
      >
        <p className="text-xs font-semibold text-slate-700">{macro.label}</p>
        <Progress
          value={(macro.current / macro.goal) * 100}
          className="mt-3 h-2 bg-emerald-100"
        />
        <p className="mt-3 text-xs text-slate-500">
          {macro.current}/{macro.goal} {macro.unit}
        </p>
      </Card>
    ))}
  </section>
);
