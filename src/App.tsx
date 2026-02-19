import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QueryClient,
  useQueryClient,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from "react";
import { useTheme } from "next-themes";
// framer-motion is used by PageTransition / ExperienceSwitch — not directly here
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AppStoreProvider,
  UserProvider,
  UIProvider,
  useExperienceTransitionConfig,
  useUserSettings,
} from "@/state";
import {
  AppShell as AuraAppShell,
  OnboardingDialog,
  PageTransition,
} from "@/components/aura";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useRealtimeInvalidation } from "@/hooks/useRealtimeInvalidation";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import {
  ensureMealTypes,
  fetchActivityGoals,
  fetchActiveFitnessSession,
  fetchFitnessRoutines,
  fetchFitnessSessionHistory,
  fetchFoodFavorites,
  fetchFoodHistory,
  fetchMealEntries,
  fetchNutritionSettings,
  fetchNutritionSummary,
  fetchStepsLogs,
  fetchTrainingAnalytics,
  fetchWaterLogs,
  fetchWeightLogs,
  fetchWorkoutPlans,
  SessionExpiredError,
} from "@/lib/api";
import { getMealRecommendation } from "@/lib/nutrition";
import { computeLogSections, computeTotals, toLocalDate } from "@/lib/nutritionData";
import { queryKeys } from "@/lib/queryKeys";
import { defaultMacroTargets, defaultSummary } from "@/data/defaults";
import type { FoodItem, Meal } from "@/data/mock";
import { recordToFoodItem } from "@/lib/foodMapping";
import {
  QUERY_PERSIST_BUSTER,
  QUERY_PERSIST_MAX_AGE_MS,
  queryPersister,
} from "@/lib/queryPersistence";
import { LAST_SIGNED_IN_ROUTE_KEY } from "@/lib/storageKeys";
import {
  setFitnessPlannerCache,
  setTrainingAnalyticsCache,
  setWorkoutPlansCache,
} from "@/lib/fitnessCache";

// Register offline mutation handlers for background sync
import "@/lib/offlineHandlers";

// ─── Core dock pages: eagerly imported, always ready ────────────────
// These are the pages reachable from the bottom dock tabs.
// Eagerly bundling them eliminates chunk-download lag on every tap,
// which is how Spotify / Lifesum / MFP achieve instant navigation.
import Nutrition from "./pages/Nutrition";
import Progress from "./pages/Progress";
import Goals from "./pages/Goals";
import Groceries from "./pages/Groceries";
import Guides from "./pages/Guides";
import AddFood from "./pages/AddFood";
import Fitness from "./pages/Fitness";
import FitnessRoutines from "./pages/FitnessRoutines";
import FitnessProgress from "./pages/FitnessProgress";
import FitnessJournal from "./pages/FitnessJournal";
import Settings from "./pages/Settings";

// ─── Secondary screens: lazy-loaded on demand ───────────────────────
// These are accessed through specific user actions (create, edit, etc.)
// and are fine to load on-demand with a quick Suspense fallback.
const CreateFood = lazy(() => import("./pages/CreateFood"));
const ScanBarcode = lazy(() => import("./pages/ScanBarcode"));
const EditFood = lazy(() => import("./pages/EditFood"));
const WorkoutDetails = lazy(() => import("./pages/WorkoutDetails"));
const ExerciseGuide = lazy(() => import("./pages/ExerciseGuide"));
const CreateExercise = lazy(() => import("./pages/CreateExercise"));
const EditExercise = lazy(() => import("./pages/EditExercise"));
const AddExerciseToWorkout = lazy(() => import("./pages/AddExerciseToWorkout"));
const AdminExerciseThumbnails = lazy(() => import("./pages/AdminExerciseThumbnails"));
const FoodImportAdmin = lazy(() => import("./pages/FoodImportAdmin"));
const Auth = lazy(() => import("./pages/Auth"));
const FitnessProgressExercise = lazy(() => import("./pages/FitnessProgressExercise"));
const FitnessJournalMeasurement = lazy(() => import("./pages/FitnessJournalMeasurement"));
const FitnessJournalPhotos = lazy(() => import("./pages/FitnessJournalPhotos"));

