# AuraFit deployment guide

**Recommended setup (free):** Frontend on **Vercel**, API on **Render**. No pay-per-request; Render free tier runs your API 24/7 (with spin-down when idle).

---

## Recommended: Vercel (frontend) + Render (API)

### What runs where

| Part | Where | Cost |
|------|--------|------|
| Frontend (React/Vite) | Vercel | Free tier |
| API (Express) | Render Web Service | Free tier (no per-request charge) |

### Step 1: Deploy API on Render

1. Go to [Render](https://render.com) → Dashboard → **New** → **Web Service**.
2. Connect your Git repo (same repo as Vercel).
3. **Settings:**
   - **Name:** e.g. `aurafit-api`
   - **Region:** pick one
   - **Branch:** `main` (or your default)
   - **Runtime:** Node
   - **Build Command:** `pnpm install`
   - **Start Command:** `pnpm run start:server`
   - **Plan:** Free
4. **Environment** (Render → your service → Environment):
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = your PostgreSQL URL (e.g. Neon)
   - `CORS_ORIGIN` = your Vercel frontend URL, e.g. `https://aurafit-omega.vercel.app` (or leave empty to allow all; we also allow `*.vercel.app`)
   - Optional: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET` for exercise/food image uploads
5. **Create Web Service.** Wait for the first deploy.
6. Copy the service URL, e.g. `https://aurafit-api.onrender.com` (no trailing slash).

**Optional:** If your repo has a `render.yaml` at the root, you can use **New** → **Blueprint** and connect the repo; Render will create the service from the spec. Then add env vars in the dashboard.

### Step 2: Deploy frontend on Vercel (pointing at Render)

1. Vercel → your project → **Settings** → **Environment Variables**.
2. Add (for **Production** and **Preview** if you use previews):
   - **`VITE_API_BASE_URL`** = your Render API URL, e.g. `https://aurafit-api.onrender.com`  
     (no trailing slash; this is required so the frontend calls Render instead of Vercel `/api`.)
3. Remove or leave unset any `DATABASE_URL` / Cloudinary vars on **Vercel** if you only want them on Render (the API runs on Render, so it reads env from Render).
4. **Redeploy** the frontend (Deployments → ⋮ → Redeploy) so the new `VITE_API_BASE_URL` is baked into the build.

### Step 3: Verify

- Open your app: `https://your-app.vercel.app`
- Check **Network** tab: API requests should go to `https://your-api.onrender.com/api/...`
- Test: `https://your-api.onrender.com/api/health` → `{"ok":true,"service":"aurafit-api"}`

**Render free tier:** The service may spin down after ~15 min idle; the first request after that can take 30–60 s. After that it’s responsive until the next idle period.

---

## Alternative: All on Vercel (serverless API)

Frontend and API both on Vercel. API runs as a serverless function (`api/[...path].ts`). Pay-per-invocation on paid plans; free tier has limits.

| Part | Where |
|------|--------|
| Frontend | Vercel static |
| API | Vercel serverless function |

- **Build:** Same as above (Vite, build command `pnpm run build`, output `dist`).
- **Env on Vercel:** `DATABASE_URL`, Cloudinary vars, etc. **Leave `VITE_API_BASE_URL` empty** so the app uses same-origin `/api/...`.
- **Routing:** Repo includes `vercel.json` so `/api/*` is handled by the serverless function.

Use this if you prefer a single platform or don’t want to manage Render; be aware of serverless cold starts and execution limits.

---

## Quick checklist (Vercel + Render)

- [ ] Render: Web Service created, **Start Command** = `pnpm run start:server`
- [ ] Render: `DATABASE_URL` and (optional) Cloudinary vars set
- [ ] Render: `CORS_ORIGIN` = your Vercel URL, or leave empty
- [ ] Vercel: `VITE_API_BASE_URL` = Render API URL (no trailing slash)
- [ ] Vercel: Redeploy after setting `VITE_API_BASE_URL`
- [ ] Test `https://your-api.onrender.com/api/health` and exercise media from the app
