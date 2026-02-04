# AuraFit

## Deployment (free-friendly)

Recommended setup:
- **Frontend:** Vercel
- **Backend (API):** Render
- **Database:** Neon Postgres

### 1) Create a Neon database
- Create a free Neon project and copy the **connection string**.
- Run migrations on your local machine:
  - `pnpm install`
  - `pnpm migrate`

### 2) Deploy the API to Render
Create a new **Web Service** from this repo:
- **Build command:** `pnpm install`
- **Start command:** `pnpm dev:server`

Set environment variables in Render:
- `DATABASE_URL` (from Neon)
- `CORS_ORIGIN` = `https://<your-vercel-domain>`
- `COOKIE_SAMESITE` = `none`
- `AUTH_DEV_TOKENS` = `false`
- Optional:
  - `USDA_API_KEY`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - `CLOUDINARY_UPLOAD_PRESET`

### 3) Deploy the frontend to Vercel
Create a new Vercel project from this repo:
- **Framework:** Vite
- **Build command:** `pnpm build`
- **Output directory:** `dist`

Set environment variables in Vercel:
- `VITE_API_BASE_URL` = `https://<your-render-service>.onrender.com`

### 4) Test
- Visit the Vercel URL and make sure API calls work.
- If login fails, confirm `CORS_ORIGIN` and `COOKIE_SAMESITE=none` are set in Render.
