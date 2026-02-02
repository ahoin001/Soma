import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Droplets } from "lucide-react";

type WaterCardProps = {
  totalMl: number;
  goalMl: number;
  onAdd: (amountMl: number) => void;
};

const formatMl = (value: number) => `${Math.round(value)} ml`;

export const WaterCard = ({ totalMl, goalMl, onAdd }: WaterCardProps) => {
  const [custom, setCustom] = useState("");
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

  const addCustom = () => {
    const numeric = Number(custom);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    onAdd(Math.round(numeric));
    setCustom("");
  };

  return (
    <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Water
          </p>
          <h3 className="text-lg font-display font-semibold text-slate-900">
            Daily wins
          </h3>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
          <Droplets className="h-4 w-4" />
          {formatMl(totalMl)}
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-emerald-100 bg-emerald-50/60 px-4 py-4">
        <div className="flex items-center justify-between text-xs text-emerald-700/80">
          <span>{Math.round(progress)}% of goal</span>
          <span>Goal {formatMl(goalMl)}</span>
        </div>
        <div className="mt-3 grid grid-cols-8 gap-2">
          {cups.map((cup) => (
            <button
              key={cup.id}
              type="button"
              onClick={() => onAdd(stepMl)}
              className={`h-10 rounded-[10px] border text-xs transition ${
                cup.active
                  ? "border-emerald-400/60 bg-emerald-400/40 text-emerald-900"
                  : "border-emerald-200 bg-white text-emerald-500 hover:bg-emerald-100/60"
              }`}
              aria-label={`Add ${stepMl} ml`}
            >
              {cup.active ? "•" : "+"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_120px_120px] gap-2">
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
          variant="secondary"
          className="h-10 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          onClick={() => onAdd(250)}
        >
          +250 ml
        </Button>
        <Button
          type="button"
          className="h-10 rounded-full bg-aura-primary text-white hover:bg-aura-primary/90"
          onClick={addCustom}
        >
          Add
        </Button>
      </div>
    </Card>
  );
};
