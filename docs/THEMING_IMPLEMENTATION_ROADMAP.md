# UI Theming Implementation Roadmap (Execution Tracker)

This is the execution tracker for migrating AuraFit to a production-grade theming system:
- Real light/dark mode
- Multiple palettes (starting with `emerald` and `ocean`)
- Token-first design system
- Gradual migration of hardcoded colors

---

## Phase 0 — Standards and Contract

- [x] Theme contract documented (`docs/THEMING_AND_DESIGN_SYSTEM.md`)
- [x] Semantic token strategy confirmed (`--background`, `--foreground`, `--primary`, etc.)
- [ ] Add PR rule: avoid raw `emerald-*` / `slate-*` in new code

---

## Phase 1 — Theme Runtime (Completed Core)

- [x] Theme runtime provider wired in `src/main.tsx` with `next-themes`
  - `attribute="class"`
  - `defaultTheme="system"`
  - `enableSystem`
  - persisted storage key `aurafit-theme-mode`
- [x] Toasts now follow resolved light/dark mode (`src/components/ui/sonner.tsx`)
- [x] User palette setting persisted (`themePalette`) via `UserContext`
- [x] Root classes apply both route experience + palette (`App.tsx`)

---

## Phase 2 — Tokenized Theme Classes (Completed Core)

- [x] Added palette variables and classes in `src/globals.css`
  - `.theme-emerald`
  - `.theme-ocean`
- [x] `experience-nutrition` now consumes palette variables
- [x] Added dark experience overrides:
  - `.dark.experience-nutrition`
  - `.dark.experience-fitness`
- [x] Dynamic status-bar color now respects palette/mode in `App.tsx`

---

## Phase 3 — In-App Controls (Started)

- [x] Added Theme Mode control (System / Light / Dark) in Nutrition preferences
- [x] Added Color Palette control (Emerald / Ocean) in Nutrition preferences
- [x] Updated key segmented controls in that preferences card to token-based colors
- [ ] Surface the same controls on Fitness/settings entry points

---

## Phase 4 — Hardcoded Color Migration (In Progress)

- [x] Shared wrappers (AppShell + BottomNav + toasts) migrated to semantic tokens
- [ ] Nutrition core pages migration (in progress; header + meal/steps/water/streak cards tokenized)
- [ ] Fitness core pages migration (in progress; header + core section + planning/session panels tokenized)
- [x] Guides/Groceries migrated to semantic tokens
- [ ] Secondary sheets/dialogs migration

### Priority order
1. Shared UI wrappers (`AppShell`, nav, toasts, drawers, cards)
2. Nutrition core pages
3. Fitness core pages
4. Guides / Groceries / article cards
5. Secondary sheets/dialogs

### Migration rule
- Replace raw colors with semantic tokens:
  - `bg-emerald-*` / `bg-white` / `text-slate-*` / `border-emerald-*`
  - ⟶ `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, etc.

---

## Phase 5 — Quality Gates (Pending)

- [x] Add lint/check to flag raw brand colors in app code
- [ ] Add visual regression snapshots for key pages in:
  - light + dark (emerald)
  - light + dark (ocean)
- [ ] Add manual QA checklist for contrast and focus states

---

## Phase 6 — Accessibility and Polish (Pending)

- [ ] WCAG contrast pass (text, buttons, chips, chart labels)
- [ ] Tune dark shadows/borders to reduce glare
- [ ] Final pass on gradients and overlays per palette

---

## Files Implemented in This Iteration

- `src/main.tsx`
- `src/state/UserContext.tsx`
- `src/lib/storageKeys.ts`
- `src/App.tsx`
- `src/globals.css`
- `src/components/ui/sonner.tsx`
- `src/pages/Nutrition.tsx`
- `src/components/aura/AppShell.tsx`
- `src/components/aura/BottomNav.tsx`
- `src/pages/Guides.tsx`
- `src/pages/Groceries.tsx`
- `src/components/aura/FitnessHeader.tsx`
- `src/pages/Fitness.tsx`
- `src/components/aura/WorkoutPlanSection.tsx`
- `src/components/aura/RoutineBuilderPanel.tsx`
- `src/components/aura/LiveSessionPanel.tsx`
- `src/components/aura/VirtualizedExerciseList.tsx`
- `src/components/aura/WorkoutTemplateSheet.tsx`
- `src/components/aura/DashboardHeader.tsx`
- `src/components/aura/MealLogPanel.tsx`
- `src/components/aura/StepsCard.tsx`
- `src/components/aura/WaterCard.tsx`
- `src/components/aura/StreakCard.tsx`
- `src/pages/AddExerciseToWorkout.tsx`
- `src/pages/CreateExercise.tsx`
- `src/pages/EditExercise.tsx`
- `src/pages/FitnessRoutines.tsx`
- `src/pages/AdminExerciseThumbnails.tsx`
- `scripts/check-theme-colors.mjs`

