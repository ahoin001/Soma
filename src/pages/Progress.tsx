import { useMemo, useState } from "react";
import { AppShell } from "@/components/aura";
import {
  ProgressChartPanel,
  SmartCoachCard,
  WeightLogSection,
} from "@/components/aura/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { buildDateRange } from "@/lib/progressChartUtils";
import { useAppStore } from "@/state/AppStore";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import {
  useCaloriesByDate,
  useWeightGuidance,
  useWeightStats,
} from "@/hooks/useWeightProgress";
import { useNutritionTrend } from "@/hooks/useNutritionTrend";
import { useWeightLogs } from "@/hooks/useTracking";

const Progress = () => {
  const { entries, addEntry, removeEntry } = useWeightLogs();
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editWeights, setEditWeights] = useState<Record<string, string>>({});
  const [activeWeightDate, setActiveWeightDate] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<7 | 14 | 30>(14);
  const [activeChart, setActiveChart] = useState<
    "weight" | "calories" | "macros" | "micros"
  >("weight");
  const [selectedMicro, setSelectedMicro] = useState<
    keyof import("@/types/progress").NutritionTrendMicros
  >("sodium_mg");

  const { userProfile, nutrition } = useAppStore();

  const caloriesByDate = useCaloriesByDate(activeWeightDate);
  const rangeDates = useMemo(() => buildDateRange(trendRange), [trendRange]);
  const nutritionTrend = useNutritionTrend(rangeDates);

  const {
    filteredEntries: filteredWeightEntries,
    stats,
    latest,
    lastEntries,
  } = useWeightStats(entries, trendRange);

  const guidance = useWeightGuidance(entries, userProfile.goal);

  const caloriesTrendEntries = useMemo(
    () =>
      rangeDates.map((dateKey) => ({
        date: dateKey,
        value: nutritionTrend[dateKey]?.kcal ?? null,
      })),
    [rangeDates, nutritionTrend],
  );

  const macroSeries = useMemo(
    () => [
      {
        key: "protein",
        label: "Protein",
        color: "#10b981",
        entries: rangeDates.map((dateKey) => ({
          date: dateKey,
          value: nutritionTrend[dateKey]?.protein ?? null,
        })),
      },
      {
        key: "carbs",
        label: "Carbs",
        color: "#60a5fa",
        entries: rangeDates.map((dateKey) => ({
          date: dateKey,
          value: nutritionTrend[dateKey]?.carbs ?? null,
        })),
      },
      {
        key: "fat",
        label: "Fat",
        color: "#f59e0b",
        entries: rangeDates.map((dateKey) => ({
          date: dateKey,
          value: nutritionTrend[dateKey]?.fat ?? null,
        })),
      },
    ],
    [rangeDates, nutritionTrend],
  );

  const microEntries = useMemo(
    () =>
      rangeDates.map((dateKey) => ({
        date: dateKey,
        value: nutritionTrend[dateKey]?.micros?.[selectedMicro] ?? null,
      })),
    [rangeDates, nutritionTrend, selectedMicro],
  );

  const saveEntry = async () => {
    const numeric = Number(weight);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    await addEntry({ date, weight: numeric, unit: "lb" });
    setWeight("");
  };

  const handleApplySuggestion = (nextGoal: number) => {
    nutrition.setGoal?.(nextGoal);
    toast("Goal updated", {
      description: `Daily goal set to ${nextGoal} cal.`,
    });
  };

  return (
    <AppShell experience="nutrition">
      <div
        className="mx-auto w-full max-w-[420px] px-4 pb-10"
        style={{
          paddingTop: "calc(1.5rem + var(--sat, env(safe-area-inset-top)))",
        }}
      >
        <div className="rounded-[28px] bg-gradient-to-br from-emerald-100 via-emerald-50 to-white px-5 py-6 shadow-[0_18px_40px_rgba(16,185,129,0.2)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">
            Progress
          </p>
          <h1 className="text-2xl font-display font-semibold text-emerald-950">
            {activeChart === "weight"
              ? "Weight trend"
              : activeChart === "calories"
                ? "Calorie trend"
                : activeChart === "macros"
                  ? "Macro trend"
                  : "Micro trend"}
          </h1>
          <p className="mt-1 text-sm text-emerald-700/70">
            {activeChart === "weight"
              ? "Log any time. The chart adapts to gaps."
              : activeChart === "calories"
                ? `Daily intake over the last ${trendRange} days.`
                : activeChart === "macros"
                  ? `Macro balance across the last ${trendRange} days.`
                  : `Micronutrients over the last ${trendRange} days.`}
          </p>

          {entries.length === 0 && (
            <EmptyState
              icon={Scale}
              title="Your trend will appear here"
              description="Log your first weight to see your progress over time."
              action={{
                label: "Log weight",
                onClick: () =>
                  document.getElementById("weight-log")?.scrollIntoView({ behavior: "smooth" }),
              }}
              className="mt-4 rounded-[22px] border border-dashed border-emerald-200 bg-emerald-50/50 py-8"
            />
          )}

          <ProgressChartPanel
            activeChart={activeChart}
            onActiveChartChange={setActiveChart}
            trendRange={trendRange}
            onTrendRangeChange={setTrendRange}
            weightEntries={filteredWeightEntries}
            caloriesByDate={caloriesByDate}
            onActiveWeightDateChange={setActiveWeightDate}
            caloriesEntries={caloriesTrendEntries}
            macroSeries={macroSeries}
            microEntries={microEntries}
            selectedMicro={selectedMicro}
            onSelectedMicroChange={setSelectedMicro}
            stats={stats}
          />

          <div id="weight-log">
            <WeightLogSection
            weight={weight}
            onWeightChange={setWeight}
            date={date}
            onDateChange={setDate}
            onSaveEntry={saveEntry}
            latest={latest}
            lastEntries={lastEntries}
            editWeights={editWeights}
            onEditWeightChange={(dateKey, value) =>
              setEditWeights((prev) => ({ ...prev, [dateKey]: value }))
            }
            onSaveEdit={(entry, nextValue) =>
              addEntry({
                date: entry.date,
                weight: nextValue,
                unit: "lb",
              })
            }
            onRemoveEntry={removeEntry}
          />
          </div>
        </div>

        {guidance && (
          <SmartCoachCard
            guidance={guidance}
            currentGoal={nutrition.summary?.goal ?? 0}
            onApplySuggestion={handleApplySuggestion}
          />
        )}
      </div>
    </AppShell>
  );
};

export default Progress;