/**
 * QueryClient configuration for optimal PWA experience:
 * - Retry failed requests (3 attempts with exponential backoff)
 * - Stale time: 30s (data considered fresh, no refetch)
 * - Cache time: 5min (keep data in memory for quick navigation)
 * - Refetch on window focus for fresh data
 * - Network-first with cache fallback for offline support
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds - data is fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
      retry: (failureCount, error) => {
        const isAuthError =
          error instanceof SessionExpiredError ||
          (error instanceof Error &&
            /(unauthorized|jwt|auth|session expired)/i.test(error.message));
        return !isAuthError && failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: (query) =>
        Date.now() - query.state.dataUpdatedAt > 60 * 1000,
      refetchOnReconnect: true,
      networkMode: "offlineFirst", // Use cache when offline
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
      networkMode: "offlineFirst",
    },
  },
});

const isNativeCapacitor = () => {
  if (typeof window === "undefined") return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(cap?.isNativePlatform?.());
};

const isPersistableSignedInRoute = (path: string) =>
  path.startsWith("/nutrition") ||
  path.startsWith("/fitness") ||
  path.startsWith("/settings");

const getStoredSignedInRoute = (): string | null => {
  if (typeof window === "undefined") return null;
  const route = window.localStorage.getItem(LAST_SIGNED_IN_ROUTE_KEY);
  if (!route) return null;
  return isPersistableSignedInRoute(route) ? route : null;
};

// ─── Suspense fallback for lazy secondary screens ───────────────────
// Uses AuraAppShell so the dock stays visible while a lazy chunk loads.
const LazyFallback = () => {
  const location = useLocation();
  const experience = location.pathname.startsWith("/fitness")
    ? "fitness"
    : "nutrition";
  return (
    <AuraAppShell experience={experience}>
      <div
        className="mx-auto w-full max-w-sm px-5 pb-10"
        style={{
          paddingTop: "calc(1.5rem + var(--sat, env(safe-area-inset-top)))",
        }}
      >
        <Skeleton className="h-56 w-full rounded-[32px]" />
        <div className="mt-5 space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </AuraAppShell>
  );
};

/**
 * Wrap a lazy-loaded page element in its own Suspense boundary so that
 * the fallback only appears for that specific route, not the entire app.
 */
const withSuspense = (element: JSX.Element) => (
  <Suspense fallback={<LazyFallback />}>{element}</Suspense>
);

// ─── Routes ─────────────────────────────────────────────────────────
// Architecture note: NO AnimatePresence around <Routes>.
//
// AnimatePresence mode="wait" was the primary cause of slow navigation.
// It forces the OLD page to fully exit-animate (250-500ms) before the
// NEW page can start entering. That's 500ms+ of dead time per tap.
//
// Instead, each page wraps itself in <PageTransition> which plays a
// quick enter-only animation (120ms fade for tabs, slightly more for
// experience switches). Old pages unmount immediately.

