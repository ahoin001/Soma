import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { formatShortDate } from "@/lib/progressChartUtils";
import type { WeightEntry } from "@/types/progress";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

type WeightLogSectionProps = {
  weight: string;
  onWeightChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  onSaveEntry: () => void;
  latest: WeightEntry | null;
  lastEntries: WeightEntry[];
  editWeights: Record<string, string>;
  onEditWeightChange: (date: string, value: string) => void;
  onSaveEdit: (entry: WeightEntry, nextValue: number) => void;
  onRemoveEntry: (date: string) => void;
};

export const WeightLogSection = ({
  weight,
  onWeightChange,
  date,
  onDateChange,
  onSaveEntry,
  latest,
  lastEntries,
  editWeights,
  onEditWeightChange,
  onSaveEdit,
  onRemoveEntry,
}: WeightLogSectionProps) => {
  return (
    <div className="mt-4 grid gap-3">
      {latest && (
        <div className="flex items-center justify-between gap-2 overflow-hidden rounded-[20px] bg-card/80 px-4 py-3 text-sm text-foreground">
          <span className="shrink-0">Latest</span>
          <span className="truncate font-semibold">
            {latest.weight} lb &middot; {formatShortDate(latest.date)}
          </span>
        </div>
      )}

      <div className="rounded-[20px] border border-border/70 bg-card/90 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              Log weight
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              Check-in
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
              placeholder="Weight"
              className="h-11 w-full min-w-0 rounded-full pr-10"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground">
              lbs
            </span>
          </div>
          <Input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-11 w-full min-w-0 rounded-full text-sm"
          />
        </div>
        <Button
          type="button"
          className="mt-3 w-full rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-[0_16px_30px_rgba(15,23,42,0.35)] hover:bg-primary/90"
          onClick={onSaveEntry}
        >
          Save check-in
        </Button>
      </div>

      {lastEntries.length > 0 && (
        <Collapsible className="rounded-[20px] border border-border/70 bg-card/90">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="group flex w-full items-center justify-between px-4 py-4 text-left"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">
                  Recent entries
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Correct a weight
                </p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-primary transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 px-4 pb-4">
              {lastEntries.map((entry) => (
                <div
                  key={entry.date}
                  className="flex items-center gap-2 rounded-[16px] bg-secondary/70 px-3 py-2"
                >
                  <div className="shrink-0 text-xs font-semibold text-primary">
                    {formatShortDate(entry.date)}
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={editWeights[entry.date] ?? String(entry.weight)}
                      onChange={(e) =>
                        onEditWeightChange(entry.date, e.target.value)
                      }
                      className="h-9 w-full rounded-full bg-card pr-10"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground">
                      lbs
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 shrink-0 rounded-full px-3 text-xs"
                    onClick={() => {
                      const nextValue = Number(
                        editWeights[entry.date] ?? entry.weight,
                      );
                      if (!Number.isFinite(nextValue) || nextValue <= 0) {
                        toast("Enter a valid weight");
                        return;
                      }
                      onSaveEdit(entry, nextValue);
                      toast("Weight updated");
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full text-destructive hover:text-destructive/80"
                    onClick={() => {
                      onRemoveEntry(entry.date);
                      toast("Weight removed");
                    }}
                    aria-label={`Remove entry for ${formatShortDate(entry.date)}`}
                  >
                    &times;
                  </Button>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
