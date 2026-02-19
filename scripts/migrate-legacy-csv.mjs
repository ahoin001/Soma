import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const requiredEnv = ["VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "MIGRATION_TARGET_USER_ID"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const targetUserId = process.env.MIGRATION_TARGET_USER_ID;
const legacyUserId = process.env.MIGRATION_LEGACY_USER_ID ?? null;
const csvDir = process.env.LEGACY_CSV_DIR ?? path.resolve(process.cwd(), "legacy-csv");
const foodsGlobal = (process.env.MIGRATION_FOODS_GLOBAL ?? "true").toLowerCase() !== "false";
const resetTargetUser = (process.env.MIGRATION_RESET_TARGET_USER ?? "true").toLowerCase() !== "false";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const csvFiles = {
  brands: "brands.csv",
  foods: "foods.csv",
  food_servings: "food_servings.csv",
  meal_types: "meal_types.csv",
  user_profiles: "user_profiles.csv",
  user_nutrition_settings: "user_nutrition_settings.csv",
  meal_entries: "meal_entries.csv",
  meal_entry_items: "meal_entry_items.csv",
  weight_logs: "weight_logs.csv",
  user_food_history: "user_food_history.csv",
  daily_nutrition_targets: "daily_nutrition_targets.csv",
  workout_plans: "workout_plans.csv",
  workout_template_exercises: "workout_template_exercises.csv",
};

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (ch === "\r") continue;
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function readCsv(fileName) {
  const fullPath = path.resolve(csvDir, fileName);
  if (!existsSync(fullPath)) return [];
  const raw = readFileSync(fullPath, "utf8");
  const rows = parseCsv(raw);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).filter((r) => r.length > 1 || (r[0] ?? "").trim() !== "").map((r) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = r[i] ?? "";
    });
    return obj;
  });
}

function n(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}
function d(v) {
  const t = n(v);
  return t == null ? null : Number(t);
}
function i(v) {
  const t = n(v);
  return t == null ? null : Number.parseInt(t, 10);
}
function b(v) {
  const t = n(v);
  if (t == null) return null;
  return t.toLowerCase() === "true";
}
function j(v) {
  const t = n(v);
  if (t == null) return {};
  return JSON.parse(t);
}

async function upsertRows(table, rows, onConflict) {
  if (!rows.length) {
    console.log(`${table}: 0`);
    return;
  }

  const chunkSize = 200;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const query = supabase.from(table).upsert(chunk, onConflict ? { onConflict } : undefined);
    const { error } = await query;
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  }
  console.log(`${table}: ${rows.length}`);
}

async function resetTargetUserRows() {
  const statements = [
    supabase.from("daily_nutrition_targets").delete().eq("user_id", targetUserId),
    supabase.from("user_food_history").delete().eq("user_id", targetUserId),
    supabase.from("weight_logs").delete().eq("user_id", targetUserId),
    supabase.from("meal_entries").delete().eq("user_id", targetUserId),
    supabase.from("meal_types").delete().eq("user_id", targetUserId),
    supabase.from("workout_plans").delete().eq("user_id", targetUserId),
  ];
  for (const statement of statements) {
    const { error } = await statement;
    if (error) throw new Error(`Reset failed: ${error.message}`);
  }
}

function filterLegacyUser(rows) {
  if (!legacyUserId) return rows;
  if (!rows.length) return rows;
  if (!Object.prototype.hasOwnProperty.call(rows[0], "user_id")) return rows;
  return rows.filter((row) => row.user_id === legacyUserId);
}

function remapOwnerUserId(rawUserId) {
  const id = n(rawUserId);
  if (!id) return null;
  // Keep owner ids valid under current Supabase auth/users model.
  if (id === targetUserId) return targetUserId;
  if (legacyUserId && id === legacyUserId) return targetUserId;
  return null;
}

