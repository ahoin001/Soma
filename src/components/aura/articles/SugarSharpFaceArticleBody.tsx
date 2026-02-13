/**
 * Article: Added Sugar, Sharp Face & Flat Gut
 * Fact-checked targets (AHA), insulin/glycogen science, and practical traps.
 */
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function AddedSugarCalculator() {
  const [sugarG, setSugarG] = useState("");
  const num = sugarG.trim() === "" ? null : Number(sugarG.replace(/,/g, ""));
  const valid = num !== null && !Number.isNaN(num) && num >= 0 && num <= 200;

  const band = useMemo(() => {
    if (!valid || num === null) return null;
    if (num <= 25) return { id: "tight" as const, label: "Sharp-face zone", msg: "Ideal for recomp and minimizing bloat. You're under the tighter 25g target that supports less insulin spike and less glycogen-bound water.", tone: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200" };
    if (num <= 36) return { id: "aha" as const, label: "Within AHA limit", msg: "American Heart Association recommends men stay under 36g added sugar. For a sharper look and flatter gut, try cutting toward 25g.", tone: "border-primary/40 bg-primary/10 text-primary" };
    if (num <= 50) return { id: "high" as const, label: "Above target", msg: "Likely to drive insulin up and add water retention (glycogen holds 3–4g water per 1g glycogen). Aim for under 25g for 5–7 days to see a difference.", tone: "border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200" };
    return { id: "very-high" as const, label: "Too high for a sharp look", msg: "This level promotes fat storage, insulin spikes, and noticeable water retention. Focus on cutting liquid sugar and hidden sugar in sauces and bars first.", tone: "border-destructive/40 bg-destructive/15 text-destructive" };
  }, [valid, num]);

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-secondary/55 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary/85">
        Daily added sugar checker
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your estimated added sugar (g) per day. We’ll show how it lines up with AHA and a tighter &quot;sharp face&quot; target.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="e.g. 30"
          value={sugarG}
          onChange={(e) => setSugarG(e.target.value.replace(/[^0-9,.]/g, ""))}
          className="h-10 w-28 rounded-full bg-card text-sm"
        />
        <span className="text-sm text-muted-foreground">g added sugar / day</span>
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

export function SugarSharpFaceArticleBody() {
  return (
    <article className="max-w-none">
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        <strong>Sugar and sodium both affect how sharp you look and how flat your gut stays.</strong> The sodium article covers salt and water retention; here we focus on <strong>added sugar</strong>—insulin, water from glycogen, and where it hides. For recomp and a leaner face, keeping added sugar low is a major lever.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">1. The hard number: &lt; 25g added sugar per day</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        The <strong>American Heart Association</strong> suggests a limit of <strong>36g added sugar per day for men</strong> (and 25g for women). Since you’re aiming to fix a bloated gut and puffy face, a <strong>tighter target of 25g</strong> (or less) is a practical goal.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>Why it matters:</strong>
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li><strong>Insulin:</strong> High sugar spikes insulin. Insulin suppresses fat breakdown (lipolysis) and promotes storage—so when insulin is high, <strong>burning belly fat becomes much harder</strong>. It’s not that you “can’t” burn fat, but the hormonal environment favors storage.</li>
        <li><strong>The face effect:</strong> Sugar is stored as glycogen, and <strong>for every 1g of glycogen your body holds about 3–4g of water</strong> (well-established in research). A high-sugar day can mean a softer, puffier face the next morning.</li>
      </ul>
      <AddedSugarCalculator />

      <h2 className="mt-6 text-lg font-semibold text-foreground">2. The two types of sugar (crucial distinction)</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        Not all sugar is equal. Nutrition labels and guidelines focus on <strong>added sugars</strong>—the kind that drive insulin spikes and hide in packaged and restaurant food.
      </p>
      <div className="mt-3 space-y-3">
        <div className="rounded-xl border border-border/60 bg-card/80 px-3 py-3">
          <p className="text-sm font-semibold text-foreground">Added sugar (the one to limit)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sugar added during processing or cooking: high-fructose corn syrup, cane sugar, dextrose, etc. Found in soda, energy drinks, BBQ sauce, teriyaki sauce, &quot;healthy&quot; granola bars, flavored yogurts.
          </p>
          <p className="mt-2 text-xs font-medium text-foreground">Rule: Keep as close to 0g as possible, and definitely under 25g for a sharp-face goal.</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/80 px-3 py-3">
          <p className="text-sm font-semibold text-foreground">Natural sugar (don’t fear it)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sugar found naturally in whole fruit (fructose) and dairy (lactose): bananas, berries, milk.
          </p>
          <p className="mt-2 text-xs font-medium text-foreground">Rule: You need potassium from bananas and others to help de-bloat; the fiber in fruit slows absorption and blunts the insulin spike that added sugar causes.</p>
        </div>
      </div>

      <h2 className="mt-6 text-lg font-semibold text-foreground">3. Common &quot;skinny fat&quot; traps</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        If you’re active and eating protein, these are the items that often blow your sugar limit without you realizing:
      </p>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-foreground/85">
        <li><strong>Protein bars:</strong> Many &quot;fitness&quot; bars have 15g+ added sugar (or sugar alcohols that cause bloating). Look for bars with <strong>&lt; 5g sugar</strong> per bar.</li>
        <li><strong>Sauces (Asian and Latin):</strong> Teriyaki and orange chicken sauce are almost pure sugar. BBQ sauce is a huge sugar bomb. Swaps: soy sauce (watch sodium), hot sauce, mustard, or sugar-free BBQ (e.g. G Hughes).</li>
        <li><strong>Liquid calories:</strong> Vitamin Water, Gatorade, and fruit juices (e.g. orange juice) are sugar concentrates. Stick to water, black coffee, or zero-calorie sodas if you want a fizzy fix.</li>
      </ul>
      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
        <strong>Quick test:</strong> Next time you buy a protein shake or yogurt, look at the label under &quot;Total Carbohydrates&quot; for &quot;Includes Xg Added Sugars.&quot; If one serving has 10g added sugar, that’s 40% of a 25g daily allowance in one item—consider putting it back or saving it for a rare treat.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">4. Summary checklist</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70">
              <th className="py-2 text-left font-semibold text-foreground">Target</th>
              <th className="py-2 text-left font-semibold text-muted-foreground">Why</th>
            </tr>
          </thead>
          <tbody className="text-foreground/85">
            <tr className="border-b border-border/50">
              <td className="py-2 font-medium">Added sugar: max 25g/day</td>
              <td className="py-2 text-muted-foreground">Keeps insulin and glycogen-bound water lower; supports sharper look and flatter gut.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-medium">Fruit: 1–2 servings/day fine</td>
              <td className="py-2 text-muted-foreground">Especially bananas for potassium; fiber blunts insulin spike.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-medium">Liquid calories: 0g added sugar</td>
              <td className="py-2 text-muted-foreground">Don’t drink your sugar—saves your budget for real food.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-6 border-l-4 border-primary/35 py-1 pl-4 text-muted-foreground">
        For a sharp face and flat gut, pair this with the sodium article: stay under ~25g added sugar and under 2,000 mg sodium, get enough potassium and water, and give it 5–7 consistent days.
      </p>
    </article>
  );
}
