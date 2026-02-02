type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type CacheOptions = {
  ttlMs: number;
  maxEntries: number;
};

export const createCache = <T>(options: CacheOptions) => {
  const store = new Map<string, CacheEntry<T>>();

  const prune = () => {
    if (store.size <= options.maxEntries) return;
    const extra = store.size - options.maxEntries;
    const keys = store.keys();
    for (let i = 0; i < extra; i += 1) {
      const next = keys.next().value as string | undefined;
      if (next) store.delete(next);
    }
  };

  return {
    get: (key: string) => {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    set: (key: string, value: T) => {
      store.set(key, { value, expiresAt: Date.now() + options.ttlMs });
      prune();
    },
    invalidate: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};
