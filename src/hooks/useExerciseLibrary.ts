import { useCallback, useMemo, useState } from "react";
import type { Exercise, ExerciseSearchStatus } from "@/types/fitness";
import { normalizeExerciseImageUrl } from "@/lib/exerciseImageUrl";
import { EXERCISE_CACHE_KEY } from "@/lib/storageKeys";
import { ensureUser, searchExercises } from "@/lib/api";
import type { CacheEntry } from "@/types/cache";

type ExerciseCache = {
  searches: Record<string, CacheEntry<Exercise[]>>;
};

const CACHE_KEY = EXERCISE_CACHE_KEY;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PAGE_LIMIT = 50;

const emptyCache: ExerciseCache = {
  searches: {},
};

const isBrowser = typeof window !== "undefined";

const loadCache = (): ExerciseCache => {
  if (!isBrowser) return emptyCache;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return emptyCache;
    const parsed = JSON.parse(raw) as ExerciseCache;
    return {
      searches: parsed.searches ?? {},
    };
  } catch {
    return emptyCache;
  }
};

const persistCache = (cache: ExerciseCache) => {
  if (!isBrowser) return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

const isFresh = <T,>(entry?: CacheEntry<T>) =>
  !!entry && Date.now() - entry.updatedAt < CACHE_TTL_MS;

const normalizeQuery = (value: string) => value.trim().toLowerCase();

const cleanDescription = (value: string) =>
  value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const mapExercise = (item: Record<string, unknown>) => {
  const rawCategory =
    typeof item.category === "string"
      ? item.category
      : (item.category as { name?: string } | undefined)?.name;
  const equipment = Array.isArray(item.equipment)
    ? item.equipment.map((equip) =>
        typeof equip === "string"
          ? equip
          : String((equip as { name?: string }).name ?? ""),
      )
    : [];
  const muscles = Array.isArray(item.muscles)
    ? item.muscles.map((muscle) =>
        typeof muscle === "string"
          ? muscle
          : String((muscle as { name?: string }).name ?? ""),
      )
    : [];
  return {
    id: Number(item.id ?? 0),
    name: String(item.name ?? ""),
    description: cleanDescription(String(item.description ?? "")),
    category: String(rawCategory ?? "General"),
    equipment: equipment.filter(Boolean),
    muscles: muscles.filter(Boolean),
    imageUrl:
      normalizeExerciseImageUrl(item.image_url) ??
      normalizeExerciseImageUrl(item.imageUrl) ??
      undefined,
  };
};

const fetchExercises = async (
  query: string,
  scope: "all" | "mine",
  signal?: AbortSignal,
) => {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  await ensureUser();
  const results = await searchExercises(query, false, scope);
  const mapped = results.items.map(mapExercise).filter((exercise) => exercise.id);
  return mapped;
};

export const useExerciseLibrary = () => {
  const [cache, setCache] = useState<ExerciseCache>(() => loadCache());
  const [results, setResults] = useState<Exercise[]>([]);
  const [status, setStatus] = useState<ExerciseSearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const persist = useCallback((next: ExerciseCache) => {
    setCache(next);
    persistCache(next);
  }, []);

  const clearSearchCache = useCallback(() => {
    setCache((prev) => {
      if (!Object.keys(prev.searches).length) return prev;
      const nextCache: ExerciseCache = { ...prev, searches: {} };
      persistCache(nextCache);
      return nextCache;
    });
  }, []);

  const upsertExercise = useCallback(
    (exercise: Exercise, options?: { prepend?: boolean }) => {
      setResults((prev) => {
        const index = prev.findIndex((item) => item.id === exercise.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = exercise;
          return next;
        }
        return options?.prepend === false ? prev : [exercise, ...prev];
      });
      setCache((prev) => {
        if (!Object.keys(prev.searches).length) return prev;
        let changed = false;
        const nextSearches: ExerciseCache["searches"] = {};
        Object.entries(prev.searches).forEach(([key, entry]) => {
          const index = entry.value.findIndex((item) => item.id === exercise.id);
          if (index === -1) {
            nextSearches[key] = entry;
            return;
          }
          const nextValue = [...entry.value];
          nextValue[index] = exercise;
          nextSearches[key] = { ...entry, value: nextValue, updatedAt: Date.now() };
          changed = true;
        });
        if (!changed) return prev;
        const nextCache = { ...prev, searches: nextSearches };
        persistCache(nextCache);
        return nextCache;
      });
    },
    [],
  );

  const upsertExerciseRecord = useCallback(
    (record: Record<string, unknown>, options?: { prepend?: boolean }) => {
      const mapped = mapExercise(record);
      if (!mapped.id) return;
      upsertExercise(mapped, options);
    },
    [upsertExercise],
  );

  const searchExercises = useCallback(
    async (
      nextQuery: string,
      signal?: AbortSignal,
      scope: "all" | "mine" = "all",
    ) => {
      const normalized = normalizeQuery(nextQuery);
      const cacheKey = `${normalized}|${scope}`;
      setQuery(nextQuery);
      if (!normalized) {
        setResults([]);
        setStatus("idle");
        setError(null);
        return;
      }
      const cached = cache.searches[cacheKey];
      if (isFresh(cached)) {
        setResults(cached.value);
        setStatus("idle");
        setError(null);
        return;
      }
      setStatus("loading");
      setError(null);
      try {
        const fetched = await fetchExercises(normalized, scope, signal);
        const nextCache: ExerciseCache = {
          searches: {
            ...cache.searches,
            [cacheKey]: { value: fetched, updatedAt: Date.now() },
          },
        };
        persist(nextCache);
        setResults(fetched);
        setStatus("idle");
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
        const detail =
          fetchError instanceof Error ? fetchError.message : "Search failed.";
        setStatus("error");
        setError(detail);
      }
    },
    [cache.searches, persist],
  );

  return useMemo(
    () => ({
      query,
      results,
      status,
      error,
      searchExercises,
      setQuery,
      upsertExercise,
      upsertExerciseRecord,
      clearSearchCache,
    }),
    [
      query,
      results,
      status,
      error,
      searchExercises,
      upsertExercise,
      upsertExerciseRecord,
      clearSearchCache,
    ],
  );
};
