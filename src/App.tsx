import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from "react";
import { useTheme } from "next-themes";
// framer-motion is used by PageTransition / ExperienceSwitch — not directly here
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
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
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import {
  ensureUser,
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
} from "@/lib/api";
import { getMealRecommendation } from "@/lib/nutrition";
import { computeLogSections, computeTotals, toLocalDate } from "@/lib/nutritionData";
import { queryKeys } from "@/lib/queryKeys";
import { defaultMacroTargets, defaultSummary } from "@/data/defaults";
import type { FoodItem, Meal } from "@/data/mock";
import type { FoodRecord } from "@/types/api";
import { calculateMacroPercent } from "@/data/foodApi";
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
import FitnessLog from "./pages/FitnessLog";

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
const Auth = lazy(() => import("./pages/Auth"));

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
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
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

const mapFoodRecord = (record: FoodRecord): FoodItem => {
  const macros = {
    carbs: Number(record.carbs_g ?? 0),
    protein: Number(record.protein_g ?? 0),
    fat: Number(record.fat_g ?? 0),
  };
  return {
    id: record.id,
    name: record.name,
    brand: record.brand_name ?? record.brand ?? undefined,
    brandId: record.brand_id ?? undefined,
    brandLogoUrl: record.brand_logo_url ?? undefined,
    portion:
      record.portion_label ??
      (record.portion_grams ? `${record.portion_grams} g` : "100 g"),
    portionLabel: record.portion_label ?? undefined,
    portionGrams: record.portion_grams ?? undefined,
    kcal: Number(record.kcal ?? 0),
    emoji: "🍽️",
    barcode: record.barcode ?? undefined,
    source: record.is_global ? "api" : "local",
    imageUrl: record.image_url ?? undefined,
    micronutrients: record.micronutrients ?? undefined,
    macros,
    macroPercent: calculateMacroPercent(macros),
  };
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
        <Route
          path="/"
          element={
            <Navigate
              to={defaultHome === "fitness" ? "/fitness" : "/nutrition"}
              replace
            />
          }
        />

        {/* ── Nutrition dock tabs (eager) ── */}
        <Route path="/nutrition" element={transition(<Nutrition />)} />
        <Route path="/nutrition/progress" element={transition(<Progress />)} />
        <Route path="/nutrition/goals" element={transition(<Goals />)} />
        <Route path="/nutrition/guides" element={transition(<Guides />)} />
        <Route path="/nutrition/groceries" element={transition(<Guides />)} />
        <Route path="/nutrition/add-food" element={transition(<AddFood />)} />

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

        {/* ── Fitness dock tabs (eager) ── */}
        <Route path="/fitness" element={transition(<Fitness />)} />
        <Route path="/fitness/routines" element={transition(<FitnessRoutines />)} />
        <Route path="/fitness/progress" element={transition(<FitnessProgress />)} />
        <Route path="/fitness/log" element={transition(<FitnessLog />)} />

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
  if (location.pathname.startsWith("/auth")) return null;

  const isFitness = location.pathname.startsWith("/fitness");
  const nutritionHudGradient =
    "radial-gradient(circle_at_15%_10%,_rgba(191,219,254,0.8),_transparent_45%),radial-gradient(circle_at_85%_0%,_rgba(167,243,208,0.9),_transparent_45%),radial-gradient(circle_at_70%_80%,_rgba(253,224,71,0.35),_transparent_55%),linear-gradient(180deg,_rgba(240,253,244,1)_0%,_rgba(236,253,245,0.92)_50%,_rgba(209,250,229,0.88)_100%)";
  const fitnessGradient = "linear-gradient(180deg,_#020617_0%,_#0f172a_100%)";

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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,_rgba(125,211,252,0.28),_transparent_45%),radial-gradient(circle_at_80%_15%,_rgba(134,239,172,0.32),_transparent_45%),radial-gradient(circle_at_70%_80%,_rgba(253,224,71,0.2),_transparent_50%),radial-gradient(circle_at_10%_85%,_rgba(59,130,246,0.18),_transparent_45%)] opacity-70" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.9)_0%,_rgba(255,255,255,0.7)_35%,_rgba(255,255,255,0.85)_100%)]" />
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

  useEffect(() => {
    if (auth.status !== "ready" || !auth.userId) return;
    let cancelled = false;
    const localDate = toLocalDate(new Date());

    // Critical path: data needed for login → home (Nutrition diary + summary). Run immediately.
    const runCriticalPrefetch = async () => {
      try {
        await ensureUser();
        if (cancelled) return;

        const mealTypes = await ensureMealTypes();
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
            return response.items.map(mapFoodRecord);
          },
          staleTime: 10 * 60 * 1000,
          gcTime: 60 * 60 * 1000,
        });
        if (cancelled) return;

        await queryClient.prefetchQuery({
          queryKey: queryKeys.foodHistory,
          queryFn: async () => {
            const response = await fetchFoodHistory(50);
            return response.items.map(mapFoodRecord);
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
      window.scrollTo({ top: Number(saved), left: 0, behavior: "instant" });
      return;
    }
    if (navigationType !== "POP") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
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

const AuthRoute = () => {
  const auth = useAuth();
  const { defaultHome } = useUserSettings();

  if (auth.status !== "ready") {
    return <AuthLoading />;
  }

  return auth.userId ? (
    <Navigate
      to={defaultHome === "fitness" ? "/fitness" : "/nutrition"}
      replace
    />
  ) : (
    <Auth />
  );
};

// ─── App shell ──────────────────────────────────────────────────────
const AppShellRoot = () => {
  const auth = useAuth();
  const authReady = auth.status === "ready";

  if (!authReady) {
    return <AuthLoading />;
  }

  const isSignedIn = Boolean(auth.userId);

  return (
    <BrowserRouter>
      {isSignedIn ? (
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
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </Suspense>
      )}
    </BrowserRouter>
  );
};

const App = () => {
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PageErrorBoundary
          scope="App"
          onError={(error, errorInfo) => {
            // Future: Send to error tracking service (Sentry, etc.)
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
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
