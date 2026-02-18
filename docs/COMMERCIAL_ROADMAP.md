# Commercial Readiness & Food Library Roadmap

A focused roadmap for polish, normalized food data for wider diets, and distribution (including Capacitor).

---

## 1. Polish & Features (Commercial Feel)

### Already in good shape
- PWA with offline support, theme-color, app-like viewport
- Eager core routes + lazy secondary, chunk splitting
- Onboarding (goals, profile, macros), Auth, Settings
- Fitness: workout templates, alternate exercises, session logging, progress
- Nutrition: search, barcode, favorites, history, meal log, goals, micronutrients
- Design system (Tailwind, tokens, light/dark, palette)

### High-impact polish

| Area | Suggestion | Why |
|------|------------|-----|
| **Empty & error states** | Ensure every list/section has a clear empty state (illustration + CTA) and that API/offline errors show a retry or “Go back” instead of a blank screen. | Reduces confusion and support load. |
| **Loading consistency** | Use the same skeleton/loading pattern (e.g. `Skeleton` from UI) on all data-dependent views (nutrition summary, fitness plans, food search results). | Feels intentional and fast. |
| **Haptics** | When you add Capacitor, use light haptic on key actions (log food, complete set, save). | Makes the app feel native. |
| **Confirmation feedback** | After “Log food”, “Complete workout”, “Save plan”, show a short success state (e.g. checkmark + “Logged” or “Saved”) so users don’t second-guess. | Builds trust. |
| **Accessibility** | Run a quick pass: focus order, `aria-label` on icon-only buttons, sufficient contrast for key text. Optional: “Reduce motion” respect where you have heavy animations. | Wider audience and store requirements. |
| **App store metadata** | Prepare: short privacy policy (what you store, where), terms of use, support email, app description and screenshots. | Required for store listing. |

### Nice-to-have features
- **Rest timer**: Optional audible/visual rest timer between sets (you already have rest duration in session).
- **Export**: Export log (meals/workouts) as CSV or PDF for users or coaches.
- **Backup / restore**: Backup nutrition + fitness data (e.g. JSON export/import or account sync).
- **Streaks / reminders**: You have streak UI; optional gentle push or in-app reminder (“Log today’s meals”) can improve retention.

---

## 2. Food Library → Normalized Data for Wider Diets

Goal: one consistent food model that works for many diets and preferences, with clear sourcing and optional filtering.

### 2.1 What you have today
- **DB**: `foods` (name, brand, barcode, source, portion_label, portion_grams, kcal, carbs/protein/fat, micronutrients jsonb), `food_servings`, `food_nutrients`, `user_food_overrides`.
- **Sources**: Open Food Facts (OFF) and USDA; mapping into `FoodInsert` and global/user foods.
- **Client**: `FoodRecord` → `FoodItem` (macros, portion, source, micronutrients passthrough).

### 2.2 Normalize for wider range of users and diets

**A. Standardize micronutrients**
- **Idea**: Treat `micronutrients` as a known set of keys (e.g. `fiber_g`, `sodium_mg`, `sugar_g`, `calcium_mg`, `iron_mg`, `vitamin_d_iu`) and document them.
- **DB**: Keep `micronutrients jsonb`; optionally add a small `food_nutrients` or application-level schema doc (e.g. in code) so OFF/USDA mapping always writes the same keys.
- **Benefit**: Consistent display (e.g. “Fiber”, “Sodium”) and future filters (“low sodium”), without a big migration.

**B. Diet / label flags (for filtering and display)**
- **Idea**: Add optional flags so users can filter or highlight foods that fit their diet.
- **DB**: Add a jsonb column, e.g. `diet_labels jsonb DEFAULT '{}'`, with keys such as:
  - `vegetarian`, `vegan`, `gluten_free`, `dairy_free`, `nut_free`, `halal`, `kosher`
  - Or a simple array: `diet_labels text[]` (e.g. `{'vegan','gluten_free'}`).
- **Source mapping**:
  - OFF: map `labels_tags` / `categories` (e.g. “en:vegan”) into these flags when ingesting.
  - USDA: map FDC “foodCategory” or similar where possible; many will be “unknown”.
- **UI**: In Settings (or Goals), “Dietary preferences”: multi-select (e.g. “Show only vegan-friendly”). In search/list, optionally hide or badge items that don’t match (or “May contain …” from allergens).

**C. Allergens**
- **Idea**: Store allergens so users can avoid or be warned.
- **DB**: Same as diet labels: e.g. `allergens text[]` or `diet_labels` extended with `contains_gluten`, `contains_nuts`, etc. (or a separate `allergens` jsonb).
- **Source**: OFF has allergen-style tags; map them when building `FoodInsert`.
- **UI**: User sets “Allergens to avoid”; search results show a small “Contains: nuts” (or gray out / filter).

