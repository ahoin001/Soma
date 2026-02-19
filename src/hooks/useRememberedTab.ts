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
  const isBrowser = typeof window !== "undefined";

  const readStored = (nextKey: string): T => {
    if (!isBrowser) return defaultValue;
    const raw = window.localStorage.getItem(nextKey);
    if (raw && values.includes(raw as T)) return raw as T;
    return defaultValue;
  };

  const [value, setValue] = useState<T>(() => readStored(storageKey));

  useEffect(() => {
    setValue(readStored(storageKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!isBrowser || !values.includes(value)) return;
    window.localStorage.setItem(storageKey, value);
  }, [isBrowser, storageKey, value, values]);

  return [value, setValue] as const;
};
