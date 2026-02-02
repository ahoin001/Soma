import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type CreateFoodSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (payload: {
    name: string;
    kcal: number;
    carbs: number;
    protein: number;
    fat: number;
  }) => Promise<void>;
};

export const CreateFoodSheet = ({
  open,
  onOpenChange,
  onCreate,
}: CreateFoodSheetProps) => {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      toast("Enter a food name");
      return;
    }
    const payload = {
      name: name.trim(),
      kcal: Number(kcal) || 0,
      carbs: Number(carbs) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
    };
    if (onCreate) {
      await onCreate(payload);
    }
    toast("Custom food saved", {
      description: `${payload.name} is ready to log.`,
    });
    setName("");
    setKcal("");
    setCarbs("");
    setProtein("");
    setFat("");
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="px-5 pb-6 pt-2">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <Plus className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-xl font-display font-semibold text-slate-900">
              Create custom food
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Add a manual entry with macro details.
            </p>
          </div>

          <div className="mt-6 space-y-3 rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Food name"
              className="rounded-full"
            />
            <Input
              value={kcal}
              onChange={(event) => setKcal(event.target.value)}
              placeholder="Calories (kcal)"
              className="rounded-full"
              inputMode="numeric"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={carbs}
                onChange={(event) => setCarbs(event.target.value)}
                placeholder="Carbs"
                className="rounded-full"
                inputMode="numeric"
              />
              <Input
                value={protein}
                onChange={(event) => setProtein(event.target.value)}
                placeholder="Protein"
                className="rounded-full"
                inputMode="numeric"
              />
              <Input
                value={fat}
                onChange={(event) => setFat(event.target.value)}
                placeholder="Fat"
                className="rounded-full"
                inputMode="numeric"
              />
            </div>
          </div>

          <Button
            className="mt-6 w-full rounded-full bg-aura-primary py-6 text-base font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
            onClick={handleSave}
          >
            Save food
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
