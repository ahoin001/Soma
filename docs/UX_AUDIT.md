# UI/UX Audit — Look & Feel Improvements

A senior UI/UX perspective on the AuraFit app. Recommendations are ordered by impact and effort (quick wins first where possible).

---

## 1. Visual hierarchy & density

**Issue:** Many cards use the same weight (border, shadow, padding). Section labels (e.g. "PREFERENCES", "ACCOUNT") are visually similar, so the page reads flat.

**Recommendations:**
- **Differentiate primary vs secondary blocks:** Use a lighter treatment for "support" cards (Preferences, Account) so the main content (Meals & log, Steps, Water) stands out. For example: secondary cards with `border-border/40`, `bg-muted/30`, and slightly smaller padding.
- **Tighten vertical rhythm:** Reduce `mt-6` between cards to `mt-4` or use a consistent 4/6/8 scale so the feed doesn’t feel stretched on small screens.
- **Single clear hero:** On Nutrition, the dashboard header is the hero. Keep one dominant visual (e.g. the calorie ring) and let the rest support it so the eye has a clear path.

---

## 2. Section labels (overlines)

**Issue:** Uppercase tracking labels (`text-xs uppercase tracking-[0.2em]`) are used everywhere. They’re good for structure but can feel samey and “enterprise.”

**Recommendations:**
- **Reserve overlines for true sections:** Use them for major blocks (e.g. "Meals & log", "Today") and use plain small labels or no label for inline groups (e.g. "Preferences" could be a single line: "Appearance & theme" with no overline).
- **Soften the style:** Slightly reduce letter-spacing (e.g. `tracking-[0.15em]`) or use `font-medium text-muted-foreground` without uppercase for less critical labels.
- **Consistent semantic level:** Map one style to “section title” and one to “caption” and reuse so hierarchy is predictable.

---

## 3. Buttons & primary actions

**Issue:** Many primary actions look the same (full-width, rounded-full). "Open Settings" and "Log out" compete; the real primary action (e.g. "Add to Breakfast") should win.

**Recommendations:**
- **Primary vs secondary:** Use `variant="default"` (filled) only for the one main action per context (e.g. "Add to [Meal]"). Use `variant="outline"` or `variant="ghost"` for Settings, Log out, Cancel.
- **Width:** Avoid `w-full` on every button. Use full width only for the main CTA in a card; use natural width or `flex-1` in a row for others (e.g. Cancel + Create brand).
- **Pill shape:** Keep `rounded-full` for primary CTAs; use `rounded-lg` or `rounded-xl` for secondary actions so primary feels more distinct.

---

## 4. Empty states & first-run

**Issue:** Empty states are functional but generic. First-time users may not know what to do first.

**Recommendations:**
- **Contextual copy:** In MealLogPanel, instead of "No items yet" + "Add item", use meal-specific copy: "Nothing in Breakfast yet — tap + to log your first item." Same idea for water, steps, etc.
- **Visual weight:** Slightly larger icon or a soft illustration (e.g. meal illustration for empty meals) to make empty states feel intentional, not “error-like.”
- **Optional onboarding:** A one-time tooltip or short coach mark on the main "Add" path (e.g. "Tap here to log food") can reduce confusion without a full tour.

---

## 5. Loading & skeletons

**Issue:** LoadingState delay (180 ms) is good; skeleton shape could better match real content to reduce layout shift and perceived wait.

**Recommendations:**
- **Content-matched skeletons:** Ensure NutritionPageSkeleton mirrors the real layout (header block, date switcher, meal cards, then steps/water). Same for list screens: use ListItemSkeleton with correct count and spacing.
- **Subtle motion:** A light shimmer (e.g. `animate-pulse` on a gradient overlay) on skeleton blocks can make loading feel faster; keep it subtle and respect `prefers-reduced-motion`.
- **No blank delay:** The “nothing” state before the skeleton appears is correct; keep delay ~150–200 ms so fast loads don’t flash.

---

## 6. Forms & inputs

**Issue:** Inputs mix `rounded-md` (design system) and `rounded-full` (page-level). Placeholder and label treatment varies.

