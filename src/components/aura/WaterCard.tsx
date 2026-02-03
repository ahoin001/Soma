import { useEffect, useMemo, useState } from "react";
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

export const WaterCard = ({
  totalMl,
  goalMl,
  onAdd,
  onSetTotal,
  onGoalSave,
}: WaterCardProps) => {
  const [custom, setCustom] = useState("");
  const [goalInput, setGoalInput] = useState(String(goalMl));
  const stepMl = 250;
  const cupCount = 8;
  const filled = Math.min(cupCount, Math.round(totalMl / stepMl));
  const progress = goalMl > 0 ? Math.min((totalMl / goalMl) * 100, 100) : 0;

  const cups = useMemo(
    () =>
      Array.from({ length: cupCount }, (_, index) => ({
        id: index,
        active: index < filled,
      })),
    [filled],
  );

  const handleCupSelect = (index: number) => {
    const nextTotal = (index + 1) * stepMl;
    if (onSetTotal) {
      onSetTotal(nextTotal);
      return;
    }
    const delta = nextTotal - totalMl;
    if (delta > 0) onAdd(delta);
  };

  const addCustom = () => {
    const numeric = Number(custom);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    onAdd(Math.round(numeric));
    setCustom("");
  };

  useEffect(() => {
    setGoalInput(String(goalMl));
  }, [goalMl]);

  return (
    <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Daily wins
          </p>
          <h3 className="text-lg font-display font-semibold text-slate-900">
            Water
          </h3>
          <p className="text-xs text-slate-500">
            {formatOz(totalMl)} • {Math.round(progress)}% of goal
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
          <Droplets className="h-4 w-4" />
          {formatMl(totalMl)}
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-emerald-100 bg-emerald-50/60 px-4 py-4">
        <div className="flex items-center justify-between text-xs text-emerald-700/80">
          <span>Goal {formatMl(goalMl)}</span>
          <span>Tap a cup to set your count</span>
        </div>
        <div className="mt-4 grid grid-cols-8 gap-2">
          {cups.map((cup) => {
            const isNext = cup.id === filled;
            return (
              <button
                key={cup.id}
                type="button"
                onClick={() => handleCupSelect(cup.id)}
                className={`relative flex h-12 items-end justify-center rounded-[14px] border border-emerald-200 bg-white transition hover:bg-emerald-50 ${
                  cup.active ? "animate-waterPop" : ""
                }`}
                aria-label={`Set water to ${formatMl((cup.id + 1) * stepMl)}`}
              >
                <span
                  className={`absolute inset-x-1 bottom-1 origin-bottom rounded-[10px] transition-[height] duration-500 ease-out ${
                    cup.active
                      ? "bg-gradient-to-t from-emerald-400 via-teal-300 to-sky-200 animate-waterFill"
                      : "bg-emerald-100/60"
                  }`}
                  style={{ height: cup.active ? "70%" : "20%" }}
                />
                {isNext && !cup.active ? (
                  <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white text-emerald-500 shadow-sm">
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
            className="h-10 rounded-full bg-aura-primary text-white hover:bg-aura-primary/90"
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
              className="h-10 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
