import { query, withTransaction } from "./db";

const WGER_BASE_URL = "https://wger.de/api/v2";
const PAGE_LIMIT = 50;
const MAX_PAGES = 4;

type WgerExercise = {
  id: number;
  name: string;
  description?: string;
  category?: { name?: string } | null;
};

const cleanDescription = (value: string) =>
  value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const fetchPage = async (page: number) => {
  const params = new URLSearchParams({
    language: "2",
    status: "2",
    limit: String(PAGE_LIMIT),
    offset: String(page * PAGE_LIMIT),
  });
  const response = await fetch(`${WGER_BASE_URL}/exercise/?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Exercise API request failed.");
  }
  const data = (await response.json()) as { results?: WgerExercise[] };
  return data.results ?? [];
};

const run = async () => {
  let total = 0;
  await withTransaction(async (client) => {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const results = await fetchPage(page);
      if (!results.length) break;
      for (const item of results) {
        await client.query(
          `
          INSERT INTO exercises (id, name, description, category, equipment, muscles)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            equipment = EXCLUDED.equipment,
            muscles = EXCLUDED.muscles,
            updated_at = now();
          `,
          [
            item.id,
            item.name,
            cleanDescription(item.description ?? ""),
            item.category?.name ?? "General",
            [],
            [],
          ],
        );
      }
      total += results.length;
    }
  });

  const count = await query<{ count: string }>("SELECT COUNT(*)::text AS count FROM exercises;");
  console.log(`Seeded ${total} exercises. Total in DB: ${count.rows[0]?.count ?? "0"}`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
