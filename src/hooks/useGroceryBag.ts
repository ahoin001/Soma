import { useCallback, useEffect, useMemo, useState } from "react";
import { addGroceryBagItem, fetchGroceryBag, removeGroceryBagItem } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

export type GroceryBagItem = {
  id: string;
  name: string;
  bucket: "staples" | "rotation" | "special";
  macroGroup?: string | null;
  category?: string | null;
  createdAt?: string;
};

type GroceryBagState = "idle" | "loading" | "error";

type GroceryBagPayload = {
  name: string;
  bucket: "staples" | "rotation" | "special";
  macroGroup?: string | null;
  category?: string | null;
};

export const useGroceryBag = () => {
  const { userId } = useAuth();
  const [items, setItems] = useState<GroceryBagItem[]>([]);
  const [status, setStatus] = useState<GroceryBagState>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchGroceryBag();
      setItems((data.items ?? []) as GroceryBagItem[]);
      setStatus("idle");
    } catch (fetchError) {
      const detail =
        fetchError instanceof Error ? fetchError.message : "Unable to load bag.";
      setStatus("error");
      setError(detail);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh({
    userId,
    channelKey: "grocery-bag",
    subscriptions: [{ table: "grocery_bag_items" }],
    onRefresh: () => {
      void load();
    },
    debounceMs: 180,
  });

  const addItem = useCallback(async (payload: GroceryBagPayload) => {
    const data = await addGroceryBagItem(payload);
    if (data.item) {
      setItems((prev) => {
        const exists = prev.some((item) => item.id === data.item.id);
        return exists ? prev : [data.item, ...prev];
      });
    }
    return data.item;
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    await removeGroceryBagItem(itemId);
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  return useMemo(
    () => ({
      items,
      status,
      error,
      reload: load,
      addItem,
      removeItem,
    }),
    [items, status, error, load, addItem, removeItem],
  );
};
