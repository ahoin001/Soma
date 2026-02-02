import { Router } from "express";
import { z } from "zod";
import { withTransaction } from "../db";
import { asyncHandler } from "../utils";

const router = Router();

const ensureUserSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().min(1).optional(),
});

router.post(
  "/ensure",
  asyncHandler(async (req, res) => {
    const payload = ensureUserSchema.parse(req.body);
    const displayName = payload.displayName ?? "You";

    const result = await withTransaction(async (client) => {
      const user = await client.query(
        `
        INSERT INTO users (id, auth_provider, auth_subject)
        VALUES ($1, 'local', $1)
        ON CONFLICT (id) DO UPDATE SET updated_at = now()
        RETURNING *;
        `,
        [payload.userId],
      );

      await client.query(
        `
        INSERT INTO user_profiles (user_id, display_name)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;
        `,
        [payload.userId, displayName],
      );

      return user.rows[0];
    });

    res.json({ user: result });
  }),
);

export default router;
import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const bootstrapSchema = z.object({
  email: z.string().email().optional(),
});

router.post(
  "/bootstrap",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = bootstrapSchema.safeParse(req.body);
    const email = payload.success ? payload.data.email ?? null : null;

    await query(
      `
      INSERT INTO users (id, email)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING;
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

export default router;
