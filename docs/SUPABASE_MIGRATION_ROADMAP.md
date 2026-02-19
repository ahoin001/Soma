# AuraFit → Supabase Migration Roadmap

> **Status**: Data already imported from Neon to Supabase. Schema exists. This roadmap covers user/auth reconfiguration and full migration completion.

---

## Current State

- **Database**: Supabase (PostgreSQL) with schema + data from Neon
- **Auth**: Custom auth (`public.users`, `user_auth_local`, `user_sessions`)
- **API**: Express server with cookie/bearer session validation
- **Frontend**: `useAuth`, `apiFetch` with credentials

---

## Supabase Auth vs Custom Auth

| Current (Custom)        | Supabase Auth              |
|-------------------------|----------------------------|
| `public.users`          | `auth.users` (canonical)   |
| `user_auth_local`       | `auth.users.encrypted_password` |
| `user_sessions`         | Supabase JWT/cookies       |
| `user_password_reset_*` | Supabase built-in          |
| `user_email_verification_*` | Supabase built-in     |

---

## Migration Strategy: Sync `public.users` with `auth.users`

We keep `public.users` as the **app profile table** and sync it with `auth.users`. All existing FKs stay as `REFERENCES users(id)`.

- **Rule**: `public.users.id` = `auth.users.id` for every user
- **Trigger**: When a row is inserted into `auth.users`, insert/upsert into `public.users`
- **Existing users**: Migrate into `auth.users` with the **same UUID** as `public.users.id` (via Admin API or migration script)
- **Tables to drop**: `user_auth_local`, `user_sessions`, `user_password_reset_tokens`, `user_email_verification_tokens`

---

## Phase 1: Schema & Auth Reconfiguration

### 1.1 Create auth.users → public.users sync

- Add trigger so inserts into `auth.users` also insert into `public.users`
- Ensures new signups via Supabase Auth get a `public.users` row

### 1.2 Migrate existing users into auth.users

- Run the Node script (preserves `public.users.id` and existing bcrypt passwords):
  ```bash
  pnpm add @supabase/supabase-js   # if not already installed
  # Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
  npx tsx scripts/migrate-users-to-supabase-auth.ts
  ```
- Supabase Admin API `createUser({ id, email, password_hash, email_confirm: true })` supports explicit `id` and bcrypt `password_hash`, so all FKs keep working.

### 1.3 Drop custom auth tables

- Drop: `user_sessions`, `user_password_reset_tokens`, `user_email_verification_tokens`
- Drop: `user_auth_local`
- Optional: Add `id uuid REFERENCES auth.users(id)` to `public.users` for integrity (after migration)

### 1.4 Enable RLS on public tables

- Enable RLS on all user-scoped tables
- Add policies: `auth.uid() = user_id` (or equivalent)

---

## Phase 2: Backend Changes

### 2.1 Replace Express auth with Supabase Auth

- Remove `/api/auth/*` routes (register, login, logout, me, reset, verify)
- Or keep as thin wrappers that call Supabase Admin API if needed

### 2.2 Session / JWT validation

- Replace cookie/bearer validation with Supabase JWT validation
- Options:
  - **A**: Use Supabase client on frontend; backend receives `Authorization: Bearer <supabase_jwt>` and validates with Supabase
  - **B**: Use Supabase PostgREST/auto-API; backend becomes minimal (Edge Functions for custom logic only)

### 2.3 DATABASE_URL

- Already pointing to Supabase (data imported)
- No change if keeping Express + Supabase Postgres

---

## Phase 3: Frontend Changes

### 3.1 Install Supabase client

```bash
pnpm add @supabase/supabase-js
```

### 3.2 Environment variables

Add to `.env.local`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

These must be set for Supabase Auth and PostgREST to be used instead of the legacy Render backend.

### 3.3 Auth wiring

- Replace `useAuth` logic with `supabase.auth.signUp`, `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`
- Use `supabase.auth.getUser()` → `user.id` as `userId`
- Remove `getSessionToken`, `setSessionToken`, `apiFetch` credentials for auth endpoints

### 3.4 API client

- **Option A (Keep Express)**: Keep `apiFetch`; pass Supabase JWT in `Authorization` header; backend validates JWT and extracts `userId`
- **Option B (Full Supabase)**: Replace `apiFetch` with `supabase.from('table').select/insert/update/delete` where possible; use Edge Functions for complex logic

---

## Phase 4: Tables Requiring User Relation Updates

All of these reference `users(id)`. No schema change needed if we keep `public.users.id` = `auth.users.id` and sync via trigger.

