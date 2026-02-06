/**
 * State Management
 *
 * The app uses a layered state architecture:
 *
 * 1. UserContext - Persistent user data (profile, settings)
 * 2. UIContext - Transient UI state (drafts, animations, date selection)
 * 3. React Query - Server state (nutrition, tracking, fitness data)
 * 4. AppStore (legacy) - Being migrated to the above
 *
 * @example
 * // Use granular hooks to avoid unnecessary re-renders:
 * const { userProfile } = useUserProfile();
 * const { selectedDate } = useSelectedDate();
 */

// User Context - profile and settings
export {
  UserProvider,
  useUser,
  useUserProfile,
  useUserSettings,
  type UserProfile,
  type UserSettings,
} from "./UserContext";

// UI Context - transient state
export {
  UIProvider,
  useUI,
  useWorkoutDrafts,
  useMealPulse,
  useSelectedDate,
  useExperienceTransition,
} from "./UIContext";

// Legacy AppStore - still used during migration
export { AppStoreProvider, useAppStore } from "./AppStore";
