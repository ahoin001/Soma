# Theming & Design System — Current Setup and How to Add Themes

This doc describes how the app is set up for theming (color palettes, dark mode) and what’s missing or inconsistent.

---

## What’s Already in Place

### 1. **Tailwind: class-based dark mode**

- **`tailwind.config.ts`**: `darkMode: ["class"]` — dark mode is driven by a `.dark` class on the root (e.g. `<html>`), not `prefers-color-scheme`.
- To enable dark mode you would add/remove `document.documentElement.classList.add("dark")` / `remove("dark")` (or use a provider like `next-themes`).

### 2. **Semantic design tokens (CSS variables)**

- **`src/globals.css`** defines semantic tokens under `:root` and `.dark`:
  - `--background`, `--foreground`
  - `--primary`, `--primary-foreground`
  - `--secondary`, `--muted`, `--accent`, `--card`, `--popover`
  - `--border`, `--input`, `--ring`
  - `--destructive`, sidebar tokens, `--radius`
- Tailwind is wired to these via `theme.extend.colors` in `tailwind.config.ts`, e.g.:
  - `background: "hsl(var(--background))"`
  - `primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" }`
- **Any component that uses these semantic utilities** (e.g. `bg-background`, `text-foreground`, `bg-primary`, `border-border`, `text-muted-foreground`) will automatically follow whatever palette is set in CSS (including `.dark`).

So the **design system is theme-ready** for any token that is defined in CSS variables and referenced only through these semantic Tailwind names.

### 3. **Experience-based “themes” (nutrition vs fitness)**

- The app already has two visual modes implemented as **root-level class overrides** in `globals.css`:
  - **`.experience-nutrition`**: light, emerald-tinted (e.g. `--primary: 144 68% 55%`).
  - **`.experience-fitness`**: dark slate + teal (e.g. `--background: 222 24% 10%`, `--primary: 170 90% 52%`).
- **`App.tsx`** switches them by route:  
  `document.documentElement.classList.add("experience-nutrition" | "experience-fitness")`.
- This proves the pattern works: **one set of semantic tokens, multiple palettes by swapping classes and redefining the same variables.**

### 4. **Dependencies**

- **`next-themes`** is in `package.json` but **not used** (no `ThemeProvider`, no `useTheme()`). It could be used to add a light/dark/system toggle and persist preference.

---

## What’s Not Theme-Ready (Inconsistencies)

### 1. **`.dark` is never applied**

- `.dark { ... }` exists in `globals.css` with a full dark palette, but **nothing in the app adds or removes the `dark` class** on `<html>`.
- So “dark mode” is **defined but never activated**. To use it you’d need either:
  - A theme provider (e.g. `next-themes`) that toggles `class="dark"` on the root, or
  - Your own logic (e.g. settings + `document.documentElement.classList.add/remove("dark")`).

### 2. **Hardcoded Tailwind colors**

- Many components use **raw color names** instead of semantic tokens, e.g.:
  - `emerald-50`, `emerald-500`, `emerald-700`, `emerald-950`
  - `slate-400`, `slate-600`, `slate-800`, `slate-900`
  - `bg-aura-primary`, `text-aura-primary`
- **`tailwind.config.ts`** also defines a fixed **`aura`** palette (e.g. `aura.primary: "#4ADE80"`) that does **not** use CSS variables, so it won’t change with `.dark` or a new palette.
- **Impact:** Those screens and components will **not** respond to a global theme or dark mode until they are refactored to use semantic tokens (e.g. `bg-primary`, `text-muted-foreground`, or new tokens you add).

### 3. **Toasts and a few UI bits**

- **Sonner** is forced to `theme="light"` in `src/components/ui/sonner.tsx`; for true theming it should respect the active theme (e.g. pass `theme={resolvedTheme}` from a theme context).

---

## Summary Table

