import { useNavigate } from "react-router-dom";
import { AppShell, LiveSessionPanel } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";

const formatSessionDate = (ms: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));

const FitnessLog = () => {
  const navigate = useNavigate();
  const { fitnessPlanner } = useAppStore();
  const history = fitnessPlanner.history ?? [];
  const latestSession = history[0] ?? null;

  return (
    <AppShell experience="fitness" onAddAction={() => navigate("/fitness")} safeAreaTop="extra">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Flow
            </p>
            <h1 className="mt-2 text-2xl font-display font-semibold">
              Session log
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Keep your log open while you train.
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

        <div className="mt-6 space-y-4">
          <LiveSessionPanel
            activeSession={fitnessPlanner.activeSession}
            activeRoutine={fitnessPlanner.activeRoutine}
            onLogSet={fitnessPlanner.logSet}
            onAdvanceExercise={fitnessPlanner.advanceExercise}
            onFinishSession={fitnessPlanner.finishSession}
            unitUsed={fitnessPlanner.weightUnit}
          />
          {!fitnessPlanner.activeSession ? (
            <Button
              className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              onClick={() => navigate("/fitness")}
            >
              Start a session
            </Button>
          ) : null}

          {history.length > 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Recent sessions
              </p>
              <p className="mt-1 text-sm font-medium text-white/90">
                Last {Math.min(history.length, 20)} finished
              </p>
              {latestSession ? (
                <Button
                  variant="outline"
                  className="mt-3 w-full rounded-full border-white/20 text-white hover:bg-white/10"
                  onClick={async () => {
                    const summary = [
                      "IronFlow Session Summary",
                      formatSessionDate(latestSession.endedAt),
                      `${latestSession.totalSets} sets · ${Math.round(latestSession.totalVolume)} kg`,
                    ].join("\n");
                    try {
                      await navigator.clipboard.writeText(summary);
                      toast("Session summary copied");
                    } catch {
                      toast("Unable to copy summary");
                    }
                  }}
                >
                  Copy latest session summary
                </Button>
              ) : null}
              <ul className="mt-3 space-y-2">
                {history.slice(0, 20).map((session) => (
                  <li
                    key={session.id}
                    className="flex items-center justify-between rounded-[16px] border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    <span className="text-white/90">
                      {formatSessionDate(session.endedAt)}
                    </span>
                    <span className="tabular-nums text-white/70">
                      {session.totalSets} sets · {Math.round(session.totalVolume)} kg
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
};

export default FitnessLog;