**D. Portion normalization**
- **Idea**: Always store and display “per 100 g” as the canonical baseline; add multiple serving sizes for UX.
- **Current**: You already have `portion_grams` and `portion_label`; `food_servings` supports multiple entries per food.
- **Improvement**: Ensure OFF/USDA ingestion writes a “100 g” serving where possible; use `food_servings` for “1 cup”, “1 slice”, etc. so the app can show “per serving” and “per 100 g” consistently. No schema change required if you already have `food_servings`; just normalize ingestion and use it in the UI.

**E. Source attribution**
- **Current**: `source` (e.g. “off”, “usda”, “user”) is stored.
- **Improvement**: In UI, show a small “Source: Open Food Facts” or “USDA” or “Community” so power users trust the data. Optional: “Report wrong data” linking to OFF or a feedback form.

**F. Optional: categories / taxonomy**
- For “browse by category” (e.g. Dairy, Grains, Snacks), you could add a `category_id` or `category_slug` to `foods` and a small `food_categories` table, populated from OFF categories or USDA. Lower priority than diet flags and allergens for “wider diets”.

### 2.3 Implementation order (suggested)
1. **Standardize micronutrient keys** in code and OFF/USDA mappers (no migration).
2. **Add `diet_labels` (and optionally `allergens`)** migration; map OFF (and USDA where possible) on insert/update; expose in API and `FoodRecord`/`FoodItem`.
3. **User dietary preferences** in `user_preferences` (e.g. `diet_filters jsonb` or a new table); filter or badge in search/list.
4. **Portion normalization** in ingestion and UI using `food_servings` + “per 100 g”.
5. **Source attribution** in food detail and search row.
6. Categories/taxonomy later if you add browse.

---

## 3. Distribution: Capacitor and Beyond

### 3.1 Why Capacitor fits
- You already have a **Vite + React** SPA and **PWA** (vite-plugin-pwa, offline, manifest). Capacitor wraps that same build into a native shell (iOS/Android) and gives access to device APIs.
- Same codebase: **web (and PWA)** + **iOS** + **Android** from one repo.

### 3.2 What to do

**Step 1: Add Capacitor**
- Install `@capacitor/core` and `@capacitor/cli`; add `capacitor.config.ts` (or `.json`) with `webDir: "dist"` (Vite output).
- Run `pnpm build`, then `npx cap add ios` and `npx cap add android`.
- Open in Xcode / Android Studio, set signing, and run on device/simulator. Your existing PWA assets (icons, splash) can be reused or adjusted for native.

**Step 2: API and auth**
- If the app talks to your backend via relative `/api`, configure Capacitor so that in production the app loads from your deployed origin (e.g. `https://yourapp.com`) or use a reverse proxy so `/api` hits your server. Avoid hardcoding localhost in production.
- Auth: You use localStorage + Bearer; that’s fine. For native, ensure cookies/localStorage are not cleared unexpectedly (Capacitor WebView is usually fine). If you add OAuth, use InAppBrowser or a dedicated plugin for secure redirects.

**Step 3: Native plugins that add value**
- **Camera**: Use `@capacitor/camera` or a barcode plugin for “Scan barcode” so the experience is native and reliable.
- **Haptics**: `@capacitor/haptics` for light feedback on log/save/complete.
- **Push (optional)**: `@capacitor/push-notifications` for reminders or streaks; implement a small backend for FCM/APNs.

**Step 4: Store readiness**
- **iOS**: Apple Developer account, App Store Connect, privacy policy URL, screenshots, description. Test on real devices (camera, haptics, keyboard).
- **Android**: Play Console, same metadata. Consider “Request install” or “Add to Home screen” from your PWA for users who don’t want the store.

### 3.3 Keep PWA as primary web experience
- Don’t remove PWA. Many users will use “Add to Home screen” or the web app; Capacitor is for users who want a store install and native features (camera, haptics, push). Same build can serve both if you keep `webDir` as `dist` and deploy `dist` to your host.

---

## 4. Summary Checklist

**Polish**
- [ ] Consistent empty and error states with retry/CTA
- [ ] Loading/skeletons on all async views
- [ ] Success feedback on log/save/complete
- [ ] Accessibility pass (focus, labels, contrast)
- [ ] Privacy policy, terms, support email for stores

**Food library (normalized, diet-friendly)**
- [ ] Standard micronutrient keys and OFF/USDA mapping
- [ ] `diet_labels` (and optionally `allergens`) in DB and API
- [ ] User dietary preferences and filter/badge in UI
- [ ] Portion normalization (per 100 g + servings) in ingestion and UI
- [ ] Source attribution in UI

**Distribution**
- [ ] Add Capacitor; build and run on iOS and Android
- [ ] Native camera (barcode) and haptics
- [ ] Production API URL and auth flow verified on device
- [ ] Store metadata and screenshots; optional push later

This order keeps your current architecture intact, improves the food library for diverse diets, and gets you to a single codebase that can ship as PWA + native apps when you’re ready.
