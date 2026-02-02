type SyncStatusProps = {
  state: "idle" | "syncing";
};

export const SyncStatus = ({ state }: SyncStatusProps) => (
  <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
    <span
      className={`h-2 w-2 rounded-full ${
        state === "syncing" ? "bg-emerald-500 animate-pulse" : "bg-emerald-400"
      }`}
    />
    {state === "syncing" ? "Syncing" : "All synced"}
  </div>
);