| Table | Column | Notes |
|-------|--------|-------|
| user_profiles | user_id | Keep FK to users(id) |
| user_preferences | user_id | Keep FK |
| user_nutrition_settings | user_id | Keep FK |
| user_activity_goals | user_id | Keep FK |
| foods | created_by_user_id | Keep FK |
| user_food_overrides | user_id | Keep FK |
| user_food_favorites | user_id | Keep FK |
| user_food_history | user_id | Keep FK |
| meal_types | user_id | Keep FK |
| meal_entries | user_id | Keep FK |
| daily_nutrition_targets | user_id | Keep FK |
| daily_nutrition_summary | user_id | Keep FK |
| workout_plans | user_id | Keep FK |
| routines | user_id | Keep FK |
| workout_sessions | user_id | Keep FK |
| weight_logs | user_id | Keep FK |
| water_logs | user_id | Keep FK |
| steps_logs | user_id | Keep FK |
| grocery_bag_items | user_id | Keep FK |
| exercise_media | user_id | Keep FK |
| exercise_overrides | user_id | Keep FK |
| exercise_stats_daily | user_id | Keep FK |
| muscle_stats_daily | user_id | Keep FK |
| brands | created_by_user_id | Keep FK |
| meal_plan_days | user_id | Keep FK |
| meal_plan_groups | user_id | Keep FK |
| meal_plan_week_assignments | user_id | Keep FK |
| meal_plan_target_presets | user_id | Keep FK |
| body_measurements | user_id | Keep FK |
| progress_photos | user_id | Keep FK |
| exercises | created_by_user_id | Keep FK |

**Conclusion**: No FK changes if `public.users.id` remains and we sync with `auth.users.id`.

---

## Phase 5: RLS Policies

Enable RLS on every user-scoped table and add policies, e.g.:

```sql
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own meal_entries"
  ON meal_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Repeat for all tables with `user_id` or `created_by_user_id`.

---

## Phase 6: Remaining Items

- [ ] Cloudinary: Keep as-is for food/brand images
- [ ] VITE_API_BASE_URL: Point to deployed Express (if keeping) or remove
- [ ] PWA / service worker: Ensure auth cookies/tokens work with Supabase
- [ ] Onboarding carousel / OnboardingDialog: No changes
- [ ] Admin user (ahoin001@gmail.com): Check via `auth.users.email` or `public.users` + profile

---

## Execution Order

1. **Run** `migrations/017_supabase_auth_sync.sql` in Supabase SQL Editor (trigger so new signups get a `public.users` row).
2. **Run** `npx tsx scripts/migrate-users-to-supabase-auth.ts` (migrate existing users to `auth.users` with same id + password_hash).
3. **Run** `migrations/018_drop_custom_auth.sql` (drop `user_auth_local`, `user_sessions`, etc.).
4. **Add** RLS policies on user-scoped tables (see Phase 5).
5. **Update** backend: validate Supabase JWT, remove or replace `/api/auth/*` routes.
6. **Update** frontend: Supabase client, useAuth, apiFetch with Bearer token.
7. **Test** end-to-end: sign up, sign in, CRUD flows.

---

---

## Backend vs Supabase: Recommendation

**Recommended: Move everything to Supabase.**

| Approach | Pros | Cons |
|----------|------|------|
| **Full Supabase** | Single data layer; no Render bill; RLS enforces security; realtime/subscriptions if needed; simpler ops | Must migrate remaining features (groceries, meal plans, workouts, journal, etc.) |
| **Hybrid (current)** | Gradual migration; some features work now | Two backends to maintain; more complexity; Render costs continue |

**Why move fully to Supabase**

1. **One backend** – No split between Supabase (meals, foods, activity) and Render (groceries, meal plans, workouts, journal). Simpler auth, no duplicate session handling.
2. **Cost** – Supabase free tier covers most use; Render free tier spins down and has cold starts.
3. **Security** – RLS is enforced in the DB; no need to remember auth checks in every Express route.
4. **Latency** – Direct Supabase PostgREST from the frontend avoids an extra Render hop for most queries.

**Migration order**

1. Auth + core nutrition (meals, foods, brands, weight/water/steps) – **Done**
2. Groceries – small table, quick to add to `supabase-api.ts`
3. Meal plans – medium effort, add Supabase CRUD
4. Workouts / routines / sessions – larger but straightforward
5. Journal (body measurements, progress photos) – straightforward
6. Exercise media / overrides – needs Supabase + Cloudinary
7. Cloudinary signatures – use a Supabase Edge Function instead of Express

**Keep on backend / external**

- **Cloudinary** – Upload URLs/signatures can come from a Supabase Edge Function or stay on a minimal Express route.
- **USDA API** – Can stay in an Edge Function or a small backend; not user-scoped.
- **Admin checks** – Use `auth.users.email` or `public.users`; no separate backend required.

---

## MCP Status

The Supabase MCP may return access control errors depending on project/org permissions. You can apply migrations via:

- **Supabase Dashboard** → SQL Editor (paste and run each migration)
- **Supabase CLI** → `supabase db push` (if linked to the project)