const AppRoutes = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { experienceTransitionConfig } = useExperienceTransitionConfig();
  const { defaultHome, themePalette } = useUserSettings();
  const { resolvedTheme } = useTheme();

  const currentExperience = location.pathname.startsWith("/fitness")
    ? "fitness"
    : "nutrition";
  const prevExperienceRef = useRef(currentExperience);
  const isExperienceSwitch = prevExperienceRef.current !== currentExperience;

  useEffect(() => {
    prevExperienceRef.current = currentExperience;
  }, [currentExperience]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.info("[AuraFit] route", location.pathname);
    }
  }, [location.pathname]);

  useEffect(() => {
    const next = `${location.pathname}${location.search}${location.hash}`;
    if (!isPersistableSignedInRoute(next)) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_SIGNED_IN_ROUTE_KEY, next);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const isFitness = location.pathname.startsWith("/fitness");
    const isDark = resolvedTheme === "dark";

    // Update root classes for experience + palette theme
    root.classList.remove(
      "experience-nutrition",
      "experience-fitness",
      "theme-emerald",
      "theme-ocean",
    );
    root.classList.add(isFitness ? "experience-fitness" : "experience-nutrition");
    root.classList.add(themePalette === "ocean" ? "theme-ocean" : "theme-emerald");

    // Dynamic theme-color for immersive status bar
    const themeColor = isFitness
      ? "#020617"
      : isDark
        ? "#0f172a"
      : themePalette === "ocean"
        ? "#eff6ff"
        : "#f0fdf4";
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", themeColor);
    }
  }, [location.pathname, themePalette, resolvedTheme]);

  // Shared transition props passed to every page's PageTransition wrapper.
  // The `key` prop on PageTransition causes it to re-mount on every
  // location change, which triggers the enter animation exactly once.
  const transition = (element: JSX.Element) => (
    <PageTransition
      key={location.pathname}
      isExperienceSwitch={isExperienceSwitch}
      transitionConfig={experienceTransitionConfig}
      experienceTone={currentExperience}
      disabled={navigationType === "POP"}
    >
      {element}
    </PageTransition>
  );

  // Auth is already verified at AppShellRoot level — these routes only
  // render when isSignedIn is true, so no per-route auth check needed.

  return (
    <>
      <ScrollRestoration />
      <Routes>
        {(() => {
          const defaultRoute = defaultHome === "fitness" ? "/fitness" : "/nutrition";
          const restored = getStoredSignedInRoute();
          const nextHome = restored ?? defaultRoute;
          return (
        <Route
          path="/"
          element={
            <Navigate
              to={nextHome}
              replace
            />
          }
        />
          );
        })()}

        {/* ── Nutrition dock tabs (eager) ── */}
        <Route path="/nutrition" element={transition(<Nutrition />)} />
        <Route path="/nutrition/progress" element={transition(<Progress />)} />
        <Route path="/nutrition/goals" element={transition(<Goals />)} />
        <Route path="/nutrition/guides" element={transition(<Guides />)} />
        <Route path="/nutrition/groceries" element={transition(<Guides />)} />
        <Route path="/nutrition/add-food" element={transition(<AddFood />)} />
        <Route path="/settings" element={transition(<Settings />)} />

        {/* ── Nutrition secondary (lazy) ── */}
        <Route
          path="/nutrition/add-food/create"
          element={transition(withSuspense(<CreateFood />))}
        />
        <Route
          path="/nutrition/add-food/scan"
          element={transition(withSuspense(<ScanBarcode />))}
        />
        <Route
          path="/nutrition/food/edit"
          element={transition(withSuspense(<EditFood />))}
        />
        <Route
          path="/nutrition/admin/import"
          element={transition(withSuspense(<FoodImportAdmin />))}
        />

        {/* ── Fitness dock tabs (eager) ── */}
        <Route path="/fitness" element={transition(<Fitness />)} />
        <Route path="/fitness/routines" element={transition(<FitnessRoutines />)} />
        <Route path="/fitness/progress" element={transition(<FitnessProgress />)} />
        <Route path="/fitness/journal" element={transition(<FitnessJournal />)} />
        <Route path="/fitness/log" element={<Navigate to="/fitness/journal" replace />} />

        {/* ── Fitness secondary (lazy) ── */}
        <Route
          path="/fitness/workouts/:planId/:workoutId"
          element={transition(withSuspense(<WorkoutDetails />))}
        />
        <Route
          path="/fitness/workouts/:planId/:workoutId/:mode"
          element={transition(withSuspense(<WorkoutDetails />))}
        />
        <Route
          path="/fitness/workouts/:planId/:workoutId/exercises/:exerciseId/guide"
          element={transition(withSuspense(<ExerciseGuide />))}
        />
        <Route
          path="/fitness/exercises/create"
          element={transition(withSuspense(<CreateExercise />))}
        />
        <Route
          path="/fitness/exercises/:exerciseId/edit"
          element={transition(withSuspense(<EditExercise />))}
        />
        <Route
          path="/fitness/exercises/add"
          element={transition(withSuspense(<AddExerciseToWorkout />))}
        />
        <Route
          path="/fitness/admin/exercises"
          element={transition(withSuspense(<AdminExerciseThumbnails />))}
        />
        <Route
          path="/fitness/progress/exercise/:exerciseId"
          element={transition(withSuspense(<FitnessProgressExercise />))}
        />
        <Route
          path="/fitness/journal/measurements/:type"
          element={transition(withSuspense(<FitnessJournalMeasurement />))}
        />
        <Route
          path="/fitness/journal/photos"
          element={transition(withSuspense(<FitnessJournalPhotos />))}
        />

        <Route path="/auth" element={<AuthRoute />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

// ─── Experience backdrop ────────────────────────────────────────────
// Both layers always exist in the DOM; we toggle opacity with a CSS
// transition.  This is a GPU-friendly crossfade — no AnimatePresence,
// no sequential wait, and no flash of white between experiences.
const ExperienceBackdrop = () => {
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const { themePalette } = useUserSettings();
  if (location.pathname.startsWith("/auth")) return null;

  const isFitness = location.pathname.startsWith("/fitness");
  const isDark = resolvedTheme === "dark";
  const nutritionHudGradient = isDark
    ? themePalette === "ocean"
      ? "radial-gradient(circle_at_18%_8%,_rgba(56,189,248,0.22),_transparent_42%),radial-gradient(circle_at_82%_0%,_rgba(59,130,246,0.18),_transparent_44%),radial-gradient(circle_at_70%_78%,_rgba(14,165,233,0.14),_transparent_55%),linear-gradient(180deg,_rgba(10,15,26,1)_0%,_rgba(10,16,28,0.96)_52%,_rgba(12,20,34,0.94)_100%)"
      : "radial-gradient(circle_at_16%_10%,_rgba(52,211,153,0.24),_transparent_42%),radial-gradient(circle_at_84%_0%,_rgba(45,212,191,0.18),_transparent_44%),radial-gradient(circle_at_72%_80%,_rgba(16,185,129,0.14),_transparent_55%),linear-gradient(180deg,_rgba(11,15,18,1)_0%,_rgba(12,18,22,0.96)_52%,_rgba(13,20,24,0.94)_100%)"
    : "radial-gradient(circle_at_15%_10%,_rgba(191,219,254,0.8),_transparent_45%),radial-gradient(circle_at_85%_0%,_rgba(167,243,208,0.9),_transparent_45%),radial-gradient(circle_at_70%_80%,_rgba(253,224,71,0.35),_transparent_55%),linear-gradient(180deg,_rgba(240,253,244,1)_0%,_rgba(236,253,245,0.92)_50%,_rgba(209,250,229,0.88)_100%)";
  const fitnessGradient = "linear-gradient(180deg,_#020617_0%,_#0f172a_100%)";
  const nutritionOverlay = isDark
    ? themePalette === "ocean"
      ? "radial-gradient(circle_at_16%_18%,_rgba(14,165,233,0.16),_transparent_44%),radial-gradient(circle_at_80%_16%,_rgba(56,189,248,0.14),_transparent_42%),radial-gradient(circle_at_72%_84%,_rgba(29,78,216,0.16),_transparent_50%),linear-gradient(180deg,_rgba(8,12,20,0.72)_0%,_rgba(8,12,20,0.6)_100%)"
      : "radial-gradient(circle_at_15%_20%,_rgba(16,185,129,0.18),_transparent_44%),radial-gradient(circle_at_80%_15%,_rgba(20,184,166,0.15),_transparent_43%),radial-gradient(circle_at_70%_80%,_rgba(5,150,105,0.16),_transparent_50%),linear-gradient(180deg,_rgba(8,12,14,0.72)_0%,_rgba(8,12,14,0.6)_100%)"
    : "radial-gradient(circle_at_15%_20%,_rgba(125,211,252,0.28),_transparent_45%),radial-gradient(circle_at_80%_15%,_rgba(134,239,172,0.32),_transparent_45%),radial-gradient(circle_at_70%_80%,_rgba(253,224,71,0.2),_transparent_50%),radial-gradient(circle_at_10%_85%,_rgba(59,130,246,0.18),_transparent_45%)";
  const nutritionWash = isDark
    ? "linear-gradient(180deg,_rgba(4,7,10,0.2)_0%,_rgba(4,7,10,0.35)_40%,_rgba(4,7,10,0.55)_100%)"
    : "linear-gradient(180deg,_rgba(255,255,255,0.9)_0%,_rgba(255,255,255,0.7)_35%,_rgba(255,255,255,0.85)_100%)";

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* Nutrition layer */}
      <div
        className="absolute inset-0 transition-opacity duration-500 ease-out"
        style={{ opacity: isFitness ? 0 : 1 }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[400px]"
          style={{ background: nutritionHudGradient }}
        />
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-70"
            style={{ background: nutritionOverlay }}
          />
          <div className="absolute inset-0" style={{ background: nutritionWash }} />
        </div>
      </div>
      {/* Fitness layer */}
      <div
        className="absolute inset-0 transition-opacity duration-500 ease-out"
        style={{ opacity: isFitness ? 1 : 0 }}
      >
        <div
          className="absolute inset-0"
          style={{ background: fitnessGradient }}
        />
      </div>
    </div>
  );
};

// ─── Data prefetch (PWA best practice: critical path fast, rest in background) ─
const AppPrefetch = () => {
  const auth = useAuth();
  const { defaultHome } = useUserSettings();
  const queryClient = useQueryClient();

  useRealtimeInvalidation(auth.userId, [
    {
      table: "meal_entry_items",
      queryTargets: [
        { queryKey: ["nutrition"], exact: false },
        { queryKey: queryKeys.foodHistory },
      ],
    },
    {
      table: "meal_entries",
      queryTargets: [{ queryKey: ["nutrition"], exact: false }],
    },
    {
      table: "user_food_favorites",
      queryTargets: [{ queryKey: queryKeys.foodFavorites }],
    },
    {
      table: "weight_logs",
      queryTargets: [{ queryKey: queryKeys.trackingWeight }],
    },
    {
      table: "steps_logs",
      queryTargets: [{ queryKey: ["trackingSteps"], exact: false }],
    },
    {
      table: "water_logs",
      queryTargets: [{ queryKey: ["trackingWater"], exact: false }],
    },
    {
      table: "user_activity_goals",
      queryTargets: [
        { queryKey: ["trackingSteps"], exact: false },
        { queryKey: ["trackingWater"], exact: false },
      ],
    },
    {
      table: "workout_sessions",
      queryTargets: [
        { queryKey: queryKeys.fitnessSession },
        { queryKey: queryKeys.fitnessHistory },
      ],
    },
  ]);

  useEffect(() => {
    if (auth.status !== "ready" || !auth.userId) return;
    let cancelled = false;
    const localDate = toLocalDate(new Date());

    // Critical path: data needed for login → home (Nutrition diary + summary). Run immediately.
    const runCriticalPrefetch = async () => {
      try {
        const mealTypes = await ensureMealTypes();
        if (cancelled) return;
        queryClient.setQueryData(queryKeys.mealTypes, mealTypes);
        const meals: Meal[] = mealTypes.items.map((item) => ({
          id: item.id,
          label: item.label,
          emoji: item.emoji ?? "🍽️",
          recommended: getMealRecommendation(item.label),
        }));

        await queryClient.prefetchQuery({
          queryKey: queryKeys.nutrition(localDate),
          queryFn: async () => {
            const [entriesRes, summaryRes, settingsRes] = await Promise.all([
              fetchMealEntries(localDate),
              fetchNutritionSummary(localDate),
              fetchNutritionSettings(),
            ]);
            const logSections = computeLogSections(
              entriesRes.entries,
              entriesRes.items,
              meals,
            );
            const totals = computeTotals(logSections);
            const goalCandidate =
              summaryRes.targets?.kcal_goal ??
              summaryRes.settings?.kcal_goal ??
              settingsRes.settings?.kcal_goal ??
              defaultSummary.goal;
            const goal =
              Number.isFinite(Number(goalCandidate)) && Number(goalCandidate) > 0
                ? Number(goalCandidate)
                : defaultSummary.goal;
            const macros = defaultMacroTargets.map((macro) => ({
              ...macro,
              current: totals[macro.key],
              goal:
                macro.key === "carbs"
                  ? Number(
                      summaryRes.targets?.carbs_g ??
                        settingsRes.settings?.carbs_g ??
                        macro.goal,
                    )
                  : macro.key === "protein"
                    ? Number(
                        summaryRes.targets?.protein_g ??
                          settingsRes.settings?.protein_g ??
                          macro.goal,
                      )
                    : Number(
                        summaryRes.targets?.fat_g ??
                          settingsRes.settings?.fat_g ??
                          macro.goal,
                      ),
            }));
            return {
              summary: {
                eaten: totals.kcal,
                burned: 0,
                kcalLeft: Math.max(goal - totals.kcal, 0),
                goal,
              },
              macros,
              logSections,
            };
          },
          staleTime: 2 * 60 * 1000,
          gcTime: 60 * 60 * 1000,
        });
      } catch {
        // Silent; page will fetch on demand
      }
    };

    // Background: tracking, favorites, history, fitness. Prefetch when idle so critical path stays fast.
    const runBackgroundPrefetch = async () => {
      if (cancelled) return;
      try {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.trackingWeight,
          queryFn: async () => {
            const response = await fetchWeightLogs({ limit: 180 });
            return response.items.map((item) => ({
              date: item.local_date,
              weight: Number(item.weight),
            }));
          },
          staleTime: 10 * 60 * 1000,
          gcTime: 60 * 60 * 1000,
        });
        if (cancelled) return;

        await queryClient.prefetchQuery({
          queryKey: queryKeys.trackingSteps(localDate),
          queryFn: async () => {
            const [stepsResponse, goalsResponse] = await Promise.all([
              fetchStepsLogs(localDate),
              fetchActivityGoals(),
            ]);
            const hasSteps = stepsResponse.items.length > 0;
            const latest = stepsResponse.items[0];
            return {
              steps: hasSteps ? Number(latest.steps ?? 0) : 0,
              connected: hasSteps,
              goal: goalsResponse.goals?.steps_goal ?? 8000,
            };
          },
          staleTime: 60 * 1000,
          gcTime: 30 * 60 * 1000,
        });
        if (cancelled) return;

        await queryClient.prefetchQuery({
          queryKey: queryKeys.trackingWater(localDate),
          queryFn: async () => {
            const [waterResponse, goalsResponse] = await Promise.all([
              fetchWaterLogs(localDate),
              fetchActivityGoals(),
            ]);
            const total = waterResponse.items.reduce(
              (sum, item) => sum + Number(item.amount_ml ?? 0),
              0,
            );
            return {
              totalMl: total,
              goalMl: goalsResponse.goals?.water_goal_ml ?? 2000,
            };
          },
          staleTime: 60 * 1000,
          gcTime: 30 * 60 * 1000,
        });
        if (cancelled) return;

        await queryClient.prefetchQuery({
          queryKey: queryKeys.foodFavorites,
          queryFn: async () => {
            const response = await fetchFoodFavorites();
            return response.items.map(recordToFoodItem);
          },
          staleTime: 10 * 60 * 1000,
          gcTime: 60 * 60 * 1000,
        });
        if (cancelled) return;

        await queryClient.prefetchQuery({
          queryKey: queryKeys.foodHistory,
          queryFn: async () => {
            const response = await fetchFoodHistory(50);
            return response.items.map(recordToFoodItem);
          },
          staleTime: 10 * 60 * 1000,
          gcTime: 60 * 60 * 1000,
        });

        if (defaultHome === "fitness" && !cancelled) {
          const workoutPlans = await fetchWorkoutPlans();
          setWorkoutPlansCache(workoutPlans);
          const [routinesRes, activeRes, historyRes, goalsRes] =
            await Promise.all([
              fetchFitnessRoutines(),
              fetchActiveFitnessSession(),
              fetchFitnessSessionHistory(),
              fetchActivityGoals(),
            ]);
          setFitnessPlannerCache({
            routinesRes,
            activeRes,
            historyRes,
            goalsRes,
          });
          const training = await fetchTrainingAnalytics(8);
          setTrainingAnalyticsCache({ weeks: 8, items: training.items });
        }
      } catch {
        // Prefetch failures should be silent
      }
    };

    // Start critical immediately (0ms) so home page has data as soon as possible.
    void runCriticalPrefetch();

    // Schedule background when idle so critical path stays fast; fallback to setTimeout if no requestIdleCallback.
    const scheduleBackground = () => {
      if (cancelled) return;
      void runBackgroundPrefetch();
    };
    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    if (typeof requestIdleCallback !== "undefined") {
      idleId = requestIdleCallback(scheduleBackground, { timeout: 300 });
    } else {
      timerId = window.setTimeout(scheduleBackground, 100);
    }

    return () => {
      cancelled = true;
      if (idleId != null && typeof cancelIdleCallback !== "undefined") {
        cancelIdleCallback(idleId);
      }
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, [auth.status, auth.userId, defaultHome, queryClient]);

  return null;
};

// ─── Scroll restoration ─────────────────────────────────────────────
const ScrollRestoration = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const key = `${location.pathname}${location.search}`;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(`scroll:${key}`);
    if (navigationType === "POP" && saved) {
      window.scrollTo({ top: Number(saved), left: 0, behavior: "auto" });
      return;
    }
    if (navigationType !== "POP") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [key, navigationType]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    return () => {
      window.sessionStorage.setItem(`scroll:${key}`, String(window.scrollY));
    };
  }, [key]);

  return null;
};

