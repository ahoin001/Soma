import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatShortDate } from "@/lib/progressChartUtils";
import type {
  MacroSeriesItem,
  TrendEntry,
  WeightEntry,
  WeightStats,
} from "@/types/progress";
import type { NutritionTrendMicros } from "@/types/progress";
import { CaloriesChart } from "./CaloriesChart";
import { MacroChart } from "./MacroChart";
import { MicroChart } from "./MicroChart";
import { WeightChart } from "./WeightChart";

const CHART_OPTIONS: SegmentedOption[] = [
  { value: "weight", label: "Weight" },
  { value: "calories", label: "Calories" },
  { value: "macros", label: "Macros" },
  { value: "micros", label: "Micros" },
];

export const MICRO_OPTIONS: { key: keyof NutritionTrendMicros; label: string; unit: string }[] = [
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
  { key: "fiber_g", label: "Fiber", unit: "g" },
  { key: "sugar_g", label: "Sugar", unit: "g" },
  { key: "potassium_mg", label: "Potassium", unit: "mg" },
  { key: "cholesterol_mg", label: "Cholesterol", unit: "mg" },
  { key: "saturated_fat_g", label: "Saturated fat", unit: "g" },
];

const RANGE_OPTIONS: SegmentedOption[] = [
  { value: "7", label: "7d" },
  { value: "14", label: "14d" },
  { value: "30", label: "30d" },
];

type ChartType = "weight" | "calories" | "macros" | "micros";

type ProgressChartPanelProps = {
  activeChart: ChartType;
  onActiveChartChange: (v: ChartType) => void;
  trendRange: 7 | 14 | 30;
  onTrendRangeChange: (v: 7 | 14 | 30) => void;
  weightEntries: WeightEntry[];
  caloriesByDate: Record<string, number | null | undefined>;
  onActiveWeightDateChange: (date: string | null) => void;
  caloriesEntries: TrendEntry[];
  macroSeries: MacroSeriesItem[];
  microEntries: TrendEntry[];
  selectedMicro: keyof NutritionTrendMicros;
  onSelectedMicroChange: (key: keyof NutritionTrendMicros) => void;
  stats: WeightStats | null;
};

export const ProgressChartPanel = ({
  activeChart,
  onActiveChartChange,
  trendRange,
  onTrendRangeChange,
  weightEntries,
  caloriesByDate,
  onActiveWeightDateChange,
  caloriesEntries,
  macroSeries,
  microEntries,
  selectedMicro,
  onSelectedMicroChange,
  stats,
}: ProgressChartPanelProps) => {
  const selectedMicroOption = MICRO_OPTIONS.find((o) => o.key === selectedMicro) ?? MICRO_OPTIONS[0];
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={activeChart}
          onValueChange={(v) => onActiveChartChange(v as ChartType)}
          options={CHART_OPTIONS}
          className="min-w-[220px] flex-1"
        />
        <SegmentedControl
          value={String(trendRange)}
          onValueChange={(v) => onTrendRangeChange(Number(v) as 7 | 14 | 30)}
          options={RANGE_OPTIONS}
          className="min-w-[150px]"
        />
      </div>
      <div className="mt-4 rounded-[22px] border border-border/70 bg-card/80 p-3 shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
        {activeChart === "weight" && (
          <>
            <WeightChart
              entries={weightEntries}
              caloriesByDate={caloriesByDate}
              onActiveDateChange={onActiveWeightDateChange}
            />
            {stats && (
              <>
                <div className="mt-3 flex items-center justify-between text-xs text-primary/80">
                  <span>Low {stats.minWeight} lb</span>
                  <span>High {stats.maxWeight} lb</span>
                </div>
                <div className="mt-2 grid grid-cols-3 text-[11px] text-primary/70">
                  <span>{formatShortDate(stats.startDate)}</span>
                  <span className="text-center">
                    {stats.midDate ? formatShortDate(stats.midDate) : ""}
                  </span>
                  <span className="text-right">
                    {formatShortDate(stats.endDate)}
                  </span>
                </div>
              </>
            )}
            <div className="mt-4 flex items-center justify-between text-[11px] text-primary/70">
              <span>Weight (lb)</span>
              <span>Date</span>
            </div>
          </>
        )}
        {activeChart === "calories" && (
          <>
            <CaloriesChart entries={caloriesEntries} />
            <div className="mt-4 flex items-center justify-between text-[11px] text-primary/70">
              <span>Calories</span>
              <span>Last {trendRange} days</span>
            </div>
          </>
        )}
        {activeChart === "macros" && (
          <>
            <MacroChart series={macroSeries} />
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-primary/70">
              {macroSeries.map((macro) => (
                <span
                  key={macro.key}
                  className="inline-flex items-center gap-2"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: macro.color }}
                  />
                  {macro.label}
                </span>
              ))}
            </div>
          </>
        )}
        {activeChart === "micros" && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Show:</span>
              <Select
                value={selectedMicro}
                onValueChange={(v) => onSelectedMicroChange(v as keyof NutritionTrendMicros)}
              >
                <SelectTrigger className="h-9 w-[140px] rounded-full border-border bg-card text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MICRO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label} ({opt.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <MicroChart
              entries={microEntries}
              label={selectedMicroOption.label}
              unit={selectedMicroOption.unit}
            />
            <div className="mt-4 flex items-center justify-between text-[11px] text-primary/70">
              <span>{selectedMicroOption.label} ({selectedMicroOption.unit})</span>
              <span>Last {trendRange} days</span>
            </div>
          </>
        )}
      </div>
    </>
  );
};
