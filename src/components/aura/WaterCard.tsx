import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Droplets, Plus } from "lucide-react";

type WaterCardProps = {
  totalMl: number;
  goalMl: number;
  onAdd: (amountMl: number) => void;
  onSetTotal?: (totalMl: number) => void;
  onGoalSave?: (goalMl: number) => void;
};

const formatMl = (value: number) => `${Math.round(value)} ml`;
const formatOz = (value: number) => `${Math.round(value / 29.5735)} fl oz`;

const STEP_ML = 250;
const CUP_COUNT = 8;
/** Stagger delay between each cup animation in ms */
const STAGGER_MS = 55;

export const WaterCard = ({
  totalMl,
  goalMl,
  onAdd,
  onSetTotal,
  onGoalSave,
}: WaterCardProps) => {
  const [custom, setCustom] = useState("");
  const [goalInput, setGoalInput] = useState(String(goalMl));

  // --- Local filled state for instant UI feedback ---
  const filledFromProp = Math.min(CUP_COUNT, Math.round(totalMl / STEP_ML));
  const [localFilled, setLocalFilled] = useState(filledFromProp);
  const prevFilledRef = useRef(localFilled);
  const lastTapRef = useRef(0);

  // Sync from server prop, but only if the user hasn't tapped recently
  // (prevents a stale refetch from overwriting the local state).
  useEffect(() => {
    const elapsed = Date.now() - lastTapRef.current;
    if (elapsed > 1500) {
      setLocalFilled(filledFromProp);
    }
  }, [filledFromProp]);

  // Track the previous filled count for animation direction
  const prevFilled = prevFilledRef.current;
  useEffect(() => {
    prevFilledRef.current = localFilled;
  }, [localFilled]);

  const isFilling = localFilled > prevFilled;
  const isUnfilling = localFilled < prevFilled;

  const cups = useMemo(
    () =>
      Array.from({ length: CUP_COUNT }, (_, i) => {
        const active = i < localFilled;
        // Compute a stagger delay (ms) for the transition
        let delay = 0;
        if (isFilling && i >= prevFilled && i < localFilled) {
          // Filling: stagger from the first new cup outward
          delay = (i - prevFilled) * STAGGER_MS;
        } else if (isUnfilling && i >= localFilled && i < prevFilled) {
          // Unfilling: stagger from the last removed cup inward
          delay = (prevFilled - 1 - i) * STAGGER_MS;
        }
        return { id: i, active, delay };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localFilled, prevFilled, isFilling, isUnfilling],
  );

  const handleCupSelect = useCallback(
    (index: number) => {
      const nextFilled = index + 1;
      // Allow toggling off: tapping the last filled cup clears it
      const target = nextFilled === localFilled ? index : nextFilled;
      const nextTotal = target * STEP_ML;

      lastTapRef.current = Date.now();
      setLocalFilled(target);

      if (onSetTotal) {
        onSetTotal(nextTotal);
      } else {
        const delta = nextTotal - totalMl;
        if (delta > 0) onAdd(delta);
      }
    },
    [localFilled, totalMl, onSetTotal, onAdd],
  );

  const addCustom = () => {
    const numeric = Number(custom);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    onAdd(Math.round(numeric));
    setCustom("");
  };

  useEffect(() => {
    setGoalInput(String(goalMl));
  }, [goalMl]);

  const progress = goalMl > 0 ? Math.min((totalMl / goalMl) * 100, 100) : 0;

  return (
    <Card className="mt-6 rounded-[28px] border border-border/60 bg-card px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary/70">
            Daily wins
          </p>
          <h3 className="text-lg font-display font-semibold text-foreground">
            Water
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatOz(totalMl)} &bull; {Math.round(progress)}% of goal
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">
          <Droplets className="h-4 w-4" />
          {formatMl(totalMl)}
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-border/60 bg-secondary/55 px-4 py-4">
        <div className="flex items-center justify-between text-xs text-secondary-foreground/80">
          <span>Goal {formatMl(goalMl)}</span>
          <span>Tap a cup to set your count</span>
        </div>
        <div className="mt-4 grid grid-cols-8 gap-2">
          {cups.map((cup) => {
            const isNext = cup.id === localFilled;
            return (
              <button
                key={cup.id}
                type="button"
                onClick={() => handleCupSelect(cup.id)}
                className="relative flex h-12 items-end justify-center rounded-[14px] border border-border/60 bg-card transition-transform hover:bg-secondary/70"
                style={{
                  // Pop animation via scale
                  transform: cup.active ? "scale(1)" : "scale(1)",
                  transitionDelay: `${cup.delay}ms`,
                  transitionDuration: "300ms",
                }}
                aria-label={`Set water to ${formatMl((cup.id + 1) * STEP_ML)}`}
              >
                {/* Water fill level */}
                <span
                  className={`absolute inset-x-1 bottom-1 origin-bottom rounded-[10px] ${
                    cup.active
                      ? "bg-gradient-to-t from-primary via-accent to-secondary"
                      : "bg-secondary/70"
                  }`}
                  style={{
                    height: cup.active ? "70%" : "20%",
                    transitionProperty: "height, opacity, background-color",
                    transitionTimingFunction: cup.active
                      ? "cubic-bezier(0.34, 1.56, 0.64, 1)" // spring-like overshoot for fill
                      : "cubic-bezier(0.4, 0, 0.2, 1)",     // smooth ease-out for unfill
                    transitionDuration: cup.active ? "400ms" : "300ms",
                    transitionDelay: `${cup.delay}ms`,
                    opacity: cup.active ? 1 : 0.6,
                  }}
                />
                {/* Plus icon on the next empty cup */}
                {isNext && !cup.active ? (
                  <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-card text-primary shadow-sm">
                    <Plus className="h-3 w-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <Input
            type="number"
            min={0}
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="Custom ml"
            className="h-10 rounded-full"
          />
          <Button
            type="button"
            className="h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={addCustom}
          >
            Add
          </Button>
        </div>
        {onGoalSave && (
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <Input
              type="number"
              min={0}
              value={goalInput}
              onChange={(event) => setGoalInput(event.target.value)}
              placeholder="Goal ml"
              className="h-10 rounded-full"
            />
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
              onClick={() => {
                const numeric = Number(goalInput);
                if (!Number.isFinite(numeric) || numeric <= 0) return;
                onGoalSave(Math.round(numeric));
              }}
            >
              Set goal
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
