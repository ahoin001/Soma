/**
 * Centralized localStorage keys for the app.
 * Use these constants instead of raw strings to avoid typos and simplify key rotation.
 */

// Auth (api.ts)
export const USER_ID_KEY = "aurafit-user-id";
export const SESSION_TOKEN_KEY = "aurafit-session-token";

// Legacy apiClient (if still used)
export const USER_KEY_LEGACY = "aura-user-id";

// User & profile
export const USER_PROFILE_KEY = "aurafit-user-profile-v1";
export const FOOD_IMAGES_KEY = "aurafit-show-food-images";
export const FOOD_IMAGE_BACKGROUND_KEY = "aurafit-food-image-background";
export const DEFAULT_HOME_KEY = "aurafit-default-home";
export const THEME_PALETTE_KEY = "aurafit-theme-palette";

// UI & sheets
export const HEADER_STYLE_KEY = "aurafit-header-style"; // used by UserContext
export const SHEET_DEBUG_KEY = "aurafit-sheet-debug";
export const SHEET_NUTRITION_KEY = "aurafit-sheet:nutrition";
export const SHEET_ADD_FOOD_KEY = "aurafit-sheet:add-food";
export const SHEET_FOOD_SEARCH_KEY = "aurafit-sheet:food-search";
export const SHEET_CALENDAR_KEY = "aurafit-sheet:calendar";
export const EXPERIENCE_TRANSITION_CONFIG_KEY =
  "aurafit-experience-transition-config-v1";

// Food
export const SERVING_CACHE_KEY = "aurafit-serving-cache-v1";
export const FOOD_CACHE_KEY = "aura-food-cache-v2";
export const FOOD_OVERRIDES_KEY = "aura-food-overrides-v1";
export const CREATE_FOOD_DRAFT_KEY = "aurafit-create-food-draft-v1";
export const CREATED_FOOD_KEY = "aurafit-created-food";

// Log / edit
export const LOG_DRAFT_KEY_PREFIX = "aurafit-log-draft:";
export const logDraftKey = (itemId: string) => `${LOG_DRAFT_KEY_PREFIX}${itemId}`;

// Goals & onboarding
export const GOALS_DRAFT_KEY = "aurafit-goals-draft-v1";
export const MICRO_GOALS_KEY = "aurafit-micro-goals-v1";
export const ONBOARDED_KEY = "aurafit-onboarded-v1";

// Fitness / workout
export const WORKOUT_DRAFTS_KEY_V2 = "ironflow-workout-drafts-v2";
export const WORKOUT_LAST_SETS_KEY_PREFIX = "ironflow-workout-last-sets:";
export const workoutLastSetsKey = (workoutId: string) =>
  `${WORKOUT_LAST_SETS_KEY_PREFIX}${workoutId}`;
export const ADVANCED_LOGGING_KEY = "ironflow-advanced-logging";
export const EXERCISE_CACHE_KEY = "ironflow-exercise-cache-v1";

// Debug (optional)
export const DEBUG_KEY = "aurafit-debug";

// Offline
export const OFFLINE_DB_NAME = "aurafit-offline";

// Meal plans
export const MEAL_PLANS_KEY = "aurafit-meal-plans-v1";
