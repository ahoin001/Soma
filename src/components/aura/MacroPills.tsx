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
        className="rounded-[24px] border border-border/60 bg-card px-3 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
      >
        <p className="text-xs font-semibold text-secondary-foreground">{macro.label}</p>
        <Progress
          value={macro.goal > 0 ? (macro.current / macro.goal) * 100 : 0}
          className="mt-3 h-2 bg-primary/15"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          {macro.current}/{macro.goal} {macro.unit}
        </p>
      </Card>
    ))}
  </section>
);
