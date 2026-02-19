import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

type UseRememberedStateOptions<T> = {
  key: string;
  defaultValue: T;
  parse?: (raw: unknown) => T;
  serialize?: (value: T) => unknown;
};

export const useRememberedState = <T>({
  key,
  defaultValue,
  parse,
  serialize,
}: UseRememberedStateOptions<T>) => {
  const location = useLocation();
  const storageKey = useMemo(
    () => `state:${location.pathname}:${key}`,
    [key, location.pathname],
  );

  const readStored = (nextKey: string): T => {
    if (typeof window === "undefined") return defaultValue;
    const raw = window.localStorage.getItem(nextKey);
    if (!raw) return defaultValue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parse ? parse(parsed) : (parsed as T);
    } catch {
      return defaultValue;
    }
  };

  const [value, setValue] = useState<T>(() => readStored(storageKey));

  useEffect(() => {
    setValue(readStored(storageKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = serialize ? serialize(value) : value;
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [serialize, storageKey, value]);

  return [value, setValue] as const;
};
