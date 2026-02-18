import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AlternateOption = { id: number; name: string };

type ExerciseSwapModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalExerciseName: string;
  alternates: AlternateOption[];
  onSelect: (alternate: AlternateOption) => void;
  isLoading?: boolean;
};

export function ExerciseSwapModal({
  open,
  onOpenChange,
  originalExerciseName,
  alternates,
  onSelect,
  isLoading = false,
}: ExerciseSwapModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-white max-w-[min(360px,92vw)] rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="text-lg text-white">
            Do a different exercise
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-white/70">
          Swap &quot;{originalExerciseName}&quot; for one of these alternates this session.
        </p>
        <ul className="mt-3 space-y-2 max-h-[50vh] overflow-y-auto">
          {alternates.map((alt) => (
            <li key={alt.id}>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  onSelect(alt);
                  onOpenChange(false);
                }}
                className={cn(
                  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white",
                  "hover:bg-white/10 hover:border-white/20 transition-colors",
                  "disabled:opacity-50 disabled:pointer-events-none",
                )}
              >
                {alt.name}
              </button>
            </li>
          ))}
        </ul>
        {alternates.length === 0 && !isLoading && (
          <p className="text-sm text-white/50">No alternates defined for this slot.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
