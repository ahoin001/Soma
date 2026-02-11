/**
 * Article: Body Recomposition — one-stop guide for skinny-fat and normal-weight folks.
 * Covers pros/cons, best practices, and an interactive calculator for personalized targets.
 */
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateTargets } from "@/lib/nutritionTargets";
import type { ActivityLevel, Sex } from "@/lib/nutritionTargets";

const LBS_PER_KG = 0.453592;
const CM_PER_IN = 2.54;

function RecompCalculator() {
  const [ageStr, setAgeStr] = useState("30");
  const [feetStr, setFeetStr] = useState("5");
  const [inchesStr, setInchesStr] = useState("8");
  const [weightLbsStr, setWeightLbsStr] = useState("197");
  const [sex, setSex] = useState<Sex>("male");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [experience, setExperience] = useState<"never" | "some" | "former">("some");

  const result = useMemo(() => {
    const age = Number(ageStr);
    const feet = Number(feetStr);
    const inches = Number(inchesStr);
    const weightLbs = Number(weightLbsStr);
    if (
      !Number.isFinite(age) ||
      !Number.isFinite(feet) ||
      !Number.isFinite(inches) ||
      !Number.isFinite(weightLbs) ||
      age < 15 ||
      age > 100 ||
      weightLbs < 80 ||
      weightLbs > 500
    ) {
      return null;
    }
    const heightCm = (feet * 12 + inches) * CM_PER_IN;
    const weightKg = weightLbs * LBS_PER_KG;
    const targets = calculateTargets({
      weightKg,
      heightCm,
      age,
      sex,
      goalType: "balance",
      formula: "mifflin",
      activity,
    });
    if (!targets) return null;
    const bmi = weightKg / (heightCm / 100) ** 2;
    const proteinG = Math.round(weightLbs * 0.85); // ~0.85 g per lb for recomp
    return {
      maintenanceKcal: targets.calories,
      proteinG,
      bmi: Math.round(bmi * 10) / 10,
      weightKg,
      heightCm,
    };
  }, [ageStr, feetStr, inchesStr, weightLbsStr, sex, activity]);

  const recommendation = useMemo(() => {
    if (!result) return null;
    const { bmi, maintenanceKcal, proteinG } = result;
    const lines: string[] = [];
    if (bmi >= 27) {
      lines.push("Your BMI suggests you’re in the overweight range. Recomp is still possible: eat at or slightly below maintenance, prioritize protein and lifting. You can also do a modest cut (200–400 kcal below maintenance) while lifting to lose fat a bit faster; keep protein high to preserve muscle.");
    } else if (bmi >= 25) {
      lines.push("You’re in the upper-normal to overweight range—a great candidate for recomp. Eat at maintenance (or a tiny deficit if you want to lean out a bit faster). Focus on resistance training 3–4× per week and hitting your protein target. Scale weight may stay similar while you look noticeably better over 4–8 months.");
    } else if (bmi >= 22) {
      lines.push("Ideal recomp zone. Eat at maintenance, train consistently, and hit your protein target. Your weight may barely move while your body composition improves. Give it 4–8 months before judging; take progress photos.");
    } else {
      lines.push("You’re on the leaner side of normal. Recomp works, but a small surplus (+100–200 kcal) can speed muscle gain if you’re under-muscled. Either way: prioritize lifting and protein. Avoid cutting—you’ll just get smaller.");
    }
    if (experience === "never") {
      lines.push("As a beginner, you have the best chance to gain muscle and lose (or maintain) fat at the same time. Consistency beats perfection.");
    } else if (experience === "former") {
      lines.push("Former lifter? Muscle memory will help you regain size faster. Recomp or a small surplus plus lifting is ideal.");
    }
    return { lines, maintenanceKcal: result.maintenanceKcal, proteinG: result.proteinG };
  }, [result, experience]);

  return (
    <div className="mt-6 rounded-xl border border-border/70 bg-secondary/55 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary/85">
        Your recomp numbers
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your stats to get estimated maintenance calories, protein target, and personalized guidance.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Age</Label>
          <Input
            type="number"
            min={15}
            max={100}
            inputMode="numeric"
            value={ageStr}
            onChange={(e) => setAgeStr(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            className="mt-1 h-10 rounded-full bg-card"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Sex (for calorie estimate)</Label>
          <Select value={sex} onValueChange={(v) => setSex(v as Sex)}>
            <SelectTrigger className="mt-1 h-10 rounded-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Height</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              min={4}
              max={7}
              inputMode="numeric"
              placeholder="5"
              value={feetStr}
              onChange={(e) => setFeetStr(e.target.value.replace(/[^0-9]/g, "").slice(0, 1))}
              className="h-10 w-14 rounded-full bg-card text-center"
            />
            <span className="text-muted-foreground">ft</span>
            <Input
              type="number"
              min={0}
              max={11}
              inputMode="numeric"
              placeholder="8"
              value={inchesStr}
              onChange={(e) => setInchesStr(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              className="h-10 w-14 rounded-full bg-card text-center"
            />
            <span className="text-muted-foreground">in</span>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Weight (lbs)</Label>
          <Input
            type="number"
            min={80}
            max={500}
            inputMode="numeric"
            value={weightLbsStr}
            onChange={(e) => setWeightLbsStr(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            className="mt-1 h-10 rounded-full bg-card"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Activity level</Label>
          <Select value={activity} onValueChange={(v) => setActivity(v as ActivityLevel)}>
            <SelectTrigger className="mt-1 h-10 rounded-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedentary">Sedentary</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="athlete">Athlete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Lifting experience</Label>
          <Select
            value={experience}
            onValueChange={(v) => setExperience(v as "never" | "some" | "former")}
          >
            <SelectTrigger className="mt-1 h-10 rounded-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never really lifted</SelectItem>
              <SelectItem value="some">Some training</SelectItem>
              <SelectItem value="former">Former lifter (coming back)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {recommendation && (
        <div className="mt-4 rounded-lg border border-border/70 bg-card px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Your targets</p>
          <ul className="mt-2 space-y-1 text-sm text-foreground/85">
            <li>
              <strong>Maintenance:</strong> ~{recommendation.maintenanceKcal} kcal/day (use this for recomp)
            </li>
            <li>
              <strong>Protein:</strong> ~{recommendation.proteinG} g/day (aim for 0.8–1 g per lb body weight)
            </li>
          </ul>
          <p className="mt-3 text-sm font-semibold text-foreground">How you should approach it</p>
          <div className="mt-1 space-y-2 text-sm text-foreground/85">
            {recommendation.lines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RecompArticleBody() {
  return (
    <article className="max-w-none">
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        <strong>Body recomposition</strong> means building muscle and losing (or maintaining) body fat at the same time—so the scale might barely move while you look and feel better. If you’re “skinny fat” (normal weight but soft, with more fat and less muscle than you’d like), recomp is often the best first move. This guide covers the pros and cons, how to do it right, and a calculator so you can see your numbers and get personalized advice.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">What is recomp, and who is it for?</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        Recomp happens when you eat around <strong>maintenance calories</strong> (no big deficit or surplus), get enough <strong>protein</strong>, and do <strong>resistance training</strong> consistently. Your body can build muscle from the energy and protein you eat while using stored fat for part of its needs—so fat goes down and muscle goes up, and your weight can stay roughly the same.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        It works best for <strong>beginners</strong> (who can gain muscle quickly), <strong>former lifters</strong> (muscle memory), and people who are already in the normal-weight or slightly overweight range but have low muscle mass. If you’re 30, 5′8″, 197 lbs, and not very muscular—classic “skinny fat”—you’re in a good spot to recomp: focus on lifting 3–4× per week and hitting your protein target at maintenance calories.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">Pros and cons of recomp</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pros</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground/85">
            <li>No aggressive dieting—easier to stick to and better for mood and energy</li>
            <li>You don’t have to “bulk then cut”; you improve composition without big weight swings</li>
            <li>Scale weight staying stable can be reassuring (you’re not “failing” if the number doesn’t drop)</li>
            <li>Best option for beginners and skinny-fat: build muscle and lean out at once</li>
            <li>Lower risk of losing muscle than with a big cut</li>
          </ul>
        </div>
        <div className="rounded-lg border border-accent/50 bg-accent/35 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">Cons</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground/85">
            <li>Slower visible change than a dedicated cut or bulk—patience required (4–8+ months)</li>
            <li>Scale doesn’t tell the story; you need progress photos and how you look/feel</li>
            <li>Works less well for very lean people (they may need a small surplus to build) or very overweight (a modest cut can speed fat loss)</li>
            <li>Requires consistent training and protein—half-effort won’t give great results</li>
          </ul>
        </div>
      </div>

      <h2 className="mt-6 text-lg font-semibold text-foreground">Best-practice way to do recomp</h2>

      <h3 className="mt-4 text-base font-semibold text-foreground">1. Calories</h3>
      <p className="mt-1 text-sm leading-relaxed text-foreground/85">
        Eat at <strong>maintenance</strong>—or a very small deficit (e.g. 100–200 kcal) if you’d like to lose fat a bit faster while still building muscle as a beginner. Use the calculator below to estimate your maintenance; then track for 2–3 weeks and adjust if you’re gaining or losing more than ~0.5 lb per week when you want to stay stable.
      </p>

      <h3 className="mt-4 text-base font-semibold text-foreground">2. Protein</h3>
      <p className="mt-1 text-sm leading-relaxed text-foreground/85">
        Aim for <strong>0.8–1 g per lb body weight</strong> (about 1.6–2.2 g per kg). For 197 lbs, that’s roughly 160–197 g protein per day. Spread across 3–4+ meals. This supports muscle protein synthesis and helps preserve muscle when calories are at or slightly below maintenance.
      </p>

      <h3 className="mt-4 text-base font-semibold text-foreground">3. Training</h3>
      <p className="mt-1 text-sm leading-relaxed text-foreground/85">
        <strong>Resistance training 3–4× per week</strong> is the non-negotiable. Focus on compound lifts (squats, deadlifts, rows, bench or overhead press, pull-ups or lat pulldowns) with progressive overload—add weight or reps over time. Hit each major muscle group at least 2× per week. Cardio is fine for health and a small calorie burn, but don’t let it replace or overwhelm lifting.
      </p>

      <h3 className="mt-4 text-base font-semibold text-foreground">4. Sleep and recovery</h3>
      <p className="mt-1 text-sm leading-relaxed text-foreground/85">
        Muscle grows when you recover. Aim for <strong>7–9 hours of sleep</strong> and at least one rest day between heavy sessions for the same muscles. Stress and poor sleep hurt both fat loss and muscle gain.
      </p>

      <h3 className="mt-4 text-base font-semibold text-foreground">5. Timeline and expectations</h3>
      <p className="mt-1 text-sm leading-relaxed text-foreground/85">
        Give it <strong>4–8 months</strong> before judging. Take progress photos every 2–4 weeks in similar lighting. The scale may barely move; what matters is how you look, how clothes fit, and strength in the gym. Recomp is a marathon, not a sprint.
      </p>

      <RecompCalculator />

      <h2 className="mt-8 text-lg font-semibold text-foreground">When to choose recomp vs. cut vs. bulk</h2>
      <ul className="my-3 list-disc space-y-2 pl-5 text-sm text-foreground/85">
        <li><strong>Recomp:</strong> Normal weight or slightly overweight, low muscle, beginner or returning—eat at maintenance, high protein, lift. Ideal for skinny fat.</li>
        <li><strong>Cut first:</strong> Higher body fat (e.g. BMI 28+), want to lean out faster—modest deficit (200–400 kcal) with high protein and lifting to preserve muscle. You can switch to recomp or maintenance once you’re in a comfortable range.</li>
        <li><strong>Slow bulk:</strong> Already lean (BMI &lt;22) and under-muscled—small surplus (+100–300 kcal) to gain muscle with minimal fat. Recomp still works; bulk can be faster if you’re very light.</li>
      </ul>

      <div className="mt-4 rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Quick takeaway:</strong> If you’re 30, 5′8″, 197 lbs, and not very muscular, start with recomp: maintenance calories, ~160–200 g protein, and 3–4× resistance training. Reassess in 4–6 months with photos and strength; then you can keep recomping, do a short cut, or add a small surplus if you’re leaner and want more size.
      </div>

      <h2 className="mt-6 text-lg font-semibold text-foreground">What to avoid</h2>
      <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li>Crash dieting—you’ll lose muscle and feel terrible</li>
        <li>Only doing cardio—you’ll get smaller and softer without building shape</li>
        <li>Expecting to look shredded in 8 weeks—body composition changes in months</li>
        <li>Changing plans every few weeks—pick recomp (or cut/bulk), stick to it for months, then adjust</li>
      </ul>

      <p className="mt-6 border-l-4 border-primary/35 py-1 pl-4 text-muted-foreground">
        Recomp is the one-stop strategy for many skinny-fat and normal-weight people: eat at maintenance, prioritize protein and lifting, and give it time. Use the calculator above to lock in your numbers, then focus on consistency. You’ve got this.
      </p>
    </article>
  );
}
