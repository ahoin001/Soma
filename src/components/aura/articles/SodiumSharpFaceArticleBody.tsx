/**
 * Article: Sodium, Face Puffiness & the "Sharp Face" Numbers
 * Evidence-based targets, potassium balance, and interactive calculators.
 */
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function SodiumTargetCalculator() {
  const [sodiumMg, setSodiumMg] = useState("");
  const num = sodiumMg.trim() === "" ? null : Number(sodiumMg.replace(/,/g, ""));
  const valid = num !== null && !Number.isNaN(num) && num >= 0 && num <= 8000;

  const band = useMemo(() => {
    if (!valid || num === null) return null;
    if (num < 1500) return { id: "sharp" as const, label: "Sharp-face zone", msg: "Ideal for minimizing puffiness. Many people see a noticeable difference in jawline definition within 5–7 days at this level.", tone: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200" };
    if (num <= 2000) return { id: "good" as const, label: "Good for a leaner look", msg: "FDA and many guidelines support under 2,300 mg; staying under 2,000 mg is where most people see less face bloat. You're in the sweet spot.", tone: "border-primary/40 bg-primary/10 text-primary" };
    if (num <= 2300) return { id: "maintenance" as const, label: "Maintenance limit", msg: "This is the FDA Daily Value limit (2,300 mg). OK for health, but cutting to 1,500–2,000 mg often sharpens the face within a week.", tone: "border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200" };
    if (num <= 3400) return { id: "risky" as const, label: "Likely to hold water", msg: "Close to or above average American intake (~3,400 mg). Your body will retain water to dilute the salt—often in the face and lower stomach. Aim for under 2,000 mg for 5+ days to see a difference.", tone: "border-orange-200 bg-orange-50/70 dark:bg-orange-950/20 text-orange-800 dark:text-orange-200" };
    return { id: "high" as const, label: "Too high for a sharp face", msg: "Very likely to cause puffiness. Focus on whole foods, read labels, and use spices (garlic, paprika) instead of salt. One high-sodium meal can add 3–5 lbs of water weight overnight.", tone: "border-destructive/40 bg-destructive/15 text-destructive" };
  }, [valid, num]);

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-secondary/55 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary/85">
        Daily sodium checker
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your estimated daily sodium (mg). We’ll show you how it lines up with the &quot;sharp face&quot; target.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="e.g. 2400"
          value={sodiumMg}
          onChange={(e) => setSodiumMg(e.target.value.replace(/[^0-9,]/g, ""))}
          className="h-10 w-28 rounded-full bg-card text-sm"
        />
        <span className="text-sm text-muted-foreground">mg sodium / day</span>
      </div>
      {valid && band && (
        <div className={cn("mt-3 rounded-lg border px-3 py-2 text-sm", band.tone)}>
          <strong>{band.label}</strong>
          <p className="mt-1 opacity-90">{band.msg}</p>
        </div>
      )}
    </div>
  );
}

function PotassiumSodiumRatioCalculator() {
  const [sodiumMg, setSodiumMg] = useState("1500");
  const [potassiumMg, setPotassiumMg] = useState("3000");
  const s = sodiumMg.trim() === "" ? null : Number(sodiumMg.replace(/,/g, ""));
  const p = potassiumMg.trim() === "" ? null : Number(potassiumMg.replace(/,/g, ""));
  const validS = s !== null && !Number.isNaN(s) && s > 0 && s <= 6000;
  const validP = p !== null && !Number.isNaN(p) && p >= 0 && p <= 6000;
  const ratio = validS && validP && s > 0 ? (p ?? 0) / s : null;
  const verdict = useMemo(() => {
    if (ratio === null) return null;
    if (ratio >= 2) return { label: "Ideal balance", msg: "Roughly 2:1 potassium to sodium. Potassium helps move water out of cells, so this supports a leaner look.", tone: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200" };
    if (ratio >= 1) return { label: "Moderate", msg: "Getting more potassium will help. Aim for at least 2:1 (e.g. 1,500 mg sodium → 3,000 mg potassium).", tone: "border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200" };
    return { label: "Sodium-heavy", msg: "Most processed foods are high sodium, low potassium. Add bananas, potatoes (with skin), spinach, avocado, coconut water.", tone: "border-destructive/30 bg-destructive/10 text-destructive" };
  }, [ratio]);

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-secondary/55 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary/85">
        Potassium : sodium ratio
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Goal: at least <strong>2:1</strong> potassium to sodium (e.g. 1,500 mg sodium → 3,000 mg potassium).
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Sodium (mg/day)</Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="1500"
            value={sodiumMg}
            onChange={(e) => setSodiumMg(e.target.value.replace(/[^0-9,]/g, ""))}
            className="mt-1 h-10 rounded-full bg-card text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Potassium (mg/day)</Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="3000"
            value={potassiumMg}
            onChange={(e) => setPotassiumMg(e.target.value.replace(/[^0-9,]/g, ""))}
            className="mt-1 h-10 rounded-full bg-card text-sm"
          />
        </div>
      </div>
      {ratio !== null && (
        <p className="mt-2 text-sm text-muted-foreground">
          Your ratio: <strong>{ratio.toFixed(1)}:1</strong> potassium to sodium
        </p>
      )}
      {verdict && validS && validP && (
        <div className={cn("mt-2 rounded-lg border px-3 py-2 text-sm", verdict.tone)}>
          <strong>{verdict.label}</strong>
          <p className="mt-1 opacity-90">{verdict.msg}</p>
        </div>
      )}
    </div>
  );
}