async function main() {
  console.log("Starting legacy CSV migration");
  console.log(`CSV dir: ${csvDir}`);
  console.log(`Target user: ${targetUserId}`);
  if (legacyUserId) console.log(`Legacy user filter: ${legacyUserId}`);

  if (resetTargetUser) {
    console.log("Resetting target user rows before import...");
    await resetTargetUserRows();
  }

  const brands = readCsv(csvFiles.brands).map((r) => ({
    id: r.id,
    name: r.name,
    is_verified: b(r.is_verified) ?? false,
    created_by_user_id: remapOwnerUserId(r.created_by_user_id),
    website_url: n(r.website_url),
    logo_url: n(r.logo_url),
    created_at: n(r.created_at),
    updated_at: n(r.updated_at),
  }));
  await upsertRows("brands", brands, "id");

  const foods = readCsv(csvFiles.foods).map((r) => ({
    id: r.id,
    name: r.name,
    brand: n(r.brand),
    barcode: n(r.barcode),
    source: n(r.source) ?? "import",
    is_global: foodsGlobal ? true : (b(r.is_global) ?? false),
    created_by_user_id: foodsGlobal ? null : targetUserId,
    parent_food_id: n(r.parent_food_id),
    portion_label: n(r.portion_label),
    portion_grams: d(r.portion_grams),
    kcal: d(r.kcal) ?? 0,
    carbs_g: d(r.carbs_g) ?? 0,
    protein_g: d(r.protein_g) ?? 0,
    fat_g: d(r.fat_g) ?? 0,
    micronutrients: j(r.micronutrients),
    created_at: n(r.created_at),
    updated_at: n(r.updated_at),
    image_url: n(r.image_url),
    brand_id: n(r.brand_id),
  }));
  await upsertRows("foods", foods, "id");

  const foodServings = readCsv(csvFiles.food_servings).map((r) => ({
    id: r.id,
    food_id: r.food_id,
    label: r.label,
    grams: d(r.grams),
  }));
  await upsertRows("food_servings", foodServings, "id");

  const mealTypesRows = filterLegacyUser(readCsv(csvFiles.meal_types));
  const mealTypes = mealTypesRows.map((r) => ({
    id: r.id,
    user_id: targetUserId,
    label: r.label,
    emoji: n(r.emoji),
    sort_order: i(r.sort_order) ?? 0,
    created_at: n(r.created_at),
  }));
  await upsertRows("meal_types", mealTypes, "id");
  const mealTypeIdSet = new Set(mealTypes.map((row) => row.id));
  const breakfastId = mealTypes.find((row) => row.label?.toLowerCase() === "breakfast")?.id ?? null;

  const profilesRows = filterLegacyUser(readCsv(csvFiles.user_profiles));
  const profiles = profilesRows.map((r) => ({
    user_id: targetUserId,
    display_name: r.display_name || "You",
    sex: n(r.sex),
    dob: n(r.dob),
    height_cm: d(r.height_cm),
    units: n(r.units),
    timezone: n(r.timezone),
    created_at: n(r.created_at),
    updated_at: n(r.updated_at),
  }));
  await upsertRows("user_profiles", profiles, "user_id");

  const nutritionRows = filterLegacyUser(readCsv(csvFiles.user_nutrition_settings));
  const nutrition = nutritionRows.map((r) => ({
    user_id: targetUserId,
    kcal_goal: d(r.kcal_goal),
    carbs_g: d(r.carbs_g),
    protein_g: d(r.protein_g),
    fat_g: d(r.fat_g),
    updated_at: n(r.updated_at),
  }));
  await upsertRows("user_nutrition_settings", nutrition, "user_id");

  const mealEntriesRows = filterLegacyUser(readCsv(csvFiles.meal_entries));
  const mealEntries = mealEntriesRows.map((r) => {
    let mealTypeId = n(r.meal_type_id);
    if (mealTypeId && !mealTypeIdSet.has(mealTypeId)) mealTypeId = breakfastId;
    return {
      id: r.id,
      user_id: targetUserId,
      local_date: r.local_date,
      meal_type_id: mealTypeId,
      logged_at: n(r.logged_at),
      notes: n(r.notes),
    };
  });
  await upsertRows("meal_entries", mealEntries, "id");
  const mealEntryIdSet = new Set(mealEntries.map((r) => r.id));

  const mealItemRows = readCsv(csvFiles.meal_entry_items).filter((r) => mealEntryIdSet.has(r.meal_entry_id));
  const mealItems = mealItemRows.map((r) => ({
    id: r.id,
    meal_entry_id: r.meal_entry_id,
    food_id: n(r.food_id),
    food_name: r.food_name,
    portion_label: n(r.portion_label),
    portion_grams: d(r.portion_grams),
    quantity: d(r.quantity),
    kcal: d(r.kcal),
    carbs_g: d(r.carbs_g),
    protein_g: d(r.protein_g),
    fat_g: d(r.fat_g),
    micronutrients: j(r.micronutrients),
    sort_order: i(r.sort_order),
    created_at: n(r.created_at),
  }));
  await upsertRows("meal_entry_items", mealItems, "id");

  const weightsRows = filterLegacyUser(readCsv(csvFiles.weight_logs));
  const weights = weightsRows.map((r) => ({
    id: r.id,
    user_id: targetUserId,
    local_date: r.local_date,
    logged_at: n(r.logged_at),
    weight: d(r.weight),
    unit: n(r.unit),
    notes: n(r.notes),
  }));
  await upsertRows("weight_logs", weights, "id");

  const historyRows = filterLegacyUser(readCsv(csvFiles.user_food_history));
  const history = historyRows.map((r) => ({
    user_id: targetUserId,
    food_id: r.food_id,
    last_logged_at: n(r.last_logged_at),
    times_logged: i(r.times_logged) ?? 0,
  }));
  await upsertRows("user_food_history", history, "user_id,food_id");

  const targetRows = filterLegacyUser(readCsv(csvFiles.daily_nutrition_targets));
  const targets = targetRows.map((r) => ({
    user_id: targetUserId,
    local_date: r.local_date,
    kcal_goal: d(r.kcal_goal),
    carbs_g: d(r.carbs_g),
    protein_g: d(r.protein_g),
    fat_g: d(r.fat_g),
    updated_at: n(r.updated_at),
  }));
  await upsertRows("daily_nutrition_targets", targets, "user_id,local_date");

  const workoutPlansRows = filterLegacyUser(readCsv(csvFiles.workout_plans));
  const workoutPlans = workoutPlansRows.map((r) => ({
    id: r.id,
    user_id: targetUserId,
    name: r.name,
    sort_order: i(r.sort_order) ?? 0,
    created_at: n(r.created_at),
    updated_at: n(r.updated_at),
    deleted_at: n(r.deleted_at),
  }));
  await upsertRows("workout_plans", workoutPlans, "id");
  const activePlan = workoutPlans.find((p) => !p.deleted_at) ?? workoutPlans[0] ?? null;

  const templateExerciseRows = readCsv(csvFiles.workout_template_exercises);
  const templateIds = [...new Set(templateExerciseRows.map((r) => n(r.template_id)).filter(Boolean))];

  if (activePlan && templateIds.length > 0) {
    const workoutTemplates = templateIds.map((id, index) => ({
      id,
      plan_id: activePlan.id,
      name: `Imported Template ${index + 1}`,
      sort_order: index,
    }));
    await upsertRows("workout_templates", workoutTemplates, "id");

    const wteRows = templateExerciseRows.map((r) => ({
      id: r.id,
      template_id: r.template_id,
      exercise_id: i(r.exercise_id),
      exercise_name: r.exercise_name,
      group_id: n(r.group_id),
      group_type: n(r.group_type),
      group_order: i(r.group_order),
      item_order: i(r.item_order),
      target_sets: i(r.target_sets),
      notes: n(r.notes),
    }));
    await upsertRows("workout_template_exercises", wteRows, "id");
  } else {
    console.log("workout_templates/workout_template_exercises: skipped");
  }

  console.log("Legacy CSV migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