// ─── Auth helpers ───────────────────────────────────────────────────
const AuthLoading = () => (
              <div className="min-h-screen bg-background">
                <div className="mx-auto w-full max-w-sm px-5 pb-10 pt-6">
                  <Skeleton className="h-60 w-full rounded-[36px]" />
                  <div className="mt-6 space-y-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </div>
              </div>
);

const RedirectToAuth = () => {
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;
  return <Navigate to="/auth" replace state={{ from }} />;
};

const AuthRoute = () => {
  const auth = useAuth();
  const { defaultHome } = useUserSettings();
  const location = useLocation();

  if (auth.status !== "ready") {
    return <AuthLoading />;
  }

  const from = (location.state as { from?: string } | undefined)?.from;
  const destination =
    from && from !== "/auth"
      ? from
      : defaultHome === "fitness"
        ? "/fitness"
        : "/nutrition";

  return auth.userId ? (
    <Navigate to={destination} replace />
  ) : (
    <Auth />
  );
};

// ─── App shell (must be inside BrowserRouter) ────────────────────────
const AppShellRoot = () => {
  const auth = useAuth();
  const authReady = auth.status === "ready";

  if (!authReady && !auth.userId) {
    return <AuthLoading />;
  }

  const isSignedIn = Boolean(auth.userId);

  return isSignedIn ? (
    <>
      <AppPrefetch />
      <ExperienceBackdrop />
      <OnboardingDialog />
      <AppRoutes />
    </>
  ) : (
    <Suspense fallback={<AuthLoading />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<RedirectToAuth />} />
      </Routes>
    </Suspense>
  );
};

