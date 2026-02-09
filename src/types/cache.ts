/**
 * Shared cache entry type for client-side caches (food catalog, exercise library, etc.).
 */

export type CacheEntry<T> = {
  updatedAt: number;
  value: T;
};
