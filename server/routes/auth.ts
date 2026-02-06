import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Request, Response } from "express";
import { queryOne, withTransaction } from "../db";
import { asyncHandler } from "../utils";

const router = Router();

const SESSION_COOKIE = "aurafit_session";
const SESSION_DAYS = 30;
const RESET_TOKEN_HOURS = 2;
const VERIFY_TOKEN_DAYS = 7;
const shouldReturnToken =
  process.env.AUTH_DEV_TOKENS === "true" || process.env.NODE_ENV !== "production";
const cookieSameSite = (process.env.COOKIE_SAMESITE ?? "lax") as "lax" | "none" | "strict";
const cookieSecure = process.env.NODE_ENV === "production" || cookieSameSite === "none";

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const issueToken = async (
  table: "user_password_reset_tokens" | "user_email_verification_tokens",
  userId: string,
  expiresAt: Date,
) => {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  await withTransaction((client) =>
    client.query(
      `
      INSERT INTO ${table} (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3);
      `,
      [userId, tokenHash, expiresAt],
    ),
  );
  return token;
};

const createSession = async (userId: string, req: Request, res: Response): Promise<string> => {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await withTransaction((client) =>
    client.query(
      `
      INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
      VALUES ($1, $2, $3, $4, $5);
      `,
      [
        userId,
        tokenHash,
        expiresAt,
        req.header("user-agent") ?? null,
        req.ip ?? null,
      ],
    ),
  );

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: cookieSameSite,
    secure: cookieSecure,
    expires: expiresAt,
    path: "/",
  });
  return token;
};

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).optional(),
});

const emailSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(20),
  newPassword: z.string().min(8),
});

const verifySchema = z.object({
  token: z.string().min(20),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const payload = authSchema.parse(req.body);
    const existing = await queryOne<{ user_id: string }>(
      "SELECT user_id FROM user_auth_local WHERE email = $1;",
      [payload.email.toLowerCase()],
    );
    if (existing) {
      res.status(409).json({ error: "Email already registered." });
      return;
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const result = await withTransaction(async (client) => {
      const user = await client.query(
        `
        INSERT INTO users (email)
        VALUES ($1)
        RETURNING id;
        `,
        [payload.email.toLowerCase()],
      );

      const userId = user.rows[0].id as string;
      await client.query(
        `
        INSERT INTO user_auth_local (user_id, email, password_hash)
        VALUES ($1, $2, $3);
        `,
        [userId, payload.email.toLowerCase(), passwordHash],
      );

      if (payload.displayName) {
        await client.query(
          `
          INSERT INTO user_profiles (user_id, display_name)
          VALUES ($1, $2)
          ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;
          `,
          [userId, payload.displayName],
        );
      }

      return userId;
    });

    const verifyToken = await issueToken(
      "user_email_verification_tokens",
      result,
      new Date(Date.now() + VERIFY_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    );

    const sessionToken = await createSession(result, req, res);
    res.json({
      user: { id: result },
      ...(cookieSameSite === "none" ? { sessionToken } : {}),
      ...(shouldReturnToken ? { verificationToken: verifyToken } : {}),
    });
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = authSchema.pick({ email: true, password: true }).parse(req.body);
    const record = await queryOne<{
      user_id: string;
      password_hash: string;
      email_verified_at: string | null;
    }>(
      "SELECT user_id, password_hash, email_verified_at FROM user_auth_local WHERE email = $1;",
      [payload.email.toLowerCase()],
    );
    if (!record) {
      res.status(401).json({ error: "No account found with this email.", code: "EMAIL_NOT_FOUND" });
      return;
    }

    const matches = await bcrypt.compare(payload.password, record.password_hash);
    if (!matches) {
      res.status(401).json({ error: "Incorrect password. Please try again.", code: "INVALID_PASSWORD" });
      return;
    }

    const sessionToken = await createSession(record.user_id, req, res);
    res.json({
      user: { id: record.user_id, emailVerified: Boolean(record.email_verified_at) },
      ...(cookieSameSite === "none" ? { sessionToken } : {}),
    });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const cookieToken = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const bearerToken = req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    const token = cookieToken ?? bearerToken;
    if (token) {
      const tokenHash = hashToken(token);
      await withTransaction((client) =>
        client.query("DELETE FROM user_sessions WHERE token_hash = $1;", [tokenHash]),
      );
    }
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  }),
);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = (req as Request & { userId?: string }).userId;
    if (!userId) {
      res.status(401).json({ user: null });
      return;
    }
    const profile = await queryOne<{ email: string; email_verified_at: string | null }>(
      "SELECT email, email_verified_at FROM user_auth_local WHERE user_id = $1;",
      [userId],
    );
    res.json({
      user: {
        id: userId,
        email: profile?.email ?? null,
        emailVerified: Boolean(profile?.email_verified_at),
      },
    });
  }),
);

