import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, withTransaction } from "./db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(__dirname, "..", "migrations");

const ensureMigrationsTable = async () => {
  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
    `,
  );
};

const getApplied = async () => {
  const result = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations ORDER BY filename ASC;",
  );
  return new Set(result.rows.map((row) => row.filename));
};

const listMigrationFiles = async () => {
  const files = await readdir(migrationsDir);
  return files.filter((file) => file.endsWith(".sql")).sort();
};

const applyMigration = async (filename: string) => {
  const filePath = path.join(migrationsDir, filename);
  const sql = await readFile(filePath, "utf-8");
  await withTransaction(async (client) => {
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1);",
      [filename],
    );
  });
};

const run = async () => {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files = await listMigrationFiles();
  const pending = files.filter((file) => !applied.has(file));

  if (!pending.length) {
    console.log("No pending migrations.");
    return;
  }

  for (const filename of pending) {
    console.log(`Applying ${filename}...`);
    await applyMigration(filename);
  }

  console.log("Migrations complete.");
};

run()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
