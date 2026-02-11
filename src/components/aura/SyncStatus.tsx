type SyncStatusProps = {
  state: "idle" | "syncing";
};

export const SyncStatus = ({ state }: SyncStatusProps) => (
  <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
    <span
      className={`h-2 w-2 rounded-full ${
        state === "syncing" ? "bg-primary animate-pulse" : "bg-primary/80"
      }`}
    />
    {state === "syncing" ? "Syncing" : "All synced"}
  </div>
);
