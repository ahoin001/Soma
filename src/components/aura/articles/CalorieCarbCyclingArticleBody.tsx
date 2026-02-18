/**
 * Article: Calorie & Carb Cycling for skinny fat — science, strategy, and personalized targets.
 * Fact-checked (GLUT4, insulin sensitivity, MPS 24–48h) with interactive calculator.
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

function CyclingCalculator() {
  const [ageStr, setAgeStr] = useState("30");
  const [feetStr, setFeetStr] = useState("5");
  const [inchesStr, setInchesStr] = useState("8");
  const [weightLbsStr, setWeightLbsStr] = useState("165");
  const [sex, setSex] = useState<Sex>("male");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState("3");

  const result = useMemo(() => {
    const age = Number(ageStr);
    const feet = Number(feetStr);
    const inches = Number(inchesStr);
    const weightLbs = Number(weightLbsStr);
    const trainingDays = Number(trainingDaysPerWeek) || 3;
    if (
      !Number.isFinite(age) ||
      !Number.isFinite(feet) ||
      !Number.isFinite(inches) ||
      !Number.isFinite(weightLbs) ||
      age < 15 ||
      age > 100 ||
      weightLbs < 80 ||
      weightLbs > 400 ||
      trainingDays < 1 ||
      trainingDays > 6
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

    const maintenance = Math.round(targets.calories);
    const trainingKcal = maintenance + 100;
    const restKcal = Math.max(1400, maintenance - 450);

    const proteinPerKg = 1.9;
    const proteinG = Math.round(weightKg * proteinPerKg);

    const trainingFatG = 55;
    const trainingCarbsG = Math.round((trainingKcal - proteinG * 4 - trainingFatG * 9) / 4);
    const restCarbsG = 80;
    const restFatG = Math.round((restKcal - proteinG * 4 - restCarbsG * 4) / 9);

    const restDays = 7 - trainingDays;
    const weeklyKcal = trainingKcal * trainingDays + restKcal * restDays;
    const dailyAvg = Math.round(weeklyKcal / 7);
    const weeklyDeficit = (maintenance * 7 - weeklyKcal) / 7;

    return {
      maintenance,
      trainingKcal,
      restKcal,
      trainingCarbsG: Math.max(150, trainingCarbsG),
      trainingFatG,
      restCarbsG,
      restFatG: Math.max(50, Math.min(95, restFatG)),
      proteinG,
      dailyAvg,
      weeklyDeficit: Math.round(weeklyDeficit),
      trainingDays,
      restDays,
    };
  }, [ageStr, feetStr, inchesStr, weightLbsStr, sex, activity, trainingDaysPerWeek]);

  return (
    <div className="mt-6 rounded-xl border border-border/70 bg-secondary/55 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary/85">
        Your calorie & carb cycling numbers
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your stats and training frequency to get training-day vs rest-day targets.
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
          <Label className="text-xs text-muted-foreground">Sex</Label>
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
            max={400}
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
          <Label className="text-xs text-muted-foreground">Lift days per week</Label>
          <Select value={trainingDaysPerWeek} onValueChange={setTrainingDaysPerWeek}>
            <SelectTrigger className="mt-1 h-10 rounded-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {result && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-border/70 bg-card px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Training days ({result.trainingDays}/week)</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/85">
              <li><strong>Calories:</strong> ~{result.trainingKcal} (slight surplus vs maintenance {result.maintenance})</li>
              <li><strong>Carbs:</strong> ~{result.trainingCarbsG} g (high — refill glycogen)</li>
              <li><strong>Fat:</strong> ~{result.trainingFatG} g (keep low)</li>
              <li><strong>Protein:</strong> ~{result.proteinG} g</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Rest days ({result.restDays}/week)</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/85">
              <li><strong>Calories:</strong> ~{result.restKcal} (deficit)</li>
              <li><strong>Carbs:</strong> ~{result.restCarbsG} g (low — favor fat burn)</li>
              <li><strong>Fat:</strong> ~{result.restFatG} g (higher)</li>
              <li><strong>Protein:</strong> ~{result.proteinG} g (same — muscles still rebuilding)</li>
            </ul>
          </div>
          <div className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-2 text-sm text-foreground/90">
            <strong>Weekly average:</strong> ~{result.dailyAvg} kcal/day
            {result.weeklyDeficit > 0 && (
              <> — about {result.weeklyDeficit} kcal under maintenance per day for a steady, sustainable deficit.</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CalorieCarbCyclingArticleBody() {
  return (
    <article className="max-w-none">
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        <strong>Calorie & carb cycling</strong> means eating more—especially carbs—on days you lift and less on rest days. For a “skinny fat” physique (normal weight but soft, with a bloated gut and little muscle definition), this is one of the most effective tools you have. It aligns your intake with your body’s hormones so you can work toward two goals at once: <strong>burning fat</strong> (deficit on rest days) and <strong>building muscle</strong> (surplus or maintenance on training days). This guide explains the science, the strategy, and a personalized calculator so your numbers fit you.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">The core science: insulin sensitivity and the “muscle doorway” (GLUT4)</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        To see why eating differently on different days works, you need a quick picture of <strong>insulin sensitivity</strong> and how muscles take in fuel.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>When you’re sedentary</strong>, muscle cells are relatively “closed” to glucose. You eat carbs → insulin rises → but without recent exercise, a lot of that energy is more likely to be stored (including as fat) rather than pulled into muscle. So on rest days, piling on carbs often means more storage and less “refill” of muscle glycogen.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>When you lift heavy</strong>, a glucose transporter called <strong>GLUT4</strong> moves to the surface of your muscle cells—effectively “unlocking” the door. For a window of roughly <strong>several hours after training</strong> (research points to a rapid phase in the first 30–60 minutes and elevated uptake for several hours), your muscles soak up carbohydrates to refill glycogen instead of shunting as much to fat. So on training days, higher carbs are more likely to go to muscle refill and recovery; on rest days, lower carbs help keep insulin lower and encourage your body to use stored fat for fuel.
      </p>

      <div className="mt-4 rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Science note:</strong> GLUT4 translocation and post-exercise glycogen synthesis are well documented. The “anabolic window” is often described as the first few hours post-workout when carb intake can maximize glycogen repletion. Muscle protein synthesis (MPS) stays elevated for about <strong>24–48 hours</strong> after resistance training, which is why keeping protein high on rest days still supports growth—your muscles are still rebuilding.
      </div>

      <h2 className="mt-6 text-lg font-semibold text-foreground">Day type A: Training day (growth)</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>Goal:</strong> Use the “open door.” Refill muscle glycogen so you look full and hard, not flat, and support recovery.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li><strong>Calories:</strong> Maintenance or a slight surplus (e.g. +100–200 kcal).</li>
        <li><strong>Carbs:</strong> High (often 200–280+ g depending on size)—rice, potatoes, oats, fruit.</li>
        <li><strong>Fat:</strong> Keep moderate to low (e.g. under ~60 g). High insulin + high fat can favor storage; we want high insulin + high carbs → muscle refill.</li>
        <li><strong>Protein:</strong> Same as every day (see calculator).</li>
      </ul>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>Timing:</strong> Eat most of your carbs around the workout—before and especially after—so they’re available when the “door” is open.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">Day type B: Rest day (burn)</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>Goal:</strong> Favor fat oxidation. You’re not lifting, so you don’t need a lot of quick energy. Keep carbs and insulin lower so your body is more likely to burn stored fat.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li><strong>Calories:</strong> Deficit (e.g. 400–500 kcal below maintenance).</li>
        <li><strong>Carbs:</strong> Low (e.g. under 100 g).</li>
        <li><strong>Fat:</strong> Higher (e.g. 70–85 g). You’re not spiking insulin with carbs, so dietary fat is less likely to be stored and can help satiety.</li>
        <li><strong>Protein:</strong> Still high (same as training days). MPS stays elevated 24–48 hours after a workout—your muscles are still “under construction” and need protein even on rest days.</li>
      </ul>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>Food focus:</strong> Fatty meats (steak, eggs), avocado, nuts, vegetables. Skip the big rice/pasta/bread loads today.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">Why this fixes “skinny fat”</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>Weekly average:</strong> With 3 training days and 4 rest days, a typical split (e.g. ~2,300 on training days and ~1,900 on rest days) gives a weekly average around 2,070 kcal—a moderate deficit that supports fat loss without starving your body or crashing hormones.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>Visuals:</strong> On rest days, lower carbs often mean less water retention—your face can look sharper. On training days, refilling glycogen makes muscles look fuller. Over time, you lose fat (deficit) and build or preserve muscle (training + protein + strategic carbs).
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>Hormones:</strong> You’re not in a long, harsh deficit (which can hurt testosterone and adherence), and you’re not in a long surplus (which adds fat). You cycle—so you get the benefits of both phases.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">The “sandwich” rule on training days</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        Cluster your carbs around the workout so they go to the working muscle:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li><strong>Meal 1:</strong> Protein + fats (e.g. eggs).</li>
        <li><strong>Meal 2 (pre-workout):</strong> Protein + carbs (e.g. chicken + rice).</li>
        <li><strong>Workout</strong></li>
        <li><strong>Meal 3 (post-workout):</strong> Protein + carbs (e.g. shake, banana, rice).</li>
        <li><strong>Meal 4:</strong> Protein + fats.</li>
      </ul>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        That way the majority of your carbs land when the “door” is open—before and after the session.
      </p>

      <CyclingCalculator />

      <h2 className="mt-8 text-lg font-semibold text-foreground">Example weekly schedule (3 lift days)</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70">
              <th className="py-2 text-left font-semibold text-foreground">Day</th>
              <th className="py-2 text-left font-semibold text-foreground">Activity</th>
              <th className="py-2 text-left font-semibold text-foreground">Calorie focus</th>
              <th className="py-2 text-left font-semibold text-foreground">Carb strategy</th>
            </tr>
          </thead>
          <tbody className="text-foreground/85">
            <tr className="border-b border-border/50"><td className="py-2">Monday</td><td>Lift (e.g. Push)</td><td>Higher</td><td>High carb — refill glycogen</td></tr>
            <tr className="border-b border-border/50"><td className="py-2">Tuesday</td><td>Rest</td><td>Lower</td><td>Low carb — gut shrinking</td></tr>
            <tr className="border-b border-border/50"><td className="py-2">Wednesday</td><td>Lift (e.g. Pull)</td><td>Higher</td><td>High carb</td></tr>
            <tr className="border-b border-border/50"><td className="py-2">Thursday</td><td>Rest</td><td>Lower</td><td>Low carb</td></tr>
            <tr className="border-b border-border/50"><td className="py-2">Friday</td><td>Lift (e.g. Legs)</td><td>Higher</td><td>High carb</td></tr>
            <tr className="border-b border-border/50"><td className="py-2">Saturday</td><td>Rest</td><td>Lower</td><td>Low carb</td></tr>
            <tr className="border-b border-border/50"><td className="py-2">Sunday</td><td>Rest</td><td>Lower</td><td>Low carb</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-6 text-lg font-semibold text-foreground">What to avoid</h2>
      <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li>Eating the same high carbs every day when you’re mostly sedentary—more of it will go to storage.</li>
        <li>Slashing calories too low on rest days (e.g. under 1,400)—you’ll feel awful and risk muscle loss.</li>
        <li>Going high fat and high carb on the same day—pick one “driver” (carbs on training, fat on rest).</li>
        <li>Skipping protein on rest days—your muscles are still rebuilding for 24–48 hours.</li>
      </ul>

      <p className="mt-6 border-l-4 border-primary/35 py-1 pl-4 text-muted-foreground">
        Calorie & carb cycling gives you a clear structure: eat more and carb-up when the “door” is open (training days), and eat less with fewer carbs when it’s closed (rest days). Use the calculator above to get your own training-day and rest-day numbers, then stick to the sandwich rule on lift days. Consistency beats perfection.
      </p>
    </article>
  );
}
