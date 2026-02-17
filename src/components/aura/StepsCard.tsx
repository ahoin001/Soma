import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Watch } from "lucide-react";
import { useEffect, useState } from "react";

type StepsCardProps = {
  steps: number;
  goal: number;
  connected: boolean;
  onConnect?: () => void;
  onManualSave?: (steps: number) => void;
  onGoalSave?: (goal: number) => void;
};

export const StepsCard = ({
  steps,
  goal,
  connected,
  onConnect,
  onManualSave,
  onGoalSave,
}: StepsCardProps) => {
  const progress = goal > 0 ? Math.min((steps / goal) * 100, 100) : 0;
  const [manual, setManual] = useState("");
  const [goalInput, setGoalInput] = useState(String(goal));

  useEffect(() => {
    setGoalInput(String(goal));
  }, [goal]);

  return (
    <Card className="card-default mt-4 overflow-hidden rounded-[28px] px-5 py-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-title">Steps</p>
          <h2 className="text-lg font-display font-semibold text-foreground">
            Daily movement
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">
          <Watch className="h-4 w-4" />
          Apple Watch
        </div>
      </div>

      {connected ? (
        <>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Steps today</p>
              <p className="text-3xl font-display font-semibold text-foreground">
                {steps.toLocaleString()}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              Goal {goal.toLocaleString()}
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2 bg-secondary" />
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            Connect your Apple Watch to automatically track steps and activity.
          </p>
          <Button
            type="button"
            className="mt-4 w-full rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={onConnect}
          >
            Connect Apple Watch
          </Button>
        </>
      )}

      {onManualSave && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <Input
              type="number"
              min={0}
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              placeholder="Add steps"
              className="h-10 rounded-full"
            />
            <Button
              type="button"
              className="h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                const numeric = Number(manual);
                if (!Number.isFinite(numeric) || numeric <= 0) return;
                onManualSave(numeric);
                setManual("");
              }}
            >
              Save
            </Button>
          </div>
          {onGoalSave && (
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <Input
                type="number"
                min={0}
                value={goalInput}
                onChange={(event) => setGoalInput(event.target.value)}
                placeholder="Goal"
                className="h-10 rounded-full"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
                onClick={() => {
                  const numeric = Number(goalInput);
                  if (!Number.isFinite(numeric) || numeric <= 0) return;
                  onGoalSave(numeric);
                }}
              >
                Set goal
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
