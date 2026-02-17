# Iron Flow (Fitness) — Code & UX Audit

**Scope:** Fitness/workout journaling flow: routes, pages, state, API, navigation, and feature completeness.

---

## 1. Architecture Overview

| Layer | Implementation |
|-------|----------------|
| **Routes** | `/fitness` (home), `/fitness/routines`, `/fitness/progress`, `/fitness/log`, `/fitness/workouts/:planId/:workoutId` (edit/session), `/fitness/workouts/.../exercises/:exerciseId/guide`, `/fitness/exercises/create`, `/fitness/exercises/:id/edit`, `/fitness/exercises/add`, `/fitness/admin/exercises` |
| **State** | `AppStore`: `fitnessLibrary` (useExerciseLibrary), `fitnessPlanner` (useFitnessPlanner), `workoutPlans` (useWorkoutPlans), `workoutDrafts` |
| **API** | `server/routes/fitness.ts` (routines, session, history, goals), `server/routes/workouts.ts` (plans, templates, template exercises), `server/routes/exercises.ts` (library) |
| **Cache** | `lib/fitnessCache.ts`: workout plans TTL 5m, fitness planner TTL 5m, training analytics TTL 10m |

---

## 2. Dual Systems (Plans vs Routines) — Overlap & Clarity

**Two parallel “workout” concepts:**

1. **Workout plans & templates** (useWorkoutPlans + `/api/workouts`)
   - **Plans** = folders. **Templates** = named workouts inside a plan (each has exercises).
   - Used for: “Today in focus”, next workout HUD, “Start session” from home, editing workout structure, WorkoutDetails edit/session.

2. **Routines & sessions** (useFitnessPlanner + `/api/fitness`)
   - **Routines** = flat list of named routines (each has exercises + target sets).
   - **Sessions** = active or past logged session (sets, volume, duration).
   - Used for: “Architect” (Routines tab), LiveSessionPanel, session log, Flow.

**How they connect:**
- “Start session” on the **Fitness home** uses the **next workout from the active plan** but starts a **fitness session** via `startSessionFromTemplate(workoutName, exerciseNames)`, then navigates to **WorkoutDetails** in `session` mode.
- So: **plan/template** drives UI and “what’s next”; **fitness session** API stores logged sets. One session flow, two data models (plans vs routines).

**Assessment:**
- **Overlap:** There are two ways to “start a session”: (1) From **Routines** tab → pick routine → Start → back to home with LiveSessionPanel. (2) From **Fitness** home → “Start session” (next plan workout) → WorkoutDetails session mode. Both end up using the same session API but different entry points and UI (LiveSessionPanel vs WorkoutSessionEditor).
- **Risk:** Users may not understand “Routines” (Architect) vs “Plans/Workouts” (Atlas + today in focus). Naming (Atlas / Architect / Flow / Pulse) is branded but doesn’t spell out “plan vs routine.”
- **Recommendation:** Document the mental model (Plans = what to do when; Routines = reusable session templates). Consider unifying “start session” under one primary path and making the other a clear alternative (e.g. “Start from routine” vs “Start today’s workout”).

---

## 3. Navigation Consistency

**Single navigation system:** React Router + URL. No duplicate routers or competing navigation stacks.

**Dock (BottomNav):**
- **Fitness:** Atlas (→ `/fitness`), Routines (→ `/fitness/routines`), center FAB (→ `onAddAction`: start next workout), Progress (→ `/fitness/progress`), Log (→ `/fitness/log`).
- Secondary screens hide dock (`showNav={false}`) and use Back buttons or in-page actions. Consistent.

**Sheet vs route:**
- **Sheets (URL searchParams):** `?sheet=exercise`, `?sheet=plan`, `?sheet=workout` with `exerciseId`, `planId`, `workoutId`. Used for exercise detail, plan menu, workout quick actions. Closing uses `navigate(-1)` or `setParams({}, { replace: true })`. Good for modal-style flows without leaving the page.
- **Routes:** Used for full-page flows (workout edit, session, guide, add exercise, create exercise, admin). No conflict: sheets for lightweight overlays, routes for dedicated screens.

**Minor issue:** Fitness home has both (1) in-page “Atlas” block and (2) dock “Atlas” to `/fitness`. Redundant entry to the same content; acceptable but could be simplified (e.g. dock “Home” and keep Atlas as a section).

---

## 4. Code Quality & Anti-Patterns

### 4.1 Duplicated search/debounce logic
- **Fitness.tsx** and **FitnessRoutines.tsx** each implement the same debounced exercise search (abort controller + 350 ms delay + `searchExercises`). **FitnessProgress.tsx** has similar debounced search (250 ms).
- **Recommendation:** Extract a shared hook, e.g. `useDebouncedExerciseSearch(query, { delayMs: 350, scope: 'mine' })`, used by Fitness, FitnessRoutines, and FitnessProgress. Reduces drift and keeps behavior consistent.

### 4.2 Bug: `removeRoutine` rollback never restores state
- In **useFitnessPlanner.ts** `removeRoutine`, two `setRoutines` calls are used. The first filters out the routine; the second tries to capture `removed` from `prev`, but `prev` is already updated (routine is gone), so `removed` stays `null`. On API failure, rollback does nothing.
- **Fix:** Capture the removed routine in the first updater, then run a single optimistic update, e.g.:
  `setRoutines((prev) => { const r = prev.find(...); if (r) removed = r; return prev.filter(...); });`
  then `setActiveRoutineId(...)`. Remove the second `setRoutines` call.

