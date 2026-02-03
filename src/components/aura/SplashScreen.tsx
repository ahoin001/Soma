import { Button } from "@/components/ui/button";

type SplashScreenProps = {
  onContinue: () => void;
};

export const SplashScreen = ({ onContinue }: SplashScreenProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-emerald-100 via-emerald-50 to-white text-emerald-950">
    <div className="mx-auto w-full max-w-sm px-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/80 text-2xl font-semibold tracking-tight shadow-[0_16px_30px_rgba(16,185,129,0.2)]">
        AF
      </div>
      <p className="mt-5 text-xs uppercase tracking-[0.3em] text-emerald-400">AuraFit</p>
      <h1 className="mt-2 text-2xl font-display tracking-tight">
        Premium wellness, simplified.
      </h1>
      <p className="mt-2 text-sm text-emerald-700/70">
        Nutrition, training, recovery — synced to a plan that fits you.
      </p>
      <div className="mt-6 space-y-3 rounded-[24px] border border-emerald-100 bg-white/90 px-4 py-4 text-left text-xs text-emerald-700 shadow-[0_14px_30px_rgba(16,185,129,0.12)]">
        <div className="flex items-center justify-between">
          <span>Smart calorie targets</span>
          <span className="text-emerald-500">Live</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Workout planning + tracking</span>
          <span className="text-emerald-500">Ready</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Hydration + steps</span>
          <span className="text-emerald-500">Daily</span>
        </div>
      </div>
      <Button
        type="button"
        className="mt-6 w-full rounded-full bg-aura-primary py-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
        onClick={onContinue}
      >
        Get started
      </Button>
      <p className="mt-3 text-[11px] text-emerald-600/70">
        We’ll personalize your plan in under 2 minutes.
      </p>
    </div>
  </div>
);
