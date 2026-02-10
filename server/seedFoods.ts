import "dotenv/config";
import { pool } from "./db.js";
import {
  dedupeFoodInserts,
  fetchUsdaFoods,
  upsertGlobalFoods,
} from "./services/foodProviders.js";

const staples = [
  "chicken breast",
  "eggs",
  "brown rice",
  "oats",
  "salmon",
  "greek yogurt",
  "olive oil",
  "broccoli",
  "spinach",
  "sweet potato",
  "black beans",
  "avocado",
];

const run = async () => {
  const seeded: string[] = [];
  for (const staple of staples) {
    const results = await fetchUsdaFoods(staple, 10);
    const deduped = dedupeFoodInserts(results);
    if (!deduped.length) continue;
    await upsertGlobalFoods(deduped);
    seeded.push(staple);
    console.log(`Seeded: ${staple}`);
  }
  console.log(`Seeding complete (${seeded.length} staples).`);
};

run()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