| Area                         | Theme-ready? | Notes                                                                 |
|-----------------------------|-------------|-----------------------------------------------------------------------|
| Tailwind `darkMode`         | Yes         | `darkMode: ["class"]`; add `.dark` on root to activate.              |
| Semantic tokens in CSS     | Yes         | `:root` and `.dark` (and experience classes) define full palettes.   |
| Components using tokens    | Yes         | Anything using `bg-background`, `text-foreground`, `primary`, etc.   |
| Experience switching       | Yes         | Nutrition vs fitness already swap palettes via root class.           |
| Dark mode actually used    | No          | `.dark` is never applied; no provider or toggle.                     |
| next-themes                | No          | Installed but unused.                                                |
| Hardcoded emerald/slate/aura| No          | Many files use raw colors; aura in config is fixed hex.              |
| Sonner                     | No          | Stuck to `theme="light"`.                                            |

---

## How to Add Real Dark Mode and Multiple Palettes

### Option A — Minimal: system or manual dark mode

1. **Use `next-themes`** (already installed):
   - Wrap the app in `<ThemeProvider attribute="class" defaultTheme="system" storageKey="aurafit-theme">` (or your preferred key).
   - Root element will get `class="dark"` when the resolved theme is dark (system or user override).
2. **Persist choice**: `next-themes` can store in `localStorage` so the user’s light/dark choice is remembered.
3. **Sonner**: Pass the resolved theme into the Toaster so toasts match (e.g. `theme={resolvedTheme}`).
4. **Optional**: Add a small “Dark mode” toggle in settings that calls `setTheme("dark" | "light" | "system")`.

No need to change CSS variable definitions; your existing `.dark` block in `globals.css` will apply whenever `.dark` is on the root.

### Option B — Multiple color palettes (e.g. “green”, “blue”, “purple”)

1. **Keep one set of semantic names** (`--primary`, `--background`, etc.).
2. **Add more root classes** (e.g. `.theme-emerald`, `.theme-ocean`, `.theme-violet`) and in each class redefine the same variables with different HSL values.
3. **Store the user’s palette choice** (e.g. in UserContext or localStorage) and apply the chosen class to `<html>` (or a wrapper) in addition to `experience-*` and optional `.dark`.
4. **Order of precedence**: If you support both “light/dark” and “palette”, you can do:
   - Default: `experience-nutrition` or `experience-fitness` (as now).
   - Plus: `dark` for dark mode.
   - Plus: `theme-ocean` (or similar) to override primary/accent only.
   You may need to combine classes (e.g. `.dark.theme-ocean`) and define overrides for each combination in CSS, or use a single combined class (e.g. `theme-dark-ocean`) that sets all variables for that case.

### Option C — Make the whole app token-driven (best long-term)

1. **Replace hardcoded colors** in components with semantic utilities:
   - `bg-emerald-500` → `bg-primary` (or a new token like `bg-brand` if you want to separate “brand” from “primary”).
   - `text-slate-600` → `text-muted-foreground`.
   - `border-slate-200` → `border-border`.
2. **Move `aura` into CSS variables** (e.g. `--aura-primary`, `--aura-surface`) and point Tailwind’s `aura` config at `hsl(var(--aura-primary))` etc., so the aura palette also responds to `.dark` and any theme class.
3. **Add a small “design tokens” section** in your design system doc or Storybook listing:
   - Token name → Tailwind class → usage (e.g. “Primary buttons, links”).
4. **Lint or review** to discourage raw `emerald-*` / `slate-*` in new code; prefer semantic tokens so new screens automatically support themes and dark mode.

---

## Quick reference: where colors live

| Purpose              | Current definition                          | Theme-ready? |
|----------------------|---------------------------------------------|--------------|
| Page background      | `--background` → `bg-background`            | Yes          |
| Text                 | `--foreground` → `text-foreground`          | Yes          |
| Primary (buttons etc)| `--primary` → `bg-primary`                  | Yes          |
| Muted text           | `--muted-foreground` → `text-muted-foreground` | Yes       |
| Borders              | `--border` → `border-border`                | Yes          |
| Aura brand (green)   | `aura.primary` in tailwind.config (hex)     | No           |
| Experience bar       | `--theme-color-nutrition` / `_fitness` (JS) | Experience-only |
| Many cards/panels    | Raw `emerald-*`, `slate-*` in components    | No           |

To support themes and dark mode everywhere, the main work is: **apply `.dark` (and optional palette classes) from a theme provider**, then **gradually replace hardcoded colors with semantic tokens** and move **aura** (and any other fixed palettes) into CSS variables.
