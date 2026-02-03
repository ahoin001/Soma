import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { AppStoreProvider } from "@/state/AppStore";
import { AuthDialog, OnboardingCarousel, OnboardingDialog, SplashScreen } from "@/components/aura";
import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/aura";
import NotFound from "./pages/NotFound";

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

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const withTransition = (element: JSX.Element) => (
    <PageTransition direction={navigationType === "POP" ? "back" : "forward"}>
      {element}
    </PageTransition>
  );
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
      "/fitness/exercises/create",
    ].includes(path);
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.info("[AuraFit] route", location.pathname);
    }
  }, [location.pathname]);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/nutrition" replace />} />
        <Route
          path="/nutrition"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<Nutrition />)
            ) : (
              <Nutrition />
            )
          }
        />
        <Route
          path="/nutrition/progress"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<Progress />)
            ) : (
              <Progress />
            )
          }
        />
        <Route
          path="/nutrition/goals"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<Goals />)
            ) : (
              <Goals />
            )
          }
        />
        <Route
          path="/nutrition/groceries"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<Groceries />)
            ) : (
              <Groceries />
            )
          }
        />
        <Route
          path="/nutrition/add-food"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<AddFood />)
            ) : (
              <AddFood />
            )
          }
        />
        <Route
          path="/nutrition/add-food/create"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<CreateFood />)
            ) : (
              <CreateFood />
            )
          }
        />
        <Route
          path="/nutrition/add-food/scan"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<ScanBarcode />)
            ) : (
              <ScanBarcode />
            )
          }
        />
        <Route
          path="/nutrition/food/edit"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<EditFood />)
            ) : (
              <EditFood />
            )
          }
        />
        <Route
          path="/fitness"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<Fitness />)
            ) : (
              <Fitness />
            )
          }
        />
        <Route
          path="/fitness/workouts/:planId/:workoutId"
          element={<WorkoutDetails />}
        />
        <Route
          path="/fitness/workouts/:planId/:workoutId/:mode"
          element={<WorkoutDetails />}
        />
        <Route
          path="/fitness/workouts/:planId/:workoutId/exercises/:exerciseId/guide"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<ExerciseGuide />)
            ) : (
              <ExerciseGuide />
            )
          }
        />
        <Route
          path="/fitness/exercises/create"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<CreateExercise />)
            ) : (
              <CreateExercise />
            )
          }
        />
        <Route
          path="/fitness/exercises/:exerciseId/edit"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<EditExercise />)
            ) : (
              <EditExercise />
            )
          }
        />
        <Route
          path="/fitness/exercises/add"
          element={
            shouldAnimate(location.pathname) ? (
              withTransition(<AddExerciseToWorkout />)
            ) : (
              <AddExerciseToWorkout />
            )
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const AppShell = () => {
  const auth = useAuth();
  const needsAuth = auth.status === "ready" && !auth.userId;
  const [showSplash, setShowSplash] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);

  useEffect(() => {
    if (!needsAuth) {
      setShowSplash(false);
      setAuthOpen(false);
      return;
    }
    setShowSplash(true);
    const timer = window.setTimeout(() => {
      setShowSplash(false);
      setAuthOpen(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [needsAuth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (needsAuth || auth.status !== "ready") return;
    const seen = window.localStorage.getItem("aurafit-carousel-v1");
    setCarouselOpen(!seen);
  }, [needsAuth, auth.status]);

  return (
    <>
      {needsAuth && showSplash && (
        <SplashScreen
          onContinue={() => {
            setShowSplash(false);
            setAuthOpen(true);
          }}
        />
      )}
      <AuthDialog open={needsAuth && authOpen} onClose={() => setAuthOpen(false)} />
      {!needsAuth && carouselOpen && (
        <OnboardingCarousel
          onFinish={() => {
            if (typeof window !== "undefined") {
              window.localStorage.setItem("aurafit-carousel-v1", "true");
            }
            setCarouselOpen(false);
          }}
        />
      )}
      {!needsAuth && !carouselOpen && <OnboardingDialog />}
      <BrowserRouter>
        <Suspense
          fallback={
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
          }
        >
          <AnimatedRoutes />
        </Suspense>
      </BrowserRouter>
    </>
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
        <Toaster />
        <Sonner />
        <AppStoreProvider>
          <AppShell />
        </AppStoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
