import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useLayoutEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { AppStoreProvider, UserProvider, UIProvider } from "@/state";
import { OnboardingDialog } from "@/components/aura";
import { useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/aura";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound";

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

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const withTransition = (element: JSX.Element) => (
    <PageTransition direction={navigationType === "POP" ? "back" : "forward"}>
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
      <Routes location={location}>
        <Route path="/" element={<Navigate to="/nutrition" replace />} />
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
    </>
  );
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

  if (auth.status !== "ready") {
    return <AuthLoading />;
  }

  return auth.userId ? <Navigate to="/nutrition" replace /> : <Auth />;
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