**Recommendations:**
- **Consistent radius:** Pick one: either all inputs `rounded-lg`/`rounded-xl`, or all `rounded-full` for a pill look. Apply in the Input component or via a form variant class so it’s consistent.
- **Labels above inputs:** Where you have "Name", "Website", "Logo", use a single pattern: visible label above, optional hint below, and `aria-describedby` for errors/hints so screen readers get one consistent model.
- **Focus state:** You already use `focus-visible:ring-2`; ensure ring color has enough contrast (e.g. `ring-primary` or `ring-ring`) in both themes.

---

## 7. Bottom nav & touch targets

**Issue:** Nav is clear; icon-only items could be slightly larger for thumb reach and clarity.

**Recommendations:**
- **Touch targets:** Ensure each nav item has at least 44×44 px tap area (you’re close with `w-14` + padding). Add `min-h-[44px]` and center content if needed.
- **Active state:** Beyond color, consider a light background pill or underline so the active tab is obvious at a glance and for accessibility.
- **Safe area:** You already use `paddingBottom: max(1.25rem, var(--sab))`; keep this so the bar clears the gesture area on notched devices.

---

## 8. Cards & depth

**Issue:** Shadows are strong (`shadow-[0_12px_30px_...]`). On light mode they can feel heavy; on dark they’re fine.

**Recommendations:**
- **Soften light-mode shadows:** Use a lighter shadow for default cards, e.g. `shadow-[0_4px_14px_rgba(15,23,42,0.06)]`, and reserve the stronger shadow for elevated surfaces (modals, dropdowns, FAB).
- **Border + shadow:** You use `border border-border/60`; that’s good. Slightly reduce shadow when border is present so the card doesn’t feel “floaty.”
- **Dark mode:** Slightly lift card background (e.g. `bg-card` a step brighter than `bg-background`) so cards separate from the page without relying only on shadow.

---

## 9. Feedback & microcopy

**Issue:** Toasts and inline messages are functional; wording can be more specific and encouraging.

**Recommendations:**
- **Success:** After logging food: "Added to Breakfast" (or the actual meal) instead of a generic "Saved." Same for "Brand created", "Settings saved."
- **Errors:** Pair with a short next step: "Upload failed. Check your connection and try again."
- **Loading:** For mutations, "Adding…" / "Saving…" in the button or a small inline label feels better than only a spinner.

---

## 10. Accessibility

**Issue:** Good base (focus-visible, reduced motion, safe areas). A few refinements will help.

**Recommendations:**
- **Live regions:** Use `aria-live="polite"` for dynamic summary changes (e.g. "1,240 kcal remaining") so screen reader users get updates without re-reading the whole page.
- **Headings:** Ensure a single logical `h1` per route and use `h2`/`h3` for section titles so heading navigation is meaningful.
- **Contrast:** Double-check `text-muted-foreground` and `primary/70` against WCAG AA (4.5:1 for normal text). Adjust if needed.

---

## Quick wins (implement first)

1. **Soften secondary cards:** Preferences and Account cards use a lighter style (e.g. `bg-muted/30`, `border-border/40`) so Meals/Steps/Water stand out.
2. **Button hierarchy:** Use outline/ghost for "Open Settings" and "Log out"; keep filled primary for one main CTA per card.
3. **Empty state copy:** Meal-specific empty text: "Nothing in [Meal] yet — tap + to add."
4. **Input radius:** Standardize on `rounded-xl` or `rounded-full` in one place (e.g. Input + Select) and reuse.

---

## Medium effort (next phase)

5. **Section label system:** Define two levels (section title vs caption) in globals or a typography component and apply consistently.
6. **Skeleton fidelity:** Align NutritionPageSkeleton and list skeletons with final layout and add a light shimmer.
7. **Card shadow scale:** Lighter default shadow for cards; stronger only for overlays.

---

## Polish (when refining)

8. **Onboarding:** One-time hint for "Add" or first log.
9. **Success toasts:** Meal- and action-specific copy.
10. **Live region for summary:** Announce kcal/summary changes for screen readers.

---

*Audit based on globals.css, tailwind.config, Nutrition flow, Create/Edit food, Settings, LoadingState, EmptyState, and BottomNav. Prioritization is impact × feasibility.*
