import { createClient } from "@supabase/supabase-js";

const requiredEnv = ["VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MICRO_ALIASES = {
  fiber_g: ["fiber_g", "fiber", "dietary_fiber_g", "dietary_fiber", "dietaryFiberG", "dietaryFiber"],
  sugar_g: ["sugar_g", "sugar", "total_sugar_g", "total_sugar", "sugarG"],
  added_sugar_g: ["added_sugar_g", "added_sugar", "addedSugarG", "addedSugar"],
  sodium_mg: ["sodium_mg", "sodium", "sodiumMg"],
  potassium_mg: ["potassium_mg", "potassium", "potassiumMg"],
  cholesterol_mg: ["cholesterol_mg", "cholesterol", "cholesterolMg"],
  saturated_fat_g: ["saturated_fat_g", "saturated_fat", "saturatedFatG", "saturatedFat"],
  trans_fat_g: ["trans_fat_g", "trans_fat", "transFatG", "transFat"],
  calcium_mg: ["calcium_mg", "calcium", "calciumMg"],
  iron_mg: ["iron_mg", "iron", "ironMg"],
  magnesium_mg: ["magnesium_mg", "magnesium", "magnesiumMg"],
  zinc_mg: ["zinc_mg", "zinc", "zincMg"],
  vitamin_d_mcg: ["vitamin_d_mcg", "vitamin_d", "vitaminD", "vitaminDMcg"],
  vitamin_c_mg: ["vitamin_c_mg", "vitamin_c", "vitaminC", "vitaminCMg"],
  vitamin_a_mcg: ["vitamin_a_mcg", "vitamin_a", "vitaminA", "vitaminAMcg"],
  vitamin_b12_mcg: ["vitamin_b12_mcg", "vitamin_b12", "vitaminB12", "vitaminB12Mcg"],
  folate_mcg: ["folate_mcg", "folate", "folateMcg"],
  omega3_g: ["omega3_g", "omega3"],
  omega6_g: ["omega6_g", "omega6"],
};

const MICRO_COLUMNS = Object.keys(MICRO_ALIASES);
const SELECT_COLUMNS = ["id", "name", "micronutrients", ...MICRO_COLUMNS].join(", ");
const PAGE_SIZE = 500;

function toNumber(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function extractMicroValue(micronutrients, aliases) {
  if (!micronutrients || typeof micronutrients !== "object") return null;
  for (const alias of aliases) {
    const candidate = toNumber(micronutrients[alias]);
    if (candidate != null) return round2(candidate);
  }
  return null;
}

function isSameNumber(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) < 0.0001;
}

async function fetchAllFoods() {
  const foods = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("foods")
      .select(SELECT_COLUMNS)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to fetch foods: ${error.message}`);
    if (!data?.length) break;
    foods.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return foods;
}

async function upsertChunk(rows) {
  if (!rows.length) return;
  const { error } = await supabase.from("foods").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`Failed to upsert foods: ${error.message}`);
}

async function main() {
  console.log("Auditing foods micronutrient typed columns...");
  const foods = await fetchAllFoods();
  console.log(`Fetched ${foods.length} food rows.`);

  let rowsWithAnyMicrosInJson = 0;
  let rowsWithAnyTypedMicros = 0;
  let rowsNeedingBackfill = 0;
  let updatedFieldCount = 0;
  const updates = [];

  for (const food of foods) {
    const micronutrients = food.micronutrients ?? null;
    const hasAnyJsonMicro = MICRO_COLUMNS.some(
      (column) => extractMicroValue(micronutrients, MICRO_ALIASES[column]) != null,
    );
    if (hasAnyJsonMicro) rowsWithAnyMicrosInJson += 1;

    const hasAnyTyped = MICRO_COLUMNS.some((column) => toNumber(food[column]) != null);
    if (hasAnyTyped) rowsWithAnyTypedMicros += 1;

    const updateRow = { id: food.id };
    let changed = false;
    for (const column of MICRO_COLUMNS) {
      const derived = extractMicroValue(micronutrients, MICRO_ALIASES[column]);
      if (derived == null) continue;
      const current = toNumber(food[column]);
      if (!isSameNumber(current, derived)) {
        updateRow[column] = derived;
        changed = true;
        updatedFieldCount += 1;
      }
    }
    if (changed) {
      rowsNeedingBackfill += 1;
      updates.push(updateRow);
    }
  }

  console.log("Pre-backfill snapshot:");
  console.log(`- rows with micros in JSON: ${rowsWithAnyMicrosInJson}`);
  console.log(`- rows with any typed micro value: ${rowsWithAnyTypedMicros}`);
  console.log(`- rows needing backfill: ${rowsNeedingBackfill}`);
  console.log(`- typed fields to update: ${updatedFieldCount}`);

  for (let i = 0; i < updates.length; i += PAGE_SIZE) {
    await upsertChunk(updates.slice(i, i + PAGE_SIZE));
  }

  const foodsAfter = await fetchAllFoods();
  let rowsStillMissingTyped = 0;
  for (const food of foodsAfter) {
    const micronutrients = food.micronutrients ?? null;
    const hasAnyJsonMicro = MICRO_COLUMNS.some(
      (column) => extractMicroValue(micronutrients, MICRO_ALIASES[column]) != null,
    );
    if (!hasAnyJsonMicro) continue;
    const hasAnyTyped = MICRO_COLUMNS.some((column) => toNumber(food[column]) != null);
    if (!hasAnyTyped) rowsStillMissingTyped += 1;
  }

  console.log("Backfill complete:");
  console.log(`- rows updated: ${updates.length}`);
  console.log(`- rows still missing typed micros (while JSON has data): ${rowsStillMissingTyped}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
