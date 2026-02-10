# AuraFit deployment guide

This app can run in two ways. You only need **one** of these for production.

---

## Option A: Single deployment on Vercel (recommended)

**What runs where**

| Part | Where it runs |
|------|----------------|
| Frontend (React/Vite) | Vercel static hosting (from `vite build`) |
| API (Express) | Vercel **serverless functions** via `api/[...path].ts` |

There is no separate “Express deployment.” The same Express app in `server/app.ts` is imported by `api/[...path].ts` and runs as a serverless function on Vercel. Every request to `https://your-app.vercel.app/api/*` is handled by that function.

**Steps**

1. **Connect repo**  
   Vercel → New Project → Import your Git repo (e.g. GitHub).

2. **Build settings**
   - **Framework Preset:** Vite  
   - **Build Command:** `pnpm run build` (or `npm run build`)  
   - **Output Directory:** `dist`  
   - **Install Command:** `pnpm install` (or `npm install`)  
   - **Root Directory:** leave blank (repo root)

3. **Environment variables** (Vercel → Project → Settings → Environment Variables)  
   Add for **Production** (and **Preview** if you use preview deployments):

   | Variable | Required | Notes |
   |----------|----------|--------|
   | `DATABASE_URL` | Yes | PostgreSQL URL (e.g. Neon). Needed for plans, workouts, auth, nutrition, **and exercise media**. |
   | `CLOUDINARY_CLOUD_NAME` | For uploads | Image/video uploads (exercise media, etc.). |
   | `CLOUDINARY_API_KEY` | For uploads | |
   | `CLOUDINARY_API_SECRET` | Optional | If omitted, use unsigned upload preset. |
   | `CLOUDINARY_UPLOAD_PRESET` | For uploads | |
   | `CORS_ORIGIN` | Optional | Comma‑separated origins, or leave empty to allow all (and `*.vercel.app`). |
   | `VITE_API_BASE_URL` | No | Leave **empty** so the frontend calls the same origin (`/api/...`). |

   Do **not** set `VITE_API_BASE_URL` if the frontend and API are on the same Vercel URL. The app uses relative `/api/...` URLs, so the same domain serves both.

4. **Redeploy**  
   After saving env vars, trigger a new deployment (Deployments → ⋮ → Redeploy).

**Why exercise media can 404 here**

- `DATABASE_URL` not set or wrong → DB queries (including exercise media) fail or never run.  
- API route not hit → If `/api/workouts/exercise-media` returns 404, the request may not be reaching the serverless function. A `vercel.json` that rewrites `/api/*` to the function fixes that (see repo root `vercel.json` if present).  
- Function crash → Check Vercel → Logs / Functions → select the API function and reproduce the request; the stack trace will show the real error.

---

## Option B: Frontend on Vercel + API on Render

Use this only if you intentionally run the API as a long‑running server on Render.

**What runs where**

| Part | Where it runs |
|------|----------------|
| Frontend | Vercel (static from `vite build`) |
| API | Render “Web Service” running `node server/index.js` (or `tsx server/index.ts`) |

**Render (API)**

1. New → Web Service → Connect same repo.  
2. Build: e.g. `npm install` or `pnpm install`.  
3. Start: e.g. `node server/index.js` (you must build the server to JS) or `npx tsx server/index.ts`.  
4. Set env vars on Render (same as in `.env.example`, especially `DATABASE_URL`, `PORT`).  
5. Note the Render URL, e.g. `https://your-api.onrender.com`.

**Vercel (frontend only)**

1. Build as in Option A.  
2. **Important:** set **`VITE_API_BASE_URL`** to your Render API URL with no trailing slash, e.g. `https://your-api.onrender.com`.  
3. Do **not** deploy `api/[...path].ts` as the main API (or disable it); all API traffic should go to Render.

In this setup, **every** API call (including exercise media) goes to Render. If exercise media fails, the problem is on Render (route, DB, or env), not Vercel.

---

## How to confirm which setup you have

1. **Where does the frontend live?**  
   Open your app in the browser; the URL is your frontend origin (e.g. `https://aurafit-omega.vercel.app`).

2. **Where do API calls go?**  
   - If `VITE_API_BASE_URL` is **empty**: API calls are to the **same origin** (e.g. `https://aurafit-omega.vercel.app/api/...`). So the API is on **Vercel** (Option A).  
   - If `VITE_API_BASE_URL` is set (e.g. to a Render URL): API calls go to **that** host. So the API is on **Render** (Option B).

3. **Exercise media only**  
   - Same origin (Option A): Ensure `DATABASE_URL` is set on Vercel, that `vercel.json` sends `/api/*` to the serverless function, and check Vercel function logs for the exact error.  
   - Separate API (Option B): Ensure `DATABASE_URL` (and Cloudinary if you use it) are set on **Render** and check Render logs for `/api/workouts/exercise-media` requests.

---

## Quick checklist (Option A – all on Vercel)

- [ ] `DATABASE_URL` set in Vercel (Production + Preview if needed).  
- [ ] `VITE_API_BASE_URL` **not** set (so `/api` is same origin).  
- [ ] `vercel.json` rewrites `/api/(.*)` to the API function (if your repo has it).  
- [ ] Redeploy after changing env vars.  
- [ ] Test `https://your-app.vercel.app/api/health` → should return `{"ok":true,"service":"aurafit-api"}`.  
- [ ] If exercise media still 404/500: open Vercel → Logs, reproduce the request, and use the stack trace to fix the failing code or env.
