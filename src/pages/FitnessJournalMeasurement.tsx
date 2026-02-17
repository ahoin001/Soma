import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  JOURNAL_MEASUREMENT_TYPES,
  MEASUREMENT_TYPE_LABELS,
  type JournalMeasurementType,
} from "@/types/journal";
import {
  fetchJournalMeasurements,
  createJournalMeasurement,
} from "@/lib/api";
import { toast } from "sonner";

const chartConfig = {
  value: { label: "Value", color: "hsl(160 84% 39%)" },
} satisfies ChartConfig;

const DEFAULT_UNIT: Record<JournalMeasurementType, string> = {
  body_weight: "kg",
  neck: "cm",
  shoulders: "cm",
  chest: "cm",
  left_bicep: "cm",
  right_bicep: "cm",
  left_forearm: "cm",
  right_forearm: "cm",
  waist: "cm",
  hips: "cm",
  left_thigh: "cm",
  right_thigh: "cm",
  left_calf: "cm",
  right_calf: "cm",
};

const FitnessJournalMeasurement = () => {
  const { type: typeParam } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [valueInput, setValueInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const type = typeParam && JOURNAL_MEASUREMENT_TYPES.includes(typeParam as JournalMeasurementType)
    ? (typeParam as JournalMeasurementType)
    : null;

  const { data, isLoading } = useQuery({
    queryKey: ["journal", "measurements", type ?? ""],
    queryFn: () => fetchJournalMeasurements({ type: type!, limit: 100 }),
    enabled: Boolean(type),
  });

  const createMutation = useMutation({
    mutationFn: createJournalMeasurement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal", "measurements"] });
      setValueInput("");
      setNotesInput("");
      setDrawerOpen(false);
      toast.success("Entry logged");
    },
    onError: () => {
      toast.error("Failed to log entry");
    },
  });

  const entries = data?.items ?? [];
  const defaultUnit = type ? DEFAULT_UNIT[type] : "cm";

  const chartData = useMemo(
    () =>
      [...entries]
        .reverse()
        .map((e) => ({
          day: e.logged_at,
          label: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
          }).format(new Date(e.logged_at)),
          value: Number(e.value),
        })),
    [entries],
  );

  const handleSubmit = () => {
    const num = Number(valueInput?.replace(",", "."));
    if (!type || !Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid value");
      return;
    }
    createMutation.mutate({
      measurement_type: type,
      value: num,
      unit: defaultUnit,
      notes: notesInput.trim() || undefined,
    });
  };

  if (type == null) {
    return (
      <AppShell experience="fitness" onAddAction={() => navigate("/fitness")} safeAreaTop="extra">
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6">
          <p className="text-muted-foreground">Invalid measurement type.</p>
          <Button
            variant="outline"
            className="mt-4 rounded-full"
            onClick={() => navigate("/fitness/journal")}
          >
            Back to Journal
          </Button>
        </div>
      </AppShell>
    );
  }

  const title = MEASUREMENT_TYPE_LABELS[type];

  return (
    <AppShell experience="fitness" onAddAction={() => navigate("/fitness")} safeAreaTop="extra">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-foreground">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => navigate("/fitness/journal")}
          >
            ✕
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Measurement
            </p>
            <h1 className="mt-1 text-lg font-display font-semibold">{title}</h1>
          </div>
          <div className="w-10" />
        </div>

        <div className="mt-6 rounded-[28px] border border-border/70 bg-card/55 px-3 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Over time
          </p>
          {isLoading ? (
            <Skeleton className="mt-3 h-[200px] w-full rounded-2xl" />
          ) : chartData.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No entries yet. Log your first value below.
            </p>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="mt-3 h-[220px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-foreground/50"
            >
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 24, left: 28 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [`${Number(value)} ${defaultUnit}`, title]}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>

        <div className="mt-6">
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button className="w-full rounded-full">Log new entry</Button>
            </DrawerTrigger>
            <DrawerContent className="rounded-t-[28px] border-t border-border/70 bg-card">
              <DrawerHeader>
                <DrawerTitle>Log {title}</DrawerTitle>
              </DrawerHeader>
              <div className="grid gap-4 px-4">
                <div>
                  <Label htmlFor="value">Value ({defaultUnit})</Label>
                  <Input
                    id="value"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Note (optional)</Label>
                  <Input
                    id="notes"
                    placeholder="e.g. morning, post-workout"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>
              <DrawerFooter className="flex-row gap-2 pt-4">
                <DrawerClose asChild>
                  <Button variant="outline" className="rounded-full">
                    Cancel
                  </Button>
                </DrawerClose>
                <Button
                  className="rounded-full"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>

        <div className="mt-6 rounded-[28px] border border-border/70 bg-card/55 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            History
          </p>
          {entries.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/60 px-3 py-2 text-sm"
                >
                  <span className="text-foreground/90">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(entry.logged_at))}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {Number(entry.value).toLocaleString()} {entry.unit}
                    {entry.notes ? ` · ${entry.notes}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default FitnessJournalMeasurement;
