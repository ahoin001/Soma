# IronFlow: Schema & Multi-User Model

Industry-standard design so **multiple users share an exercise library** while each user has **their own plans, sessions, set data, and personal notes**.

---

## 1. Data ownership (who sees what)

| Data | Scope | Table(s) | RLS |
|------|--------|----------|-----|
| **Exercises** | Shared (global + custom) | `exercises` | Read: all authenticated. Write: own rows only (`created_by_user_id`). |
| **User exercise notes & cues** | Per user | `exercise_overrides` | Own rows only (`user_id`). |
| **Workout plans & templates** | Per user | `workout_plans`, `workout_templates`, `workout_template_exercises`, `workout_template_exercise_alternates` | Own plan → own templates & exercises & alternates. |
| **Sessions & sets** | Per user | `workout_sessions`, `session_exercises`, `session_sets` | Own session → own exercises & sets. |
| **Routines** | Per user | `routines`, `routine_exercises` | Own rows only. |
| **Exercise media / overrides** | Per user or global | `exercise_media`, `exercise_overrides` | Read own + global; write own. |

- **Exercises**: One shared library. Users can create custom exercises (`created_by_user_id` set). Search uses scope `"all"` so everyone sees global + custom.
- **Plans, templates, sessions, sets**: Always scoped by `user_id` (via plan or session). Set information (weight, reps, RPE, rest, notes) is stored in `session_sets` and is therefore per user.
- **Personal notes per exercise**: Stored in `exercise_overrides.notes` (one row per user per exercise). Cues/steps and guide URL live in the same table. Shown in the exercise guide and saved with “Save my default cues & notes.”

---

## 2. Schema changes (migration 026)

- **`exercise_overrides.notes`** (text, nullable): User’s freeform notes for an exercise (e.g. form cues, reminders). Shown in the guide and persisted with overrides.
- **`session_sets.duration_seconds`** (int, nullable): For timed sets (e.g. planks, holds). Null = rep-based set. UI can surface this later (e.g. “60s” instead of reps).
- **RLS for `workout_template_exercise_alternates`**: Only the plan owner can manage alternates for their template exercises (via join through `workout_template_exercises` → `workout_templates` → `workout_plans`).

---

## 3. Maintainability & scalability

- **Naming**: Tables and columns use `snake_case`; RLS policies are named by intent (“Users can manage own …”).
- **Indexes**: Key lookups are indexed (e.g. `workout_sessions (user_id, started_at DESC)`, `session_sets (session_exercise_id, completed_at DESC)`, `exercise_overrides (exercise_name, user_id)`).
- **Comments**: New columns have `COMMENT ON COLUMN` for clarity.
- **No duplicate ownership**: Ownership is at the root (plan, session); child rows are reached via FK joins in RLS, avoiding drift.
- **Extensibility**: Adding fields (e.g. `warmup` on sets, `target_rpe` on template exercises) can follow the same pattern; new user-scoped data uses `user_id` and RLS.

---

## 4. Further improvements (high impact)

See **IRONFLOW_IMPROVEMENTS.md** for the full list. High-impact items that pair well with this schema:

1. **Rest timer in plan session** – Use `rest_seconds` from sets; no schema change.
2. **Post-workout summary** – Use existing `session_summary` and session aggregates.
3. **Copy previous workout** – Use `workoutLastSetsKey` / last session data; already supported by current schema.
4. **Timed sets in UI** – Use `session_sets.duration_seconds`; add input in set row (e.g. “60s” for planks).
5. **Batch-load user notes in session** – Optional: when loading a template, fetch `exercise_overrides` for current user for all exercise names and merge `notes` into each exercise so the session can show “Your notes” without opening the guide.

---

## 5. Summary

- **Multi-user**: Shared exercises; per-user plans, sessions, sets, and personal notes.
- **Set information**: Already per user via `session_sets` (weight, reps, RPE, rest, notes).
- **Personal notes**: `exercise_overrides.notes` + guide UI (“Your notes” + “Save my default cues & notes”).
- **Schema**: RLS on alternates, `duration_seconds` for timed sets, comments and indexes for maintainability and scalability.
