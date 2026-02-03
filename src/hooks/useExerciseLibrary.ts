import { useCallback, useMemo, useState } from "react";
import type { Exercise, ExerciseSearchStatus } from "@/types/fitness";
import { ensureUser, searchExercises } from "@/lib/api";

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
      typeof item.image_url === "string"
        ? item.image_url
        : typeof item.imageUrl === "string"
          ? item.imageUrl
          : undefined,
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
  const results = await searchExercises(query, true, scope);
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
    }),
    [query, results, status, error, searchExercises],
  );
};