/** Wraps app content so PageErrorBoundary can use in-app navigate instead of full reload. */
const AppWithErrorBoundary = () => {
  const navigate = useNavigate();
  return (
    <PageErrorBoundary
      scope="App"
      onGoHome={() => navigate("/auth", { replace: true })}
      onError={(error, errorInfo) => {
        if (import.meta.env.DEV) {
          console.error("[GlobalError]", error, errorInfo.componentStack);
        }
      }}
    >
      <Toaster />
      <Sonner />
      <AuthProvider>
        <UserProvider>
          <UIProvider>
            <AppStoreProvider>
              <AppShellRoot />
            </AppStoreProvider>
          </UIProvider>
        </UserProvider>
      </AuthProvider>
    </PageErrorBoundary>
  );
};

const App = () => {
  const routerMode = import.meta.env.VITE_ROUTER_MODE;
  const useHashRouting = routerMode === "hash" || isNativeCapacitor();
  const Router = useHashRouting ? HashRouter : BrowserRouter;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.info("[AuraFit] app boot");
    const onError = (event: ErrorEvent) => {
      console.error("[AuraFit] window error", event.error ?? event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      console.error("[AuraFit] unhandled rejection", event.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        buster: QUERY_PERSIST_BUSTER,
        maxAge: QUERY_PERSIST_MAX_AGE_MS,
      }}
    >
      <TooltipProvider>
        <Router basename={import.meta.env.BASE_URL}>
          <AppWithErrorBoundary />
        </Router>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