router.post(
  "/request-password-reset",
  asyncHandler(async (req, res) => {
    const payload = emailSchema.parse(req.body);
    const record = await queryOne<{ user_id: string }>(
      "SELECT user_id FROM user_auth_local WHERE email = $1;",
      [payload.email.toLowerCase()],
    );
    if (!record) {
      res.json({ ok: true });
      return;
    }
    const resetToken = await issueToken(
      "user_password_reset_tokens",
      record.user_id,
      new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000),
    );
    res.json({ ok: true, ...(shouldReturnToken ? { resetToken } : {}) });
  }),
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const payload = resetSchema.parse(req.body);
    const tokenHash = hashToken(payload.token);
    const record = await queryOne<{
      user_id: string;
      id: string;
    }>(
      `
      SELECT user_id, id
      FROM user_password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now();
      `,
      [tokenHash],
    );
    if (!record) {
      res.status(400).json({ error: "Reset token invalid or expired." });
      return;
    }
    const passwordHash = await bcrypt.hash(payload.newPassword, 12);
    await withTransaction(async (client) => {
      await client.query(
        "UPDATE user_auth_local SET password_hash = $1 WHERE user_id = $2;",
        [passwordHash, record.user_id],
      );
      await client.query(
        "UPDATE user_password_reset_tokens SET used_at = now() WHERE id = $1;",
        [record.id],
      );
      await client.query("DELETE FROM user_sessions WHERE user_id = $1;", [
        record.user_id,
      ]);
    });
    res.json({ ok: true });
  }),
);

router.post(
  "/request-email-verification",
  asyncHandler(async (req, res) => {
    const userId = (req as Request & { userId?: string }).userId ?? null;
    const emailPayload = req.body?.email ? emailSchema.parse(req.body) : null;
    const record =
      userId
        ? await queryOne<{ user_id: string }>(
            "SELECT user_id FROM user_auth_local WHERE user_id = $1;",
            [userId],
          )
        : emailPayload
          ? await queryOne<{ user_id: string }>(
              "SELECT user_id FROM user_auth_local WHERE email = $1;",
              [emailPayload.email.toLowerCase()],
            )
          : null;
    if (!record) {
      res.json({ ok: true });
      return;
    }
    const verifyToken = await issueToken(
      "user_email_verification_tokens",
      record.user_id,
      new Date(Date.now() + VERIFY_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    );
    res.json({ ok: true, ...(shouldReturnToken ? { verificationToken: verifyToken } : {}) });
  }),
);

router.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const payload = verifySchema.parse(req.body);
    const tokenHash = hashToken(payload.token);
    const record = await queryOne<{
      user_id: string;
      id: string;
    }>(
      `
      SELECT user_id, id
      FROM user_email_verification_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now();
      `,
      [tokenHash],
    );
    if (!record) {
      res.status(400).json({ error: "Verification token invalid or expired." });
      return;
    }
    await withTransaction(async (client) => {
      await client.query(
        "UPDATE user_auth_local SET email_verified_at = now() WHERE user_id = $1;",
        [record.user_id],
      );
      await client.query(
        "UPDATE user_email_verification_tokens SET used_at = now() WHERE id = $1;",
        [record.id],
      );
    });
    res.json({ ok: true });
  }),
);

export default router;