function WaterGoalCalculator() {
  const [weightLbs, setWeightLbs] = useState("197");
  const w = weightLbs.trim() === "" ? null : Number(weightLbs.replace(/,/g, ""));
  const valid = w !== null && !Number.isNaN(w) && w >= 80 && w <= 400;
  const litersLow = valid ? Math.round((w! * 0.453592 * 35) / 100) / 10 : null;
  const litersHigh = valid ? Math.round((w! * 0.453592 * 45) / 100) / 10 : null;
  const gallons = valid ? (litersLow! + litersHigh!) / 2 / 3.785 : null;

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-secondary/55 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary/85">
        Water target (flushes sodium)
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Rough target: 35–45 ml per kg body weight per day. More consistent intake = less &quot;hoarding&quot; of water.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="197"
          value={weightLbs}
          onChange={(e) => setWeightLbs(e.target.value.replace(/[^0-9.]/g, ""))}
          className="h-10 w-24 rounded-full bg-card text-sm"
        />
        <span className="text-sm text-muted-foreground">lbs body weight</span>
      </div>
      {valid && litersLow !== null && litersHigh !== null && (
        <p className="mt-2 text-sm text-foreground/90">
          Aim for <strong>{litersLow}–{litersHigh} L</strong> per day
          {gallons !== null && gallons >= 0.8 && (
            <> (about <strong>{gallons.toFixed(1)} gal</strong>)</>
          )}
          . Drinking enough tells your body it doesn’t need to hold onto extra water.
        </p>
      )}
    </div>
  );
}

