import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type QueryTarget = {
  queryKey: readonly unknown[];
  exact?: boolean;
};

type TableSubscription = {
  table: string;
  schema?: string;
  filter?: string;
  queryTargets: QueryTarget[];
  debounceMs?: number;
};

/**
 * Subscribes to Supabase Realtime Postgres changes for the given tables
 * and automatically invalidates the associated React Query cache keys.
 * Invalidation is debounced per query target to avoid UI thrash during bursts.
 */
export const useRealtimeInvalidation = (
  userId: string | null,
  subscriptions: TableSubscription[],
) => {
  const queryClient = useQueryClient();
  const subsRef = useRef(subscriptions);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  subsRef.current = subscriptions;

  useEffect(() => {
    if (!userId || subsRef.current.length === 0) return;

    const channel = supabase.channel(`realtime-invalidation-${userId}`);

    for (const sub of subsRef.current) {
      const filter = sub.filter ?? `user_id=eq.${userId}`;
      channel.on<Record<string, unknown>>(
        "postgres_changes",
        {
          event: "*",
          schema: sub.schema ?? "public",
          table: sub.table,
          filter,
        },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const debounceMs = sub.debounceMs ?? 120;
          for (const target of sub.queryTargets) {
            const timerKey = `${target.exact === false ? "prefix" : "exact"}:${JSON.stringify(target.queryKey)}`;
            const existing = timersRef.current.get(timerKey);
            if (existing) {
              clearTimeout(existing);
            }
            const timer = setTimeout(() => {
              timersRef.current.delete(timerKey);
              void queryClient.invalidateQueries({
                queryKey: target.queryKey,
                exact: target.exact ?? true,
              });
            }, debounceMs);
            timersRef.current.set(timerKey, timer);
          }
        },
      );
    }

    channel.subscribe();

    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
};
