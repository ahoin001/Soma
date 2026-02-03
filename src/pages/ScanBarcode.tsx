import { useLocation, useNavigate } from "react-router-dom";
import { BarcodeScanSheet } from "@/components/aura/BarcodeScanSheet";
import { AppShell } from "@/components/aura";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";

type LocationState = {
  mealId?: string;
  returnTo?: string;
  tab?: "recent" | "liked" | "history";
  query?: string;
};

const ScanBarcode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const returnTo = state.returnTo ?? "/nutrition/add-food";
  const { foodCatalog } = useAppStore();

  const handleDetected = async (value: string) => {
    const fetched = await foodCatalog.lookupBarcode(value);
    if (fetched) {
      navigate("/nutrition/add-food", {
        state: {
          mealId: state.mealId,
          createdFood: fetched,
          returnTo,
          tab: state.tab,
          query: state.query,
        },
      });
      return;
    }
    toast("No match found", {
      description: "Try searching manually or create a custom item.",
    });
  };

  return (
    <AppShell experience="nutrition" showNav={false}>
      <BarcodeScanSheet
        open
        onOpenChange={() =>
          navigate(returnTo, {
            state: {
              mealId: state.mealId,
              returnTo,
              tab: state.tab,
              query: state.query,
            },
          })
        }
        onDetected={handleDetected}
      />
    </AppShell>
  );
};

export default ScanBarcode;
