# DRY Consolidation: Overlapping Systems to Unify

Areas where the app has duplicate types, logic, or UI that should be consolidated for maintainability and a single source of truth.

---

## 1. Auth: Full-page (Auth.tsx) vs Dialog (AuthDialog.tsx)

**Overlap:** Same form state, validation, submit flow, and error handling in two places.

| Item | Auth.tsx | AuthDialog.tsx |
|------|----------|----------------|
| State | mode, email, password, displayName, token, notice, status, error | Same |
| canSubmit | useMemo with same rules | Same |
| handleSubmit | register/login/reset + navigate on success | Same + onClose on success |
| Error parsing | Rich (JSON + string fallbacks) | Simpler (err.message only) |

**Recommendation:**
- Add **`useAuthForm()`** in `src/hooks/useAuthForm.ts`: state (mode, email, password, displayName, token, notice, status, error), `canSubmit`, `handleSubmit(onSuccess?)`, and `setField`/reset helpers.
- Add **`parseAuthError(err: unknown): string`** in `src/lib/authErrors.ts` (or inside the hook) and use it in both Auth and AuthDialog.
- Auth.tsx and AuthDialog.tsx become thin: call `useAuthForm()`, pass `handleSuccess` (navigate) or `onClose` into the submit path, and render their own layout (page vs dialog).

**Impact:** One place to change validation, copy, or error messages; dialog and page stay in sync.

---

## 2. Serving cache + normalizeUnit (FoodDetailSheet + EditFood)

**Overlap:** Same cache key, Map, load/persist logic, and unit normalization in two files.

| Item | FoodDetailSheet.tsx | EditFood.tsx |
|------|---------------------|--------------|
| servingCacheKey | `aurafit-serving-cache-v1` | Same |
| servingCache | `Map<string, ServingOption[]>` | Same |
| loadServingCache / persistServingCache | Same logic | Same logic |
| ServingOption | id, label, grams?, kind? | id, label, grams (required) |
| normalizeUnit(raw) | Inline function | Long switch-style function |

**Recommendation:**
- Add **`src/lib/servingCache.ts`** (or **`src/lib/foodServings.ts`**): export `ServingOption` type (id, label, grams?, kind?), `getServingCache()`, `loadServingCache()`, `persistServingCache()`, `getCachedServings(foodId)`, `setCachedServings(foodId, options)`.
- Add **`normalizeUnit(raw: string): string`** in the same module or in **`src/lib/schemas/food.ts`** (alongside existing food schemas), and use it in both FoodDetailSheet and EditFood.
- FoodDetailSheet and EditFood import from the shared module and remove their local cache/load/persist/normalizeUnit copies.

**Impact:** One cache implementation and one unit-normalization rule; no risk of key or behavior drift.

---

## 3. EditFood: NutritionDraft + LocationState + ServingOption

**Overlap:** EditFood still defines its own NutritionDraft (form variant), LocationState, and ServingOption; FoodDetailSheet has NutritionDraftForm and ServingOption.

**Recommendation:**
- **NutritionDraft** (strict): Already in `@/types/nutrition`; use it for API/callbacks. For form state with `number | ""`, use a shared **NutritionDraftForm** in `@/types/nutrition` (or a form-specific type next to NutritionDraft) and have both FoodDetailSheet and EditFood use it.
- **ServingOption:** Move to `@/types/api` or `@/types/nutrition` (or into the new serving cache module) and import in FoodDetailSheet, EditFood, and the cache.
- **LocationState:** Add a small **`LocationState`** type in `@/types/navigation` or in a shared page-types file if multiple pages use the same shape (e.g. `{ food?: FoodItem; returnTo?: string }`), and use it in EditFood and any other pages that rely on location state.

**Impact:** Aligns EditFood with the rest of the app’s types and avoids a third NutritionDraft variant.

---

## 4. Workout session: EditableSet / EditableExercise (WorkoutSessionEditor + WorkoutSessionSheet)

**Overlap:** Both define local types with the same names but slightly different shapes.

| Type | WorkoutSessionSheet | WorkoutSessionEditor |
|------|---------------------|----------------------|
| EditableSet | id, weight, reps, previous | + rpe?, restSeconds? |
| EditableExercise | id, name, sets | + note, steps?, guideUrl?, customVideoName? |

**Recommendation:**
- Add **`src/types/workout-edit.ts`** (or extend **`src/types/fitness.ts`**): define **EditableSet** (base: id, weight, reps, previous; optional: rpe, restSeconds) and **EditableExercise** (base: id, name, sets; optional: note, steps, guideUrl, customVideoName).
- WorkoutSessionSheet uses the base shape; WorkoutSessionEditor uses the extended shape (or the same type with optional fields). Both import from the shared types file.

**Impact:** Single definition for “editable workout session” shapes; easier to add fields or new consumers later.

---

## 5. Daily intake types: Summary, SyncState, LastLog (useDailyIntakeQuery + useDailyIntake)

**Overlap:** useDailyIntakeQuery.ts and useDailyIntake.ts (legacy) each define Summary, SyncState, and LastLog.

