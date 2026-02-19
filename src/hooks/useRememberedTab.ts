import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

type UseRememberedTabOptions<T extends string> = {
  key: string;
  values: readonly T[];
  defaultValue: T;
};

export const useRememberedTab = <T extends string>({
  key,
  values,
  defaultValue,
}: UseRememberedTabOptions<T>) => {
  const location = useLocation();
  const storageKey = useMemo(
    () => `tab:${location.pathname}:${key}`,
    [key, location.pathname],
  );

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw && values.includes(raw as T)) return raw as T;
    return defaultValue;
  });

  useEffect(() => {
    if (!values.includes(value)) return;
    window.sessionStorage.setItem(storageKey, value);
  }, [storageKey, value, values]);

  return [value, setValue] as const;
};
