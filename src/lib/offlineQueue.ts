/**
 * Offline Mutation Queue
 *
 * Stores pending mutations in IndexedDB when offline.
 * Automatically retries when connectivity is restored.
 *
 * Usage:
 * 1. Call `queueMutation()` when a mutation fails due to network error
 * 2. Call `processPendingMutations()` when coming back online
 * 3. Use `usePendingMutationsCount()` to show pending count in UI
 */

// ============================================================================
// Types
// ============================================================================

export type MutationType =
  | "nutrition.logFood"
  | "nutrition.removeLogItem"
  | "nutrition.updateLogItem"
  | "nutrition.setGoal"
  | "nutrition.setMacroTargets"
  | "tracking.addWeight"
  | "tracking.addWater"
  | "tracking.setWaterTotal"
  | "tracking.setSteps"
  | "tracking.updateStepsGoal"
  | "tracking.updateWaterGoal"
  | "food.create"
  | "food.toggleFavorite";

export type PendingMutation = {
  id: string;
  type: MutationType;
  payload: unknown;
  createdAt: number;
  retryCount: number;
  lastError?: string;
};

type MutationHandler = (payload: unknown) => Promise<void>;

// ============================================================================
// IndexedDB Setup
// ============================================================================

import { OFFLINE_DB_NAME } from "./storageKeys";

const DB_NAME = OFFLINE_DB_NAME;
const DB_VERSION = 1;
const STORE_NAME = "pending-mutations";

let dbPromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create store for pending mutations
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("type", "type", { unique: false });
      }
    };
  });

  return dbPromise;
};

// ============================================================================
// Queue Operations
// ============================================================================

/**
 * Generate unique ID for mutations
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Add a mutation to the offline queue
 */
export const queueMutation = async (
  type: MutationType,
  payload: unknown
): Promise<string> => {
  const db = await openDatabase();

  const mutation: PendingMutation = {
    id: generateId(),
    type,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(mutation);

    request.onsuccess = () => resolve(mutation.id);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get all pending mutations
 */
export const getPendingMutations = async (): Promise<PendingMutation[]> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("createdAt");
    const request = index.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get count of pending mutations
 */
export const getPendingMutationsCount = async (): Promise<number> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Remove a mutation from the queue (after successful processing)
 */
export const removeMutation = async (id: string): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Update mutation retry count and error
 */
export const updateMutationRetry = async (
  id: string,
  error: string
): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const mutation = getRequest.result as PendingMutation | undefined;
      if (!mutation) {
        resolve();
        return;
      }

      mutation.retryCount += 1;
      mutation.lastError = error;

      const putRequest = store.put(mutation);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
};

/**
 * Clear all pending mutations
 */
export const clearAllMutations = async (): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ============================================================================
// Mutation Handlers Registry
// ============================================================================

const handlers = new Map<MutationType, MutationHandler>();

/**
 * Register a handler for a mutation type
 */
export const registerMutationHandler = (
  type: MutationType,
  handler: MutationHandler
): void => {
  handlers.set(type, handler);
};

/**
 * Process all pending mutations
 *
 * @param options.onProgress - Called after each mutation is processed
 * @param options.maxRetries - Maximum retry attempts before skipping (default: 3)
 * @returns Results of processing
 */
export const processPendingMutations = async (options?: {
  onProgress?: (processed: number, total: number) => void;
  maxRetries?: number;
}): Promise<{
  processed: number;
  failed: number;
  skipped: number;
}> => {
  const { onProgress, maxRetries = 3 } = options ?? {};

  const mutations = await getPendingMutations();
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const mutation of mutations) {
    // Skip if too many retries
    if (mutation.retryCount >= maxRetries) {
      skipped += 1;
      continue;
    }

    const handler = handlers.get(mutation.type);
    if (!handler) {
      console.warn(`[OfflineQueue] No handler for mutation type: ${mutation.type}`);
      skipped += 1;
      continue;
    }

    try {
      await handler(mutation.payload);
      await removeMutation(mutation.id);
      processed += 1;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await updateMutationRetry(mutation.id, errorMessage);
      failed += 1;
    }

    onProgress?.(processed + failed + skipped, mutations.length);
  }

  return { processed, failed, skipped };
};

// ============================================================================
// Utility: Network-aware mutation wrapper
// ============================================================================

/**
 * Execute a mutation with offline fallback
 *
 * If online, executes immediately.
 * If offline or fails with network error, queues for later.
 */
export const executeWithOfflineFallback = async <T>(
  type: MutationType,
  payload: unknown,
  executor: () => Promise<T>
): Promise<{ success: boolean; queued: boolean; result?: T }> => {
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (!isOnline) {
    await queueMutation(type, payload);
    return { success: false, queued: true };
  }

  try {
    const result = await executor();
    return { success: true, queued: false, result };
  } catch (err) {
    // Check if it's a network error
    const isNetworkError =
      err instanceof TypeError && err.message.includes("fetch") ||
      err instanceof Error && err.message.includes("network");

    if (isNetworkError) {
      await queueMutation(type, payload);
      return { success: false, queued: true };
    }

    // Re-throw non-network errors
    throw err;
  }
};