**Recommendation:**
- Move **Summary**, **SyncState**, and **LastLog** to **`src/types/nutrition.ts`** (or **`src/hooks/dailyIntakeTypes.ts`**). Have both useDailyIntakeQuery and the legacy hook in useDailyIntake import from there.

**Impact:** One place for daily-intake domain types; no duplicate type definitions.

---

## 6. FoodOverride (useFoodCatalogQuery + useFoodCatalog)

**Overlap:** Same structure in two hooks.

```ts
type FoodOverride = {
  kcal: number;
  portion: string;
  macros: Record<MacroKey, number>;
};
```

**Recommendation:**
- Define **FoodOverride** once in **`@/types/nutrition`** (or **`@/types/food.ts`** if you add it) and import in both useFoodCatalogQuery and useFoodCatalog.

**Impact:** Single source of truth for override shape; type and runtime stay aligned.

---

## 7. CacheEntry<T> (useFoodCatalog + useExerciseLibrary)

**Overlap:** Same generic cache-entry pattern in two hooks.

```ts
type CacheEntry<T> = { updatedAt: number; value: T };
```

**Recommendation:**
- Add **`src/lib/cache.ts`** or **`src/types/cache.ts`** with **CacheEntry<T>** and any shared helpers (e.g. isExpired). useFoodCatalog and useExerciseLibrary import from there.

**Impact:** Reusable cache type for future features (e.g. more client caches).

---

## 8. Goals form vs OnboardingDialog

**Overlap:** Same profile and goal fields (sex, age, height, weight, activity, goalType, formula, bodyFat, trainingDays, stepsPerDay, kcalGoal, carbs, protein, fat) and similar validation/save flow in Goals.tsx and OnboardingDialog.tsx.

**Recommendation:**
- Extract a **`useGoalsForm()`** (or **`useProfileGoalsForm()`**) hook that holds: initial values, current values, touched flags, validation (e.g. canSave), and a save handler that calls the same APIs (upsertUserProfile, upsertNutritionSettings, upsertNutritionTargets, etc.). Optionally share **GoalsFormFields** UI (inputs + labels) as a presentational component.
- Goals and OnboardingDialog use the hook and their own layout (full page vs steps in a dialog). Draft persistence (Goals’ GOALS_DRAFT_KEY vs Onboarding’s STORAGE_KEY) can stay in each consumer or be parameterized in the hook.

**Impact:** One place for profile/goals logic and API calls; fewer bugs when requirements change.

---

## 9. localStorage keys

**Overlap:** Key strings are scattered across many files; some keys are duplicated (e.g. USER_PROFILE_KEY in AppStore and UserContext).

**Recommendation:**
- Add **`src/lib/storageKeys.ts`** (or **`src/constants/storage.ts`**) and export constants, e.g.:
  - `SERVING_CACHE_KEY`, `USER_ID_KEY`, `SESSION_TOKEN_KEY`, `USER_PROFILE_KEY`, `FOOD_IMAGES_KEY`, `DEFAULT_HOME_KEY`, `GOALS_DRAFT_KEY`, `ONBOARDED_KEY`, `HEADER_STYLE_KEY`, `SHEET_*` keys, `WORKOUT_DRAFTS_KEY`, `EXERCISE_CACHE_KEY`, `OFFLINE_DB_NAME`, etc.
- Replace all raw strings with these constants. Resolve duplicates (e.g. USER_PROFILE_KEY) so it’s defined once and imported in both AppStore and UserContext.

**Impact:** Easier to rename or rotate keys; no typos or duplicate keys.

---

## 10. Auth error parsing (Auth.tsx only)

**Overlap:** Auth.tsx has rich error parsing (JSON + string fallbacks); AuthDialog has a one-liner. Same API errors should show the same messages.

**Recommendation:**
- As part of **§1 (useAuthForm + parseAuthError)**, move the full parsing logic into **parseAuthError** and use it in both Auth and AuthDialog so both get the same user-facing messages.

**Impact:** Consistent auth error UX and one place to improve copy.

---

## Suggested order of work

| Priority | Consolidation | Effort | Impact |
|----------|---------------|--------|--------|
| 1 | Storage keys (§9) | Low | Prevents key drift and typos |
| 2 | Serving cache + normalizeUnit (§2) | Medium | Removes a large duplicate block in two files |
| 3 | Auth form + parseAuthError (§1, §10) | Medium | Unifies two auth UIs and error handling |
| 4 | FoodOverride + daily intake types (§5, §6) | Low | Quick type moves |
| 5 | EditFood types + ServingOption (§3) | Low | Aligns EditFood with shared types |
| 6 | CacheEntry (§7) | Low | Small shared type |
| 7 | EditableSet / EditableExercise (§4) | Low | Shared workout-edit types |
| 8 | Goals/Onboarding form (§8) | High | Large but high payoff |

If you tell me which section you want to tackle first (e.g. “storage keys” or “serving cache”), I can outline concrete steps and code changes next.
