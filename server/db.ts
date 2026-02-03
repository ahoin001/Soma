import dotenv from "dotenv";
import { Pool, type PoolClient, type QueryResult } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.");
}

export const pool = new Pool({
  connectionString,
  max: 10,
});

export const query = <T = unknown>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> => pool.query(text, params);

export const queryOne = async <T = unknown>(text: string, params?: unknown[]) => {
  const result = await pool.query<T>(text, params);
  return result.rows[0] ?? null;
};

export const withTransaction = async <T>(
  handler: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
