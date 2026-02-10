import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import cookieParser from "cookie-parser";
import cors from "cors";
import foodsRouter from "./routes/foods.js";
import groceriesRouter from "./routes/groceries.js";
import mealEntriesRouter from "./routes/meal-entries.js";
import mealTypesRouter from "./routes/meal-types.js";
import nutritionRouter from "./routes/nutrition.js";
import exercisesRouter from "./routes/exercises.js";
import fitnessRouter from "./routes/fitness.js";
import analyticsRouter from "./routes/analytics.js";
import authRouter from "./routes/auth.js";
import brandsRouter from "./routes/brands.js";
import { queryOne } from "./db.js";
import workoutsRouter from "./routes/workouts.js";
import sessionsRouter from "./routes/sessions.js";
import trackingRouter from "./routes/tracking.js";
import usersRouter from "./routes/users.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

if (process.env.TRUST_PROXY === "true" || isProduction) {
  app.set("trust proxy", 1);
}

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // Allow any Vercel deployment (*.vercel.app) so preview URLs work without updating CORS_ORIGIN
      if (origin.endsWith(".vercel.app")) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS."));
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

app.use(async (req, _res, next) => {
  const cookieToken = req.cookies?.aurafit_session as string | undefined;
  const bearerToken = req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  const token = cookieToken ?? bearerToken;
  if (!token) {
    next();
    return;
  }
  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  const session = await queryOne<{ user_id: string }>(
    `
    SELECT user_id
    FROM user_sessions
    WHERE token_hash = $1 AND expires_at > now();
    `,
    [tokenHash],
  );
  if (session) {
    (req as typeof req & { userId?: string }).userId = session.user_id;
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "aurafit-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/foods", foodsRouter);
app.use("/api/brands", brandsRouter);
app.use("/api/groceries", groceriesRouter);
app.use("/api/meal-types", mealTypesRouter);
app.use("/api/meal-entries", mealEntriesRouter);
app.use("/api/nutrition", nutritionRouter);
app.use("/api/exercises", exercisesRouter);
app.use("/api/fitness", fitnessRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/workouts", workoutsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/tracking", trackingRouter);
app.use("/api/users", usersRouter);

app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const error = err as Error & { status?: number };
    res.status(error.status ?? 500).json({
      error: error.message ?? "Unexpected server error.",
    });
  },
);

export default app;
