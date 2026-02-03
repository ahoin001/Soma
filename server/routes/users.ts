import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const ensureSchema = z.object({
  email: z.string().email().optional(),
});

const profileSchema = z.object({
  displayName: z.string().min(1),
  sex: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  heightCm: z.number().optional().nullable(),
  units: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
});

router.post(
  "/ensure",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = ensureSchema.safeParse(req.body);
    const email = payload.success ? payload.data.email ?? null : null;

    await query(
      `
      INSERT INTO users (id, email)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE SET updated_at = now();
      `,
      [userId, email],
    );

    const result = await query(
      "SELECT id, email, created_at FROM users WHERE id = $1;",
      [userId],
    );

    res.json({ user: result.rows[0] });
  }),
);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await query(
      "SELECT id, email, created_at FROM users WHERE id = $1;",
      [userId],
    );
    res.json({ user: result.rows[0] ?? null });
  }),
);

router.post(
  "/profile",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = profileSchema.parse(req.body);

    await query(
      `
      INSERT INTO user_profiles (
        user_id,
        display_name,
        sex,
        dob,
        height_cm,
        units,
        timezone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        sex = EXCLUDED.sex,
        dob = EXCLUDED.dob,
        height_cm = EXCLUDED.height_cm,
        units = EXCLUDED.units,
        timezone = EXCLUDED.timezone,
        updated_at = now();
      `,
      [
        userId,
        payload.displayName,
        payload.sex ?? null,
        payload.dob ?? null,
        payload.heightCm ?? null,
        payload.units ?? null,
        payload.timezone ?? null,
      ],
    );

    res.json({ profile: { user_id: userId } });
  }),
);

export default router;
