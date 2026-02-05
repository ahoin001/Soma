import { useNavigate, useSearchParams } from "react-router-dom";
import { BarcodeScanSheet } from "@/components/aura/BarcodeScanSheet";
import { AppShell } from "@/components/aura";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";

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
          "aurafit-created-food",
          JSON.stringify({ food: fetched }),
        );
      }
      navigate(`/nutrition/add-food?${searchParams.toString()}`);
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
          navigate(`${returnTo}?${searchParams.toString()}`)
        }
        onDetected={handleDetected}
      />
    </AppShell>
  );
};

export default ScanBarcode;