### 4.3 Large component files
- **WorkoutSessionEditor.tsx** is very large (~1.8k+ lines). Same for **Fitness.tsx** (~700 lines). Industry practice: split by feature (e.g. session editor into SessionExerciseCard, SetRow, RestTimer, etc.) for readability and testing.
- **Recommendation:** Break WorkoutSessionEditor into smaller presentational components and keep the page/hook as orchestrators.

### 4.4 Error handling
- Many `try/catch` blocks only call `toast(...)` or “handled in hook” and rethrow. No centralized error reporting or logging. Acceptable for MVP; for production consider a small error-boundary + logging layer (e.g. report to backend or console in dev).

### 4.5 Loading and cache
- **useWorkoutPlans** and **useFitnessPlanner** use module-level cache (fitnessCache) and “load once” semantics. Refresh is explicit (`refreshWorkoutPlans`, `refresh(true)`). No React Query here; consistent with the rest of the app. Cache TTLs (5–10 min) are reasonable. No obvious cache invalidation bugs.

---

## 5. Industry-Standard Features for a Workout Journal

| Feature | Status | Notes |
|--------|--------|--------|
| Exercise library | ✅ | Search, create, edit, admin thumbnails, guide (video/steps). |
| Workout templates | ✅ | Plans → workouts → exercises; reorder, rename, duplicate, delete. |
| Session logging | ✅ | Log sets (weight, reps), rest timer, RPE, previous weight; finish with summary. |
| Session history | ✅ | Recent sessions list; volume/sets in summary. |
| Progress / analytics | ✅ | Volume & sets over time; exercise-specific 1RM/est. 1RM. |
| Routines (reusable) | ✅ | Architect: routines with exercises and target sets; start session from routine. |
| Weight unit (lb/kg) | ✅ | From activity goals. |
| Offline / persistence | ⚠️ | Session and plans cached; no explicit offline queue for mutations (contrast with nutrition). |
| Rest timer | ✅ | In WorkoutSessionEditor. |
| PR / 1RM tracking | ✅ | Progress tab shows estimated 1RM. |
| Supersets / circuits | ⚠️ | Not explicitly modeled; exercises are ordered lists only. |
| Warm-up sets | ⚠️ | No dedicated “warm-up” flag; user can add as normal sets. |
| Notes per set/exercise | ✅ | Note on exercise; optional RPE/rest. |
| Export / share | ⚠️ | Copy summary in WorkoutDetails; no export to file or share sheet. |

Verdict: Core features for a workout journal are present. Gaps are mainly around supersets, warm-ups, and export/share; optional for v1.

---

## 6. Maintainability

**Strengths:**
- Clear split: **types/fitness.ts** (domain types), **lib/api.ts** (fitness/workout/exercise endpoints), **lib/fitnessCache.ts** (cache), hooks for planner and workout plans.
- Naming is consistent (e.g. `WorkoutTemplate` vs `Routine` in types and UI).
- AppStore exposes a single surface (fitnessLibrary, fitnessPlanner, workoutPlans); pages don’t import API directly for reads (they use store).

**Weaknesses:**
- **Fitness.tsx** does too much: search, sheets, plan/workout CRUD, navigation, empty state, Atlas block. Hard to test or change one flow without touching others. Splitting by feature (e.g. FitnessHome, FitnessAtlas, FitnessPlans) would help.
- **useFitnessPlanner** is long and holds many concerns (routines, session, history, goals, weight unit). Could be split into e.g. useRoutines, useActiveSession, useSessionHistory, with a thin useFitnessPlanner composing them.
- Some magic strings: `sheet=exercise`, `sheet=plan`, `sheet=workout`. Constants or a tiny “fitness params” helper would reduce typos and simplify refactors.

---

## 7. Summary & Prioritized Recommendations

### Critical
1. **Fix `removeRoutine` rollback** in useFitnessPlanner so that on API failure the removed routine is restored and activeRoutineId is rolled back.

### High
2. **Unify debounced exercise search** into one hook and use it in Fitness, FitnessRoutines, and FitnessProgress.
3. **Clarify Plans vs Routines** in UX: short in-app copy or tooltip (e.g. “Plans = weekly structure; Routines = quick session templates”) and, if possible, one primary “Start session” path.

### Medium
4. **Split Fitness.tsx** into smaller components (e.g. FitnessAtlas, FitnessPlans, FitnessEmptyState) and/or sub-pages.
5. **Split WorkoutSessionEditor** into smaller components (e.g. by exercise card, set row, rest timer).
6. **Replace sheet param strings** with constants or a small helper (e.g. `FITNESS_SHEETS.exercise`, `FITNESS_SHEETS.plan`, `FITNESS_SHEETS.workout`).

### Low
7. Consider **React Query (or similar)** for workout plans and fitness planner to get consistent loading/error/refetch and less custom cache code (optional; current approach is workable).
8. Add **export/share** for a finished session (e.g. share sheet or copy to clipboard with a standard format).

---

## 8. Conclusion

- **Navigation:** Single system (React Router + sheets via searchParams); no overlapping navigation systems.
- **Code:** Generally fine; main issues are one real bug (removeRoutine), duplicated search logic, and very large components.
- **Features:** Aligned with common workout journal expectations; main gap is clarity between “Plans” and “Routines.”
- **Maintainability:** Good layering and types; would improve with smaller components and a shared exercise-search hook.

Applying the critical and high-priority items will address the only correctness bug and the main maintainability and UX clarity issues.
