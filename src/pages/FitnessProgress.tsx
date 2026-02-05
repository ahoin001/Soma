import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";

const FitnessProgress = () => {
  const navigate = useNavigate();
  return (
    <AppShell experience="fitness" onAddAction={() => navigate("/fitness")}>
      <div className="mx-auto w-full max-w-sm px-5 pb-10 pt-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Pulse
            </p>
            <h1 className="mt-2 text-2xl font-display font-semibold">
              Progress
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Trends will appear as you log workouts.
            </p>
          </div>
          <Button
            variant="ghost"
            className="h-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => navigate("/fitness")}
          >
            Back
          </Button>
        </div>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 px-4 py-6 text-center">
          <p className="text-sm text-white/70">
            Your training trends will live here once you log sessions.
          </p>
          <Button
            className="mt-5 w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
            onClick={() => navigate("/fitness")}
          >
            Go to workouts
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default FitnessProgress;
