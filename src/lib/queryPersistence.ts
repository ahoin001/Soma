import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import localforage from "localforage";

const queryStorage = localforage.createInstance({
  name: "aurafit-cache",
  storeName: "react_query",
});

export const QUERY_PERSIST_BUSTER = "aurafit-query-cache-v1";
export const QUERY_PERSIST_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours

export const queryPersister = createAsyncStoragePersister({
  storage: queryStorage,
  throttleTime: 1000,
});
