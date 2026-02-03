import { useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { CreateFoodForm } from "@/components/aura/CreateFoodSheet";
import { useAppStore } from "@/state/AppStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

type LocationState = {
  mealId?: string;
};

const CreateFood = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const { foodCatalog } = useAppStore();

  return (
    <AppShell experience="nutrition" showNav={false}>
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4">
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/80 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <p className="ml-3 text-sm font-semibold text-slate-700">
            Create food
          </p>
        </div>

        <CreateFoodForm
          onCreate={async (payload) => foodCatalog.createFood(payload)}
          onComplete={(created) => {
            navigate("/nutrition/add-food", {
              state: { mealId: state.mealId, createdFood: created },
            });
          }}
        />
      </div>
    </AppShell>
  );
};

export default CreateFood;
