import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { CreateFoodForm } from "@/components/aura/CreateFoodSheet";
import { CREATED_FOOD_KEY } from "@/lib/storageKeys";
import { useAppStore } from "@/state/AppStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const CreateFood = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/nutrition/add-food";
  const { foodCatalog } = useAppStore();

  return (
    <AppShell experience="nutrition" showNav={false}>
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4">
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-card/80 text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
            onClick={() =>
              navigate(`${returnTo}?${searchParams.toString()}`)
            }
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <p className="ml-3 text-sm font-semibold text-foreground">
            Create food
          </p>
        </div>

        <CreateFoodForm
          onCreate={async (payload) => foodCatalog.createFood(payload)}
          onComplete={(created) => {
            if (typeof window !== "undefined" && created) {
              window.localStorage.setItem(
                CREATED_FOOD_KEY,
                JSON.stringify({ food: created }),
              );
            }
            navigate(`/nutrition/add-food?${searchParams.toString()}`);
          }}
        />
      </div>
    </AppShell>
  );
};

export default CreateFood;
