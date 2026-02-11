/**
 * Article body: How to Reduce Face Roundness & Bloat — game plan and key strategies.
 * Includes impact scale 1–10 and a sodium calculator.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Two dimensions: roundness can be (1) actual fat on the face, or (2) puffiness/water retention.
 * Scores = how much this factor contributes to that dimension when it's a problem — NOT "fix this and you're X% done."
 */
function ImpactRow({
  fat,
  puffiness,
  labelFat = "Facial fat",
  labelPuff = "Puffiness",
}: {
  fat: number;
  puffiness: number;
  labelFat?: string;
  labelPuff?: string;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span><strong>{labelFat}:</strong> {fat}/10</span>
      <span><strong>{labelPuff}:</strong> {puffiness}/10</span>
    </div>
  );
}

function SodiumCalculator() {
  const [inputValue, setInputValue] = useState("");
  const num = inputValue.trim() === "" ? null : Number(inputValue.replace(/,/g, ""));
  const valid = num !== null && !Number.isNaN(num) && num >= 0 && num <= 10000;

  let band: "safe" | "moderate" | "risky" | "high" | null = null;
  let message = "";
  if (valid && num !== null) {
    if (num < 2000) {
      band = "safe";
      message = "Great for minimizing puffiness. Many people see less face bloat in this range.";
    } else if (num < 2300) {
      band = "moderate";
      message = "OK for health; cutting toward 1,500–2,000 mg can reduce water retention and face roundness.";
    } else if (num < 3500) {
      band = "risky";
      message = "Likely to hold water. Try reducing to under 2,300 mg (ideally under 2,000) for a leaner-looking face.";
    } else {
      band = "high";
      message = "Very likely to cause puffiness. Focus on whole foods and reading labels; aim for under 2,000 mg daily.";
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-secondary/55 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary/85">
        Daily sodium calculator
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your estimated daily sodium intake (in mg). We’ll tell you if it’s in a good range for a less puffy face.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="e.g. 2400"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.replace(/[^0-9,]/g, ""))}
          className="h-10 w-28 rounded-full bg-card text-sm"
        />
        <span className="text-sm text-muted-foreground">mg sodium/day</span>
      </div>
      {valid && band && (
        <div
          className={cn(
            "mt-3 rounded-lg border px-3 py-2 text-sm",
            band === "safe" && "border-primary/30 bg-primary/10 text-primary",
            band === "moderate" && "border-accent/50 bg-accent/35 text-accent-foreground",
            band === "risky" && "border-destructive/30 bg-destructive/10 text-destructive",
            band === "high" && "border-destructive/40 bg-destructive/15 text-destructive",
          )}
        >
          <strong>
            {band === "safe" && "Safe for a nicer face"}
            {band === "moderate" && "Moderate"}
            {band === "risky" && "Risky for puffiness"}
            {band === "high" && "Too high for a lean face"}
          </strong>
          <p className="mt-1 text-inherit opacity-90">{message}</p>
        </div>
      )}
    </div>
  );
}

