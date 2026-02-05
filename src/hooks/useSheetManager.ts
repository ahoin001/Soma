import { useCallback, useEffect, useState } from "react";

type SheetManagerOptions = {
  storageKey?: string;
  persist?: boolean;
};

export const useSheetManager = <T extends string>(
  initial: T | null = null,
  options: SheetManagerOptions = {},
) => {
  const { storageKey, persist = false } = options;
  const [activeSheet, setActiveSheet] = useState<T | null>(() => {
    if (!persist || !storageKey || typeof window === "undefined") {
      return initial;
    }
    const stored = window.sessionStorage.getItem(storageKey);
    return stored ? (stored as T) : initial;
  });

  const openSheet = useCallback((key: T) => {
    setActiveSheet(key);
  }, []);

  const closeSheets = useCallback(() => {
    setActiveSheet(null);
  }, []);

  const isOpen = useCallback((key: T) => activeSheet === key, [activeSheet]);

  useEffect(() => {
    if (!persist || !storageKey || typeof window === "undefined") return;
    if (activeSheet) {
      window.sessionStorage.setItem(storageKey, activeSheet);
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [activeSheet, persist, storageKey]);

  return { activeSheet, openSheet, closeSheets, setActiveSheet, isOpen };
};
