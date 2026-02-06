import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  useExperienceTransition,
  useUserSettings,
} from "@/state";
import { OnboardingDialog } from "@/components/aura";
import { useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/aura";
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

const Nutrition = lazy(() => import("./pages/Nutrition"));
const Progress = lazy(() => import("./pages/Progress"));
const Goals = lazy(() => import("./pages/Goals"));
const Groceries = lazy(() => import("./pages/Groceries"));
const AddFood = lazy(() => import("./pages/AddFood"));
const CreateFood = lazy(() => import("./pages/CreateFood"));
const ScanBarcode = lazy(() => import("./pages/ScanBarcode"));
const EditFood = lazy(() => import("./pages/EditFood"));
const Fitness = lazy(() => import("./pages/Fitness"));
const WorkoutDetails = lazy(() => import("./pages/WorkoutDetails"));
const ExerciseGuide = lazy(() => import("./pages/ExerciseGuide"));
const CreateExercise = lazy(() => import("./pages/CreateExercise"));
const EditExercise = lazy(() => import("./pages/EditExercise"));
const AddExerciseToWorkout = lazy(() => import("./pages/AddExerciseToWorkout"));
const AdminExerciseThumbnails = lazy(() => import("./pages/AdminExerciseThumbnails"));
const FitnessRoutines = lazy(() => import("./pages/FitnessRoutines"));
const FitnessProgress = lazy(() => import("./pages/FitnessProgress"));
const FitnessLog = lazy(() => import("./pages/FitnessLog"));
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

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { experienceTransition } = useExperienceTransition();
  const { defaultHome } = useUserSettings();
  const prevExperienceRef = useRef<"nutrition" | "fitness">(
    location.pathname.startsWith("/fitness") ? "fitness" : "nutrition",
  );
  const currentExperience = location.pathname.startsWith("/fitness")
    ? "fitness"
    : "nutrition";
  const isExperienceSwitch = prevExperienceRef.current !== currentExperience;
  const withTransition = (element: JSX.Element) => (
    <PageTransition
      key={location.pathname}
      direction={navigationType === "POP" ? "back" : "forward"}
      transitionStyle={experienceTransition}
      experienceTone={currentExperience}
      isExperienceSwitch={isExperienceSwitch}
    >
      {element}
    </PageTransition>
  );
  const protect = (element: JSX.Element) => <ProtectedRoute>{element}</ProtectedRoute>;
  const shouldAnimate = (path: string) => {
    if (path.startsWith("/fitness/workouts")) return true;
    if (path.startsWith("/fitness/exercises")) return true;
    return [
      "/nutrition",
      "/nutrition/progress",
      "/nutrition/goals",
      "/nutrition/groceries",
      "/nutrition/add-food",
      "/nutrition/add-food/create",
      "/nutrition/add-food/scan",
      "/nutrition/food/edit",
      "/fitness",
      "/fitness/routines",
      "/fitness/progress",
      "/fitness/log",
      "/fitness/exercises/create",
    ].includes(path);
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.info("[AuraFit] route", location.pathname);
    }
  }, [location.pathname]);

  useEffect(() => {
    prevExperienceRef.current = currentExperience;
  }, [currentExperience]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const isFitness = location.pathname.startsWith("/fitness");
    
    // Update experience class on root
    root.classList.remove("experience-nutrition", "experience-fitness");
    root.classList.add(isFitness ? "experience-fitness" : "experience-nutrition");

    // Dynamic theme-color for immersive status bar
    // Colors match the top of each experience's header gradient
    const themeColor = isFitness ? "#020617" : "#f0fdf4";
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", themeColor);
    }
  }, [location.pathname]);

  return (
    <>
      <ScrollRestoration />
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <Navigate
                to={defaultHome === "fitness" ? "/fitness" : "/nutrition"}
                replace
              />
            }
          />
        <Route
          path="/nutrition"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<Nutrition />))
            ) : (
              protect(<Nutrition />)
            )
          }
        />
        <Route
          path="/nutrition/progress"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<Progress />))
            ) : (
              protect(<Progress />)
            )
          }
        />
        <Route
          path="/nutrition/goals"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<Goals />))
            ) : (
              protect(<Goals />)
            )
          }
        />
        <Route
          path="/nutrition/groceries"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<Groceries />))
            ) : (
              protect(<Groceries />)
            )
          }
        />
        <Route
          path="/nutrition/add-food"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<AddFood />))
            ) : (
              protect(<AddFood />)
            )
          }
        />
        <Route
          path="/nutrition/add-food/create"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<CreateFood />))
            ) : (
              protect(<CreateFood />)
            )
          }
        />
        <Route
          path="/nutrition/add-food/scan"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<ScanBarcode />))
            ) : (
              protect(<ScanBarcode />)
            )
          }
        />
        <Route
          path="/nutrition/food/edit"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<EditFood />))
            ) : (
              protect(<EditFood />)
            )
          }
        />
        <Route
          path="/fitness"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<Fitness />))
            ) : (
              protect(<Fitness />)
            )
          }
        />
        <Route
          path="/fitness/routines"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<FitnessRoutines />))
            ) : (
              protect(<FitnessRoutines />)
            )
          }
        />
        <Route
          path="/fitness/progress"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<FitnessProgress />))
            ) : (
              protect(<FitnessProgress />)
            )
          }
        />
        <Route
          path="/fitness/log"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<FitnessLog />))
            ) : (
              protect(<FitnessLog />)
            )
          }
        />
        <Route
          path="/fitness/workouts/:planId/:workoutId"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<WorkoutDetails />))
            ) : (
              protect(<WorkoutDetails />)
            )
          }
        />
        <Route
          path="/fitness/workouts/:planId/:workoutId/:mode"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<WorkoutDetails />))
            ) : (
              protect(<WorkoutDetails />)
            )
          }
        />
        <Route
          path="/fitness/workouts/:planId/:workoutId/exercises/:exerciseId/guide"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<ExerciseGuide />))
            ) : (
              protect(<ExerciseGuide />)
            )
          }
        />
        <Route
          path="/fitness/exercises/create"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<CreateExercise />))
            ) : (
              protect(<CreateExercise />)
            )
          }
        />
        <Route
          path="/fitness/exercises/:exerciseId/edit"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<EditExercise />))
            ) : (
              protect(<EditExercise />)
            )
          }
        />
        <Route
          path="/fitness/exercises/add"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<AddExerciseToWorkout />))
            ) : (
              protect(<AddExerciseToWorkout />)
            )
          }
        />
        <Route
          path="/fitness/admin/exercises"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(protect(<AdminExerciseThumbnails />))
            ) : (
              protect(<AdminExerciseThumbnails />)
            )
          }
        />
        <Route path="/auth" element={<AuthRoute />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

const ExperienceBackdrop = () => {
  const location = useLocation();
  if (location.pathname.startsWith("/auth")) return null;

  const experience = location.pathname.startsWith("/fitness") ? "fitness" : "nutrition";
  const nutritionHudGradient =
    "radial-gradient(circle_at_15%_10%,_rgba(191,219,254,0.8),_transparent_45%),radial-gradient(circle_at_85%_0%,_rgba(167,243,208,0.9),_transparent_45%),radial-gradient(circle_at_70%_80%,_rgba(253,224,71,0.35),_transparent_55%),linear-gradient(180deg,_rgba(240,253,244,1)_0%,_rgba(236,253,245,0.92)_50%,_rgba(209,250,229,0.88)_100%)";
  const fitnessGradient = "linear-gradient(180deg,_#020617_0%,_#0f172a_100%)";

  return (
    <AnimatePresence mode="wait">
      {experience === "nutrition" ? (
        <motion.div
          key="experience-backdrop-nutrition"
          className="pointer-events-none fixed inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="absolute inset-x-0 top-0 h-[400px]" style={{ background: nutritionHudGradient }} />
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,_rgba(125,211,252,0.28),_transparent_45%),radial-gradient(circle_at_80%_15%,_rgba(134,239,172,0.32),_transparent_45%),radial-gradient(circle_at_70%_80%,_rgba(253,224,71,0.2),_transparent_50%),radial-gradient(circle_at_10%_85%,_rgba(59,130,246,0.18),_transparent_45%)] opacity-70" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.9)_0%,_rgba(255,255,255,0.7)_35%,_rgba(255,255,255,0.85)_100%)]" />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="experience-backdrop-fitness"
          className="pointer-events-none fixed inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="absolute inset-0" style={{ background: fitnessGradient }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AppPrefetch = () => {
  const auth = useAuth();
  const { defaultHome } = useUserSettings();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (auth.status !== "ready" || !auth.userId) return;
    let cancelled = false;
    const localDate = toLocalDate(new Date());

    const prefetch = async () => {
      try {
        await ensureUser();
        if (cancelled) return;

        // Nutrition essentials
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
              meals
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
                        macro.goal
                    )
                  : macro.key === "protein"
                    ? Number(
                        summaryRes.targets?.protein_g ??
                          settingsRes.settings?.protein_g ??
                          macro.goal
                      )
                    : Number(
                        summaryRes.targets?.fat_g ??
                          settingsRes.settings?.fat_g ??
                          macro.goal
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

        // Tracking essentials
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

        await queryClient.prefetchQuery({
          queryKey: queryKeys.trackingWater(localDate),
          queryFn: async () => {
            const [waterResponse, goalsResponse] = await Promise.all([
              fetchWaterLogs(localDate),
              fetchActivityGoals(),
            ]);
            const total = waterResponse.items.reduce(
              (sum, item) => sum + Number(item.amount_ml ?? 0),
              0
            );
            return {
              totalMl: total,
              goalMl: goalsResponse.goals?.water_goal_ml ?? 2000,
            };
          },
          staleTime: 60 * 1000,
          gcTime: 30 * 60 * 1000,
        });

        // Food catalog essentials (favorites/history)
        await queryClient.prefetchQuery({
          queryKey: queryKeys.foodFavorites,
          queryFn: async () => {
            const response = await fetchFoodFavorites();
            return response.items.map(mapFoodRecord);
          },
          staleTime: 10 * 60 * 1000,
          gcTime: 60 * 60 * 1000,
        });

        await queryClient.prefetchQuery({
          queryKey: queryKeys.foodHistory,
          queryFn: async () => {
            const response = await fetchFoodHistory(50);
            return response.items.map(mapFoodRecord);
          },
          staleTime: 10 * 60 * 1000,
          gcTime: 60 * 60 * 1000,
        });

        if (defaultHome === "fitness") {
          const workoutPlans = await fetchWorkoutPlans();
          setWorkoutPlansCache(workoutPlans);

          const [routinesRes, activeRes, historyRes, goalsRes] = await Promise.all([
            fetchFitnessRoutines(),
            fetchActiveFitnessSession(),
            fetchFitnessSessionHistory(),
            fetchActivityGoals(),
          ]);
          setFitnessPlannerCache({ routinesRes, activeRes, historyRes, goalsRes });

          const training = await fetchTrainingAnalytics(8);
          setTrainingAnalyticsCache({ weeks: 8, items: training.items });
        }
      } catch {
        // Prefetch failures should be silent
      }
    };

    // Defer slightly so the app renders immediately
    const timer = window.setTimeout(() => {
      void prefetch();
    }, defaultHome === "fitness" ? 150 : 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [auth.status, auth.userId, defaultHome, queryClient]);

  return null;
};

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

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status !== "ready") {
    return <AuthLoading />;
  }

  if (!auth.userId) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
};

const AuthRoute = () => {
  const auth = useAuth();
  const { defaultHome } = useUserSettings();

  if (auth.status !== "ready") {
    return <AuthLoading />;
  }

  return auth.userId ? (
    <Navigate to={defaultHome === "fitness" ? "/fitness" : "/nutrition"} replace />
  ) : (
    <Auth />
  );
};

const AppShell = () => {
  const auth = useAuth();
  const authReady = auth.status === "ready";

  if (!authReady) {
    return <AuthLoading />;
  }

  const isSignedIn = Boolean(auth.userId);

  return (
    <BrowserRouter>
      <Suspense fallback={<AuthLoading />}>
        {isSignedIn ? (
          <>
            <AppPrefetch />
            <ExperienceBackdrop />
            {/* OnboardingDialog shows automatically if user hasn't completed onboarding */}
            <OnboardingDialog />
            <AnimatedRoutes />
          </>
        ) : (
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        )}
      </Suspense>
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
          <UserProvider>
            <UIProvider>
              <AppStoreProvider>
                <AppShell />
              </AppStoreProvider>
            </UIProvider>
          </UserProvider>
        </PageErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
