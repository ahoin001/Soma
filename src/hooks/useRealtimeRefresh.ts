import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type RealtimeRefreshSubscription = {
  table: string;
  schema?: string;
  filter?: string;
};

type UseRealtimeRefreshOptions = {
  userId: string | null;
  subscriptions: RealtimeRefreshSubscription[];
  onRefresh: () => void;
  debounceMs?: number;
  channelKey?: string;
};

/**
 * Subscribes to table changes and triggers a debounced refresh callback.
 * Useful for hooks that keep local state instead of React Query caches.
 */
export const useRealtimeRefresh = ({
  userId,
  subscriptions,
  onRefresh,
  debounceMs = 250,
  channelKey = "refresh",
}: UseRealtimeRefreshOptions) => {
  const refreshRef = useRef(onRefresh);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subsRef = useRef(subscriptions);

  refreshRef.current = onRefresh;
  subsRef.current = subscriptions;

  useEffect(() => {
    if (!userId || subsRef.current.length === 0) return;

    const channel = supabase.channel(`realtime-${channelKey}-${userId}`);

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
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            refreshRef.current();
          }, debounceMs);
        },
      );
    }

    channel.subscribe();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [channelKey, debounceMs, userId]);
};