export function FaceRoundnessArticleBody() {
  return (
    <article className="max-w-none">
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        Face roundness usually comes from two different things: <strong>actual fat on the face</strong> (from overall body fat) and <strong>puffiness</strong> (water retention, inflammation). They look similar but respond to different levers. No single change “fixes” your face—realistic results come from a mix of habits.
      </p>
      <figure className="my-4">
        <img
          src="/guides/face-roundness-drivers.png"
          alt="Diagram: two drivers of face roundness — facial fat from body fat vs puffiness from water retention"
          className="max-w-full rounded-lg border border-border/70"
        />
        <figcaption className="mt-1 text-xs text-muted-foreground">Two main drivers: fat vs puffiness.</figcaption>
      </figure>
      <div className="mt-3 rounded-lg border border-accent/50 bg-accent/35 px-3 py-2 text-xs text-accent-foreground">
        <strong>How to read the scores below:</strong> We rate each factor on (1) <strong>facial fat</strong> — how much it affects actual fat on the face — and (2) <strong>puffiness</strong> — how much it affects water retention/bloat. 10 = this factor can drive a lot of that type of roundness when it’s off. Scores do <em>not</em> mean “fix this and you’re 90% done”; they help you see which levers affect which part of the problem. “Realistic if you fix only this” sets expectations for what changing that one thing typically does.
      </div>

      <h2 className="mt-6 text-lg font-semibold text-foreground">1. Body fat: the biggest lever for actual face shape</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        <ImpactRow fat={10} puffiness={1} />
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        You can’t spot-reduce fat from your face, but as overall body fat goes down, your face tends to look leaner and less round. For many people, losing a modest amount of body fat (e.g. 5–10% of body weight) makes a visible difference in the face. It does <em>not</em> fix water retention—that’s separate.
      </p>
      <p className="mt-2 rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Realistic if you fix only this:</strong> Sustained fat loss over weeks to months can noticeably slim the face for many people. You may still look puffy on high-sodium or high-stress days; that’s the puffiness lever.
      </p>
      <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li>Eat in a small calorie deficit (quality food, not crash diets).</li>
        <li>Keep protein high to preserve muscle and stay full.</li>
        <li>Weigh yourself weekly under similar conditions to track trends, not day-to-day bloat.</li>
      </ul>
      <p className="rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Suggestions:</strong> Aim for a deficit of about 200–400 kcal/day for steady loss. Protein: ~0.35–0.55 g per lb body weight (0.8–1.2 g per kg) to preserve muscle and curb hunger.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">2. Sodium and water retention</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        <ImpactRow fat={0} puffiness={9} />
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        Too much sodium makes you hold water. Your face (and hands, ankles) can look puffy and rounder even when body fat hasn’t changed. Cutting back on sodium and drinking enough water often reduces that “bloated face” look within days. Sodium has <em>no</em> effect on actual facial fat—only on puffiness.
      </p>
      <p className="mt-2 rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Realistic if you fix only this:</strong> If a lot of your roundness is bloat, cutting sodium can make a big difference in puffiness (often within days). If your roundness is mostly fat, fixing sodium alone will not slim your face—you’ll look less puffy but the underlying roundness from fat will remain until you address body fat.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <strong>Healthy amount for a nicer face:</strong> For less puffiness, aim for <strong>under 2,300 mg</strong> per day; many people see the best result at <strong>1,500–2,000 mg</strong>. The WHO recommends under 2,000 mg for general health. Packaged foods, bread, sauces, and restaurant meals often add up to 3,000+ mg without much volume—so reading labels and cooking at home helps a lot.
      </p>
      <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li>Limit processed foods, takeaways, and salty snacks.</li>
        <li>Cook more at home and use herbs/spices instead of heavy salt.</li>
        <li>Check labels: “sodium” adds up quickly in bread, sauces, and packaged meals.</li>
      </ul>
      <SodiumCalculator />

      <h2 className="mt-6 text-lg font-semibold text-foreground">3. Junk food and inflammation</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        <ImpactRow fat={6} puffiness={5} />
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        Sugary and highly processed foods can spike blood sugar, increase inflammation, and worsen water retention. They also make it easier to overeat, which keeps body fat (and face roundness) up.
      </p>
      <p className="mt-2 rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Realistic if you fix only this:</strong> Helps both fat (via fewer excess calories) and puffiness (less inflammation/salt). Usually a noticeable but partial improvement; works best together with managing calories and sodium.
      </p>
      <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li>Reduce sugary drinks, sweets, and refined carbs (white bread, pastries).</li>
        <li>Base meals on whole foods: vegetables, lean protein, whole grains, healthy fats.</li>
        <li>You don’t have to cut out treats entirely—just make them the exception, not the rule.</li>
      </ul>
      <p className="rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Suggestions:</strong> Try swapping one processed snack per day for fruit or nuts; replace one sugary drink with water or unsweetened tea. Small swaps add up.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">4. Walking and daily movement</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        <ImpactRow fat={3} puffiness={2} />
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        Walking doesn’t “burn face fat” directly, but it helps with calorie balance, stress, sleep, and circulation. All of that supports a leaner look and less puffiness over time.
      </p>
      <p className="mt-2 rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Realistic if you fix only this:</strong> Small direct effect on face by itself. Main benefit is supporting the other levers (deficit, stress, sleep). Worth doing, but don’t expect “walking alone” to reshape your face.
      </p>
      <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li>Aim for a consistent habit (e.g. 20–30 minutes most days) rather than occasional long walks.</li>
        <li>Morning or after meals can help with blood sugar and mood.</li>
      </ul>
      <p className="rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Suggestions:</strong> Target 7,000–10,000 steps most days, or 20–30 minutes of brisk walking. Consistency matters more than one long weekend walk.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">5. Sleep and stress</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        <ImpactRow fat={5} puffiness={5} />
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        Poor sleep and high stress raise cortisol, which can increase appetite, water retention, and fat storage around the midsection and face. Better sleep and simple stress management (walking, rest, boundaries) support your overall plan.
      </p>
      <p className="mt-2 rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Realistic if you fix only this:</strong> Can improve both retention (less puffy) and appetite/weight over time. Moderate effect; helps everything else work better rather than being a single fix.
      </p>
      <p className="rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Suggestions:</strong> Aim for 7–9 hours of sleep; set a consistent bedtime. For stress: short walks, breathing exercises, or 10 minutes of quiet time can help.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">6. Alcohol</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        <ImpactRow fat={0} puffiness={7} />
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        Alcohol is dehydrating and inflammatory; the next-day “puffy face” is often water retention and inflammation. Cutting back or avoiding alcohol, especially before important days, can make a noticeable difference. It does <em>not</em> reduce actual facial fat—only puffiness.
      </p>
      <p className="mt-2 rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Realistic if you fix only this:</strong> Mainly reduces next-day puffiness and “morning face.” No effect on facial fat. Good lever if bloat is part of your concern; won’t slim a round face that’s mostly fat.
      </p>
      <p className="rounded-lg border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        <strong>Suggestions:</strong> If you drink, 1–2 drinks or less per occasion and fewer nights per week usually reduces next-day puffiness. Skip the night before events if you want a sharper look.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-foreground">Quick priority list</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Order reflects which levers affect the most (fat + puffiness). Fixing one thing alone is rarely enough—combine what applies to you.
      </p>
      <ol className="my-3 list-decimal space-y-2 pl-5 text-sm text-foreground/85">
        <li><strong>Body fat</strong> (fat 10, puff 1) — biggest lever for actual face shape; sustained deficit + protein.</li>
        <li><strong>Sodium</strong> (fat 0, puff 9) — under 2,300 mg (ideally 1,500–2,000); use the calculator above. Only affects puffiness.</li>
        <li><strong>Junk and sugar</strong> (fat 6, puff 5) — reduces inflammation and supports deficit.</li>
        <li><strong>Sleep and stress</strong> (fat 5, puff 5) — 7–9 hours sleep, simple stress relief; supports both.</li>
        <li><strong>Alcohol</strong> (fat 0, puff 7) — reduces next-day puffiness only; no effect on fat.</li>
        <li><strong>Walking</strong> (fat 3, puff 2) — supports the rest; small direct effect on its own.</li>
      </ol>

      <p className="mt-6 border-l-4 border-primary/35 py-1 pl-4 text-muted-foreground">
        Consistency beats perfection. Small changes in these areas add up to a leaner, less bloated look over weeks and months. Focus on one or two habits first, then add more as they stick.
      </p>
    </article>
  );
}
