import { useNavigate, useSearchParams } from "react-router-dom";
import { BarcodeScanSheet } from "@/components/aura/BarcodeScanSheet";
import { AppShell } from "@/components/aura";
import { CREATED_FOOD_KEY } from "@/lib/storageKeys";
import { useAppStore } from "@/state/AppStore";
import { appToast } from "@/lib/toast";

const ScanBarcode = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/nutrition/add-food";
  const { foodCatalog } = useAppStore();

  const handleDetected = async (value: string) => {
    const fetched = await foodCatalog.lookupBarcode(value);
    if (fetched) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          CREATED_FOOD_KEY,
          JSON.stringify({ food: fetched }),
        );
      }
      navigate(`/nutrition/add-food?${searchParams.toString()}`);
      return;
    }
    appToast.info("No match found", {
      description: "Try searching manually or create a custom item.",
    });
  };

  return (
    <AppShell experience="nutrition" showNav={false}>
      <BarcodeScanSheet
        open
        onOpenChange={() =>
          navigate(`${returnTo}?${searchParams.toString()}`)
        }
        onDetected={handleDetected}
      />
    </AppShell>
  );
};

export default ScanBarcode;
