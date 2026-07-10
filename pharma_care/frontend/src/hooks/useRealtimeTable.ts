import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type ChangeEvent = "INSERT" | "UPDATE" | "DELETE";

type Options<T> = {
  table: string;
  /** Events to listen for (default: INSERT only) */
  events?: ChangeEvent[];
  /** Called for every change delivered by Realtime (RLS-filtered server-side) */
  onChange: (row: T, event: ChangeEvent) => void;
  /** Called after the channel (re)joins following a drop, to refetch missed rows */
  onResync?: () => void;
  /** Subscribe only when true (default true) */
  enabled?: boolean;
};

// Subscribe to Postgres changes on a table via Supabase Realtime.
// - one channel per mounted component (unique topic → no duplicate subscriptions)
// - callbacks are kept in refs so re-renders never resubscribe
// - the channel is removed on unmount
// - supabase-js rejoins dropped channels automatically; when the rejoin lands,
//   onResync fires so the caller can refetch anything missed while offline
export function useRealtimeTable<T extends Record<string, unknown>>({
  table,
  events = ["INSERT"],
  onChange,
  onResync,
  enabled = true,
}: Options<T>) {
  const onChangeRef = useRef(onChange);
  const onResyncRef = useRef(onResync);
  onChangeRef.current = onChange;
  onResyncRef.current = onResync;
  const eventsKey = events.join(",");

  useEffect(() => {
    if (!enabled) return;

    const topic = `rt-${table}-${Math.random().toString(36).slice(2)}`;
    let channel = supabase.channel(topic);
    for (const event of eventsKey.split(",") as ChangeEvent[]) {
      channel = channel.on(
        "postgres_changes",
        { event, schema: "public", table },
        (payload: RealtimePostgresChangesPayload<T>) => {
          const row = (payload.new ?? payload.old) as T;
          if (row) onChangeRef.current(row, payload.eventType as ChangeEvent);
        }
      );
    }

    let hadSubscribed = false;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (hadSubscribed) onResyncRef.current?.();
        hadSubscribed = true;
      } else if (status === "CHANNEL_ERROR") {
        console.error(`[realtime] channel error on ${table} — retrying`);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, eventsKey, enabled]);
}
