import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
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
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/aura";
import NotFound from "./pages/NotFound";

const Nutrition = lazy(() => import("./pages/Nutrition"));
const Progress = lazy(() => import("./pages/Progress"));
const Goals = lazy(() => import("./pages/Goals"));
const Groceries = lazy(() => import("./pages/Groceries"));
const Fitness = lazy(() => import("./pages/Fitness"));
const WorkoutDetails = lazy(() => import("./pages/WorkoutDetails"));

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const withTransition = (element: JSX.Element) => (
    <PageTransition direction={navigationType === "POP" ? "back" : "forward"}>
      {element}
    </PageTransition>
  );
  const shouldAnimate = (path: string) =>
    [
      "/nutrition",
      "/nutrition/progress",
      "/nutrition/goals",
      "/nutrition/groceries",
      "/fitness",
    ].includes(path);

  return (
    <AnimatePresence mode="wait" initial={false}>
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
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppStoreProvider>
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
      </AppStoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
