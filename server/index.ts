import "dotenv/config";
import express from "express";
import cors from "cors";
import foodsRouter from "./routes/foods";
import groceriesRouter from "./routes/groceries";
import mealEntriesRouter from "./routes/meal-entries";
import mealTypesRouter from "./routes/meal-types";
import workoutsRouter from "./routes/workouts";
import sessionsRouter from "./routes/sessions";
import trackingRouter from "./routes/tracking";
import usersRouter from "./routes/users";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "aurafit-api" });
});

app.use("/api/foods", foodsRouter);
app.use("/api/groceries", groceriesRouter);
app.use("/api/meal-types", mealTypesRouter);
app.use("/api/meal-entries", mealEntriesRouter);
app.use("/api/workouts", workoutsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/tracking", trackingRouter);
app.use("/api/users", usersRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const error = err as Error & { status?: number };
  res.status(error.status ?? 500).json({
    error: error.message ?? "Unexpected server error.",
  });
});

const port = Number(process.env.PORT ?? 8787);

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
