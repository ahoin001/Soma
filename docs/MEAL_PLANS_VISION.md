# Meal Plans (Guides) – Vision (locked in)

## Product model

- **Individual day templates only.** No rigid "7-day plans." Think of Meal Plans as a **menu** of "perfect days" (e.g. "Standard Training Day," "Rest Day," "Heavy Carb Day") that users use as reference.
- **Collections (future):** A "Bulking Phase Collection" could group 3–4 day templates for display. For now, **groups** are the tag/filter; no separate collection entity.

---

## Groups = tags / filters

- **Verdict:** Groups stay **labels only** (no smart targets, no preset macros).
- **UI:** Horizontal scroll of chips at the top of the Meal Plan page: **"All"** plus one chip per group (e.g. "High Protein," "Rest Day," "Keto"). Clicking a chip **filters** the list of plan days.
- **Future V2:** Optional "Apply Targets" inside a plan that copies that plan’s macro ratio to the user’s daily goals—**do not** automate it yet.

---

## Log this plan (date + full day)

- **CTA:** Button is **"Log this plan…"** (not "Use for today"). Tapping opens a **sheet** with:
  - **Log to Today** (primary)
  - **Log to Tomorrow**
  - **Or pick a date** (date input + "Log" button)
- **State:** Pass **targetDate** (YYYY-MM-DD) in `location.state` with the plan data. Nutrition page sets the **view** to that date (no hardcoding "today").
- **Log full day:** A **"Log full day"** button at the top of the suggestion card logs all plan meals in one tap.
- **Conflict:** If the target day already has logged items, prompt: **"Append to existing items or Replace?"** Default = **Append**. Replace = clear that day’s log, then add all plan items.

---

## Implemented (current)

- Group filter chips (All + groups), filtering the plan-days list.
- "Log this plan…" sheet with Today / Tomorrow / Select date; `targetDate` passed to Nutrition; Nutrition switches to that date.
- "Log full day" on the suggestion card; Append vs Replace dialog when the day has items.
- Progress rings, empty-slot hint, haptic on quantity, per-meal "Add to [Meal]" (unchanged).

---

## Out of scope for now

- **Full 7-day plan scheduler** or week-view builder.
- **Smart groups** (e.g. "If Keto, set Carbs &lt; 20g").
- **Preset group templates** that prefill targets.