export function SodiumSharpFaceArticleBody() {
  return (
    <article className="max-w-none">
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        If you’re mostly sedentary and lift a few times a week, <strong>sodium is often the main reason your face looks puffy or &quot;chubby&quot;</strong>—even when your body fat is fine. This article breaks down the numbers (with real guidelines and examples) and gives you calculators to hit a &quot;sharp face&quot; target.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">1. Why your sodium needs aren’t the same as an athlete’s</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>Athletes</strong> who sweat a lot (e.g. running 5+ miles, long sessions in the heat) can need <strong>3,000 mg or more</strong> of sodium just to replace losses. Their bodies use and excrete it.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>You (sedentary + 3 lifts/week):</strong> You don’t sweat enough to flush excess sodium. If you eat the typical American amount—<strong>around 3,400 mg/day</strong> (CDC data)—your body holds onto water to dilute that salt. For many people, that water shows up in two places: <strong>the lower stomach and the face</strong> (cheeks, under the chin).
      </p>
      <p className="mt-2 rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Takeaway:</strong> Same sodium intake that an athlete “burns through” can leave you retaining water and looking puffy. Your target should be lower than the average American.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">2. The &quot;sharp face&quot; sodium numbers</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        Official guidelines and what to aim for if you want less puffiness:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li><strong>Average U.S. intake:</strong> ~3,400 mg/day (mostly from packaged and restaurant food).</li>
        <li><strong>FDA Daily Value (maintenance):</strong> &lt; 2,300 mg/day.</li>
        <li><strong>WHO / many health bodies:</strong> Lower is better; often &lt; 2,000 mg for general health.</li>
        <li><strong>Your &quot;sharp face&quot; target:</strong> <strong>1,500–2,000 mg/day</strong>.</li>
      </ul>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        If you stay under about <strong>2,000 mg for 5–7 days in a row</strong> and drink enough water, many people see a noticeable difference in jawline definition and less puffiness. Sodium has no effect on actual facial fat—only on water retention.
      </p>
      <SodiumTargetCalculator />

      <h2 className="mt-6 text-lg font-semibold text-foreground">3. The potassium see-saw</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        Cutting salt alone isn’t enough. <strong>Sodium pulls water into cells</strong> (puffiness); <strong>potassium helps move water out</strong>. Most processed foods are high in sodium and low in potassium.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        A useful target is a <strong>2:1 ratio of potassium to sodium</strong> (e.g. 1,500 mg sodium → 3,000 mg potassium). That’s a practical goal that supports less water retention and a leaner look.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li><strong>Unfavorable:</strong> 1,000 mg sodium / 500 mg potassium → sodium-heavy, more bloat.</li>
        <li><strong>Favorable:</strong> 1,500 mg sodium / 3,000 mg potassium → better balance, sharper look.</li>
      </ul>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">High-potassium, lower-sodium foods (approximate per serving):</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-foreground/85">
        <li>Banana (1 medium): ~420 mg potassium</li>
        <li>Baked potato with skin (1 medium): ~900 mg potassium</li>
        <li>Spinach, cooked (½ cup): ~420 mg potassium</li>
        <li>Avocado (½): ~485 mg potassium</li>
        <li>Coconut water (1 cup): ~600 mg potassium, low sodium</li>
        <li>Sweet potato with skin: ~540 mg potassium</li>
      </ul>
      <PotassiumSodiumRatioCalculator />

      <h2 className="mt-6 text-lg font-semibold text-foreground">4. The water paradox</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        It sounds backwards, but <strong>drinking more water helps you flush water</strong>. When you’re dehydrated, your body holds onto fluid “just in case.” When you drink consistently (e.g. 3–4 L, or about 1 gallon, per day for many adults), your body is more willing to let go of stored water and sodium.
      </p>
      <WaterGoalCalculator />

      <h2 className="mt-6 text-lg font-semibold text-foreground">5. Quick reference: sharp-face plan</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70">
              <th className="py-2 text-left font-semibold text-foreground">Variable</th>
              <th className="py-2 text-left font-semibold text-foreground">Target</th>
              <th className="py-2 text-left font-semibold text-muted-foreground">Why</th>
            </tr>
          </thead>
          <tbody className="text-foreground/85">
            <tr className="border-b border-border/50">
              <td className="py-2">Sodium</td>
              <td className="py-2 font-medium">&lt; 2,000 mg</td>
              <td className="py-2 text-muted-foreground">Less water retention in face and gut.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2">Potassium</td>
              <td className="py-2 font-medium">≥ 3,000–3,500 mg</td>
              <td className="py-2 text-muted-foreground">Balances sodium; supports fluid balance.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2">Water</td>
              <td className="py-2 font-medium">~1 gal (3.8 L) or 35–45 ml/kg</td>
              <td className="py-2 text-muted-foreground">Flushes excess sodium; reduces “hoarding.”</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2">Carbs</td>
              <td className="py-2 font-medium">Moderate</td>
              <td className="py-2 text-muted-foreground">High carbs hold water (glycogen). Stay within your usual target.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-6 text-lg font-semibold text-foreground">6. The weekend-bloat warning</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        One high-sodium meal can undo a week of discipline. <strong>Asian takeout</strong> (soy sauce, teriyaki, ramen) and <strong>Latin fast food</strong> (sauces, seasoned meats) are often very high in sodium. A single heavy meal can add <strong>3–5 lbs of water weight overnight</strong> and blur your jawline for a day or two.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">Rough sodium in common items (read labels for your brand):</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-foreground/85">
        <li>Soy sauce (1 tbsp): ~1,000 mg</li>
        <li>Many bread slices: 150–250 mg each</li>
        <li>Cottage cheese (½ cup): 350–500 mg</li>
        <li>Deli turkey (2 oz): 400–700 mg</li>
        <li>“Healthy” packaged snacks: often 200–400 mg per serving</li>
      </ul>
      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
        <strong>Action step:</strong> Check the nutrition label on your go-to “healthy” foods. Bread, cottage cheese, and deli meats are common hidden sodium bombs. Prefer fresh meats and use spices (garlic powder, paprika, herbs) instead of the salt shaker.
      </p>

      <p className="mt-6 border-l-4 border-primary/35 py-1 pl-4 text-muted-foreground">
        Stay under 2,000 mg sodium, push potassium toward 2:1 with sodium, and drink enough water. Give it 5–7 consistent days—you’ll likely see a sharper jawline and less puffiness.
      </p>
    </article>
  );
}
