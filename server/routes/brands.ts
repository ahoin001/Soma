import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { query } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const brandSchema = z.object({
  name: z.string().min(1),
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

const updateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  websiteUrl: z.string().url().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  isVerified: z.boolean().optional(),
});

const isAdminUser = async (userId: string) => {
  const result = await query<{ email: string | null }>(
    "SELECT email FROM users WHERE id = $1;",
    [userId],
  );
  return result.rows[0]?.email === "ahoin001@gmail.com";
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limitRaw = typeof req.query.limit === "string" ? req.query.limit : "";
    const limit = Math.min(Math.max(Number(limitRaw || 50), 1), 200);
    const verifiedOnly =
      typeof req.query.verified === "string" ? req.query.verified !== "false" : true;

    const params: Array<string | number | boolean> = [];
    let where = "WHERE 1=1";
    if (verifiedOnly) {
      where += " AND is_verified = true";
    }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where += ` AND lower(name) LIKE $${params.length}`;
    }
    params.push(limit);

    const result = await query(
      `
      SELECT id, name, is_verified, website_url, logo_url
      FROM brands
      ${where}
      ORDER BY is_verified DESC, name ASC
      LIMIT $${params.length};
      `,
      params,
    );

    res.json({ items: result.rows });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = brandSchema.parse(req.body);
    const admin = await isAdminUser(userId);
    const result = await query(
      `
      INSERT INTO brands (name, is_verified, created_by_user_id, website_url, logo_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (normalized_name) DO UPDATE
      SET
        name = EXCLUDED.name,
        website_url = COALESCE(EXCLUDED.website_url, brands.website_url),
        logo_url = COALESCE(EXCLUDED.logo_url, brands.logo_url),
        is_verified = brands.is_verified OR EXCLUDED.is_verified
      RETURNING id, name, is_verified, website_url, logo_url;
      `,
      [
        payload.name.trim(),
        admin,
        userId,
        payload.websiteUrl ?? null,
        payload.logoUrl ?? null,
      ],
    );
    res.status(201).json({ brand: result.rows[0] });
  }),
);

router.patch(
  "/:brandId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const admin = await isAdminUser(userId);
    if (!admin) {
      const error = new Error("Not authorized.");
      (error as Error & { status?: number }).status = 403;
      throw error;
    }
    const payload = updateBrandSchema.parse(req.body);
    const result = await query(
      `
      UPDATE brands
      SET
        name = COALESCE($2, name),
        website_url = COALESCE($3, website_url),
        logo_url = COALESCE($4, logo_url),
        is_verified = COALESCE($5, is_verified),
        updated_at = now()
      WHERE id = $1
      RETURNING id, name, is_verified, website_url, logo_url;
      `,
      [
        req.params.brandId,
        payload.name ?? null,
        payload.websiteUrl ?? null,
        payload.logoUrl ?? null,
        payload.isVerified ?? null,
      ],
    );
    res.json({ brand: result.rows[0] ?? null });
  }),
);

router.get(
  "/logo/signature",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const admin = await isAdminUser(userId);
    if (!admin) {
      const error = new Error("Not authorized.");
      (error as Error & { status?: number }).status = 403;
      throw error;
    }
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? null;
    if (!cloudName || !apiKey || !apiSecret) {
      const error = new Error("Cloudinary credentials are not configured.");
      (error as Error & { status?: number }).status = 500;
      throw error;
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const params: string[] = [`timestamp=${timestamp}`];
    if (uploadPreset) params.push(`upload_preset=${uploadPreset}`);
    const signature = crypto
      .createHash("sha1")
      .update(`${params.join("&")}${apiSecret}`)
      .digest("hex");
    res.json({ timestamp, signature, apiKey, cloudName, uploadPreset });
  }),
);

export default router;
