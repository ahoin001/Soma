import { useMemo, useState } from "react";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppStore } from "@/state/AppStore";
import { ChevronDown } from "lucide-react";

type GoalType = "cut" | "recomp" | "bulk";

const activityOptions = [
  {
    value: "1.2",
    label: "Sedentary",
    description: "Mostly seated, minimal intentional exercise.",
  },
  {
    value: "1.375",
    label: "Light",
    description: "Remote worker + a few gym sessions per week.",
  },
  {
    value: "1.55",
    label: "Moderate",
    description: "Regular training and active daily routine.",
  },
  {
    value: "1.725",
    label: "Active",
    description: "Physically demanding job or daily training.",
  },
  {
    value: "1.9",
    label: "Athlete",
    description: "Intense training, high-volume activity most days.",
  },
];

const Goals = () => {
  const [goal, setGoal] = useState<GoalType>("recomp");
  const [sex, setSex] = useState("female");
  const [age, setAge] = useState("28");
  const [height, setHeight] = useState("165");
  const [weight, setWeight] = useState("155");
  const [activity, setActivity] = useState("1.55");
  const [bodyFat, setBodyFat] = useState("");
  const [steps, setSteps] = useState("");
  const [sleep, setSleep] = useState("");
  const [restingHr, setRestingHr] = useState("");
  const [optionalOpen, setOptionalOpen] = useState(false);
  const { nutrition } = useAppStore();

  const calories = useMemo(() => {
    const ageNum = Number(age);
    const heightNum = Number(height);
    const weightLb = Number(weight);
    const activityNum = Number(activity);
    const bodyFatNum = Number(bodyFat);
    const stepsNum = Number(steps);
    const sleepNum = Number(sleep);
    const restingHrNum = Number(restingHr);
    if (
      !Number.isFinite(ageNum) ||
      !Number.isFinite(heightNum) ||
      !Number.isFinite(weightLb) ||
      !Number.isFinite(activityNum)
    ) {
      return null;
    }
    const weightKg = weightLb * 0.453592;
    const useBodyFat =
      Number.isFinite(bodyFatNum) && bodyFatNum > 0 && bodyFatNum < 60;
    const bmr = useBodyFat
      ? 370 + 21.6 * (weightKg * (1 - bodyFatNum / 100))
      : sex === "male"
        ? 10 * weightKg + 6.25 * heightNum - 5 * ageNum + 5
        : 10 * weightKg + 6.25 * heightNum - 5 * ageNum - 161;
    let maintenance = Math.round(bmr * activityNum);

    // Optional refinements (only applied when provided)
    if (Number.isFinite(stepsNum) && stepsNum > 0) {
      const extraSteps = Math.max(stepsNum - 5000, 0);
      maintenance += Math.round((extraSteps / 1000) * 45);
    }
    if (Number.isFinite(sleepNum) && sleepNum > 0) {
      const sleepAdjustment = Math.max(Math.min(sleepNum - 7, 1.5), -1.5);
      maintenance += Math.round(sleepAdjustment * 40);
    }
    if (Number.isFinite(restingHrNum) && restingHrNum > 0) {
      const hrAdjustment = Math.max(Math.min(restingHrNum - 60, 15), -15);
      maintenance += Math.round((hrAdjustment / 10) * 35);
    }
    const range =
      goal === "cut"
        ? { min: maintenance - 500, max: maintenance - 250 }
        : goal === "bulk"
          ? { min: maintenance + 250, max: maintenance + 500 }
          : { min: maintenance - 100, max: maintenance + 100 };
    return {
      maintenance,
      range,
    };
  }, [age, height, weight, activity, sex, goal, bodyFat, steps, sleep, restingHr]);

  const selectedActivity = useMemo(
    () => activityOptions.find((option) => option.value === activity),
    [activity],
  );

  return (
    <AppShell experience="nutrition">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6">
        <div className="rounded-[28px] bg-gradient-to-br from-emerald-100 via-emerald-50 to-white px-5 py-6 shadow-[0_18px_40px_rgba(16,185,129,0.2)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">
            Goals
          </p>
          <h1 className="text-2xl font-display font-semibold text-emerald-950">
            Choose your path
          </h1>
          <p className="mt-1 text-sm text-emerald-700/70">
            Pick a focus and we will compute daily calories.
          </p>
        </div>

        <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Goal type
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {([
              { value: "cut", label: "Cut" },
              { value: "recomp", label: "Recomp" },
              { value: "bulk", label: "Bulk" },
            ] as { value: GoalType; label: string }[]).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setGoal(item.value)}
                className={`rounded-[18px] px-3 py-3 text-center text-sm font-semibold transition ${
                  goal === item.value
                    ? "bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.3)]"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Your stats
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-age">Age</Label>
              <Input
                id="goal-age"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder="Years"
                className="h-11 rounded-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-weight">Weight (lb)</Label>
              <Input
                id="goal-weight"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="lbs"
                className="h-11 rounded-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-height">Height (cm)</Label>
              <Input
                id="goal-height"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                placeholder="cm"
                className="h-11 rounded-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Activity</Label>
              <Select value={activity} onValueChange={setActivity}>
                <SelectTrigger className="h-11 rounded-full">
                  <SelectValue placeholder="Activity" />
                </SelectTrigger>
                <SelectContent>
                  {activityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedActivity && (
            <p className="mt-3 text-xs text-slate-500">
              {selectedActivity.description}
            </p>
          )}

          <div className="mt-4 rounded-[20px] border border-emerald-100 bg-emerald-50/60 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
              Sex
            </p>
            <RadioGroup
              value={sex}
              onValueChange={setSex}
              className="mt-3 flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female">Female</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male">Male</Label>
              </div>
            </RadioGroup>
          </div>
          <Collapsible
            open={optionalOpen}
            onOpenChange={setOptionalOpen}
            className="mt-4"
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              >
                Optional details
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    optionalOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 rounded-[20px] border border-emerald-100 bg-white/80 px-4 py-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-bodyfat">Body fat % (optional)</Label>
                  <Input
                    id="goal-bodyfat"
                    value={bodyFat}
                    onChange={(event) => setBodyFat(event.target.value)}
                    placeholder="e.g. 22"
                    className="h-11 rounded-full"
                  />
                  <p className="text-xs text-slate-500">
                    Adds precision using lean‑mass estimation.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-steps">Steps per day (optional)</Label>
                  <Input
                    id="goal-steps"
                    value={steps}
                    onChange={(event) => setSteps(event.target.value)}
                    placeholder="e.g. 6500"
                    className="h-11 rounded-full"
                  />
                  <p className="text-xs text-slate-500">
                    Captures daily movement outside workouts.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-sleep">Sleep hours (optional)</Label>
                  <Input
                    id="goal-sleep"
                    value={sleep}
                    onChange={(event) => setSleep(event.target.value)}
                    placeholder="e.g. 7.5"
                    className="h-11 rounded-full"
                  />
                  <p className="text-xs text-slate-500">
                    Useful for future recovery-based adjustments.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-resting-hr">
                    Resting heart rate (optional)
                  </Label>
                  <Input
                    id="goal-resting-hr"
                    value={restingHr}
                    onChange={(event) => setRestingHr(event.target.value)}
                    placeholder="e.g. 62"
                    className="h-11 rounded-full"
                  />
                  <p className="text-xs text-slate-500">
                    Helps estimate overall training load.
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Calories
          </p>
          {calories ? (
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-[18px] bg-emerald-50/80 px-4 py-4">
                <p className="text-xs text-emerald-500">Maintenance</p>
                <p className="text-lg font-semibold text-emerald-900">
                  {calories.maintenance} kcal
                </p>
              </div>
              <div className="rounded-[18px] bg-emerald-500/90 px-4 py-4 text-white">
                <p className="text-xs text-white/80">Target range</p>
                <p className="text-lg font-semibold">
                  {calories.range.min}–{calories.range.max} kcal
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Enter your stats to compute calories.
            </p>
          )}
          <Button
            type="button"
            className="mt-4 w-full rounded-full bg-aura-primary py-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
            onClick={() => {
              if (!calories) return;
              const target = Math.round(
                (calories.range.min + calories.range.max) / 2,
              );
              nutrition.setGoal?.(target);
              toast("Goal saved", {
                description: `Daily goal set to ${target} kcal.`,
              });
            }}
            disabled={!calories}
          >
            Use as daily goal
          </Button>
        </Card>
      </div>
    </AppShell>
  );
};

export default Goals;
