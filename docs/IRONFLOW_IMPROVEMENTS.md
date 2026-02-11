# IronFlow: UX, UI & Feature Improvements

Prioritized ideas to make IronFlow a more robust, helpful workout planner and tracker. Pick by impact vs effort.

---

## High impact, lower effort

### 1. **Rest timer in plan-based sessions**
- **Now:** Rest timer (countdown + skip) exists in **Flow** (LiveSessionPanel) but not in the **plan session** flow (WorkoutDetails → WorkoutSessionEditor in session mode). The session editor only shows rest duration and a decorative bar.
- **Improve:** Add an optional countdown rest timer in `WorkoutSessionEditor` when in session mode—e.g. after logging a set, show “Rest 1:30” with countdown and “Skip rest,” using the exercise’s `restSeconds` (or a default). Keeps behavior consistent whether user starts from a plan or from Flow.

### 2. **Post-workout summary screen**
- **Now:** Finishing a session shows a toast and navigates away; history is in Fitness Log (list + copy summary).
- **Improve:** After “Finish” in a plan session, show a **summary screen** (same route or modal): total sets, volume (kg/lb), duration, optional “Copy summary” and “Back to plan.” Then navigate. Gives closure and makes the log feel more intentional.

### 3. **“Last time” / copy previous sets**
- **Now:** Session editor pre-fills from `workoutLastSetsKey` (last time for this template). “Previous” column shows that data.
- **Improve:** Add a **“Copy previous workout”** (or “Fill from last time”) control when starting a session if previous data exists—one tap to populate all exercises from last time. Makes it obvious and reduces taps.

### 4. **Empty state for “no exercises in workout”**
- **Now:** User can open a workout that has no exercises yet; editor may be empty or confusing.
- **Improve:** In WorkoutDetails, if `activeWorkout.exercises.length === 0`, show a dedicated empty state: “No exercises yet. Add exercises to build this workout,” with CTA to Add Exercise (and optionally “Browse library”). Same idea on the session view if they somehow start with an empty template.

### 5. **Confirm before discarding session**
- **Now:** Closing the session screen (e.g. back) may lose in-progress sets if they’re not persisted.
- **Improve:** If there are logged sets and user taps back/close, show a confirmation: “Leave session? Your sets may not be saved.” Options: “Leave” / “Stay”. Reduces accidental loss.

---

## High impact, medium effort

### 6. **Estimated duration for a workout**
- **Now:** No indication of how long a workout might take.
- **Improve:** Show “~25 min” (or similar) on the workout card or header, derived from number of sets × assumed rest (e.g. 90 s) + buffer. Helps with planning.

### 7. **Progress in session (e.g. “Set 2 of 4” per exercise)**
- **Now:** User sees all sets and fills them; progress is implicit.
- **Improve:** Per exercise, show “Set 2 of 4” and optionally a small progress bar. Reduces cognitive load and clarifies what’s left.

### 8. **Streak / “last performed” on plans**
- **Now:** Header shows “Last: Workout A · Done” and “Next: Workout B”; FitnessProgress has volume/sets over time.
- **Improve:** Surface a simple streak (e.g. “3 weeks in a row”) or “Last done 2 days ago” on the plan or header. Encourages consistency.

### 9. **Reorder exercises in session**
- **Now:** In edit mode user can reorder; in session mode order is fixed.
- **Improve:** In session mode, allow reordering (or “skip to exercise”) so users can do exercises in a different order without leaving the session. Optional: “Move to end” for supersets or equipment availability.

### 10. **Haptic / sound on set logged**
- **Now:** Flow’s LiveSessionPanel uses `navigator.vibrate` on log; plan session editor may not.
- **Improve:** Use a short haptic (and optionally a subtle sound) when a set is logged in the plan session editor too. Reinforces the action and feels responsive.

---

## Medium impact, nice to have

### 11. **Readiness / “suggested next”**
- **Now:** Header shows “Readiness 82%” (likely placeholder).
- **Improve:** If you have no backend for readiness, either remove it or replace with something actionable (e.g. “Next up: Push Day” from the active plan). Avoids a fake metric.

### 12. **Rename “Flow” vs “Session”**
- **Now:** “Flow” is used for the quick-log panel (routines + rest timer); “Session” for the full plan-based workout screen.
- **Improve:** Use consistent labels (e.g. “Session” everywhere, or “Flow” for both) and a short tooltip/description so users understand the difference between “Start from plan” and “Start from routine.”

### 13. **Fitness Log: filter by plan or workout**
- **Now:** Fitness Log lists recent sessions with date and volume.
- **Improve:** Optional filter by plan or template name so users can see “Last 5 Push days” or “All sessions for this workout.”

### 14. **Pulse (FitnessProgress): empty state**
- **Now:** Charts and lift search are present.
- **Improve:** If no data, show a clear empty state: “Log workouts to see volume and 1RM trends,” with a link to start a session or add a workout.

### 15. **Offline / sync messaging**
- **Now:** App works offline in places; sync behavior may be unclear.
- **Improve:** When user finishes a session offline, show a small banner: “Saved locally. We’ll sync when you’re back online.” (If you already have an offline queue, surface it here.) Reduces doubt about lost data.

---

## Quick wins (UI polish)

- **Toast position:** Already fixed for notch; keep toasts brief and actionable.
- **Loading states:** Ensure every IronFlow path (plans, workout details, exercise guide, session) shows a clear loading state until data is ready (you’ve already improved this for plan/session).
- **Buttons:** Use consistent primary (e.g. emerald) for “Start session” / “Log set” / “Finish” so the main actions are obvious.
- **Accessibility:** Ensure “Finish,” “Save,” “Add exercise,” and rest “Skip” are focusable and have clear labels for screen readers.

---

## Summary table

| # | Improvement              | Impact | Effort |
|---|--------------------------|--------|--------|
| 1 | Rest timer in plan session | High   | Low    |
| 2 | Post-workout summary     | High   | Low    |
| 3 | Copy previous workout    | High   | Low    |
| 4 | Empty state (no exercises)| Medium | Low    |
| 5 | Confirm discard session  | Medium | Low    |
| 6 | Estimated workout duration | High | Medium |
| 7 | Set progress (2 of 4)    | Medium | Medium |
| 8 | Streak / last performed  | Medium | Medium |
| 9 | Reorder/skip in session  | Medium | Medium |
|10 | Haptic on set logged     | Low    | Low    |

Implementing **1–5** would already make IronFlow feel more robust and predictable; **6–9** deepen planning and tracking without a large redesign.
