import { useCallback, useMemo, useState } from "react";
import type { Exercise, ExerciseSearchStatus } from "@/types/fitness";
import { searchWgerExercises } from "@/data/exerciseApi";

type CacheEntry<T> = {
  updatedAt: number;
  value: T;
};

type ExerciseCache = {
  searches: Record<string, CacheEntry<Exercise[]>>;
};

const CACHE_KEY = "ironflow-exercise-cache-v1";
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

const mapExercise = (item: Record<string, unknown>) => ({
  id: Number(item.id ?? 0),
  name: String(item.name ?? ""),
  description: cleanDescription(String(item.description ?? "")),
  category: String(item.category?.name ?? "General"),
  equipment: Array.isArray(item.equipment)
    ? item.equipment.map((equip) => String(equip.name ?? ""))
    : [],
  muscles: Array.isArray(item.muscles)
    ? item.muscles.map((muscle) => String(muscle.name ?? ""))
    : [],
});

const fetchExercises = async (query: string, signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  const results = await searchWgerExercises(query);
  return results.map(mapExercise).filter((exercise) => exercise.id);
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

  const searchExercises = useCallback(
    async (nextQuery: string, signal?: AbortSignal) => {
      const normalized = normalizeQuery(nextQuery);
      setQuery(nextQuery);
      if (!normalized) {
        setResults([]);
        setStatus("idle");
        setError(null);
        return;
      }
      const cached = cache.searches[normalized];
      if (isFresh(cached)) {
        setResults(cached.value);
        setStatus("idle");
        setError(null);
        return;
      }
      setStatus("loading");
      setError(null);
      try {
        const fetched = await fetchExercises(normalized, signal);
        const nextCache: ExerciseCache = {
          searches: {
            ...cache.searches,
            [normalized]: { value: fetched, updatedAt: Date.now() },
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
    }),
    [query, results, status, error, searchExercises],
  );
};
