/**
 * Migrate existing users from user_auth_local to Supabase Auth (auth.users).
 * Run with: npx tsx scripts/migrate-users-to-supabase-auth.ts
 *
 * Requires:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Database has user_auth_local and public.users populated
 *
 * This script uses Supabase Admin API to create auth.users entries with the
 * SAME id as public.users, so all existing FKs continue to work.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseServiceKey || !databaseUrl) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const pool = new Pool({ connectionString: databaseUrl });

async function migrate() {
  const result = await pool.query(
    `
    SELECT u.id, ual.email, ual.password_hash
    FROM public.users u
    JOIN user_auth_local ual ON ual.user_id = u.id
    ORDER BY u.created_at ASC;
    `
  );

  const users = result.rows as { id: string; email: string; password_hash: string }[];
  console.log(`Found ${users.length} users to migrate`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    try {
      // Supabase Admin API: create user with explicit id (preserves public.users.id) and bcrypt password_hash
      const { data, error } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password_hash: user.password_hash,
        email_confirm: true,
        user_metadata: { migrated: true },
      });

      if (error) {
        if (error.message?.includes("already been registered") || error.code === "user_already_exists") {
          skipped++;
          console.log(`  Skip (exists): ${user.email}`);
        } else {
          errors++;
          console.error(`  Error for ${user.email}:`, error.message);
        }
        continue;
      }

      if (data?.user?.id !== user.id) {
        console.warn(`  User ${user.email}: expected id ${user.id}, got ${data?.user?.id}`);
      }
      created++;
      console.log(`  Created: ${user.email}`);
    } catch (err) {
      errors++;
      console.error(`  Error for ${user.email}:`, err);
    }
  }

  await pool.end();
  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
