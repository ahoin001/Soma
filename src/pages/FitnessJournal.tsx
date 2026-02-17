import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  JOURNAL_MEASUREMENT_TYPES,
  MEASUREMENT_TYPE_LABELS,
  type JournalMeasurementType,
} from "@/types/journal";
import {
  fetchJournalMeasurementsLatest,
  fetchProgressPhotos,
} from "@/lib/api";

const KEY_STATS_TYPES: JournalMeasurementType[] = [
  "body_weight",
  "waist",
];

const FitnessJournal = () => {
  const navigate = useNavigate();

  const { data: latestRes, isLoading: latestLoading } = useQuery({
    queryKey: ["journal", "measurements", "latest"],
    queryFn: fetchJournalMeasurementsLatest,
  });

  const { data: photosRes, isLoading: photosLoading } = useQuery({
    queryKey: ["journal", "photos", 5],
    queryFn: () => fetchProgressPhotos(5),
  });

  const latestByType = new Map(
    (latestRes?.items ?? []).map((item) => [item.measurement_type, item]),
  );
  const photos = photosRes?.items ?? [];

  return (
    <AppShell experience="fitness" onAddAction={() => navigate("/fitness")} safeAreaTop="extra">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Physique
            </p>
            <h1 className="mt-2 text-2xl font-display font-semibold">
              Journal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Measurements & progress photos
            </p>
          </div>
          <Button
            variant="ghost"
            className="h-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => navigate("/fitness")}
          >
            Back
          </Button>
        </div>

        {/* Latest Stats */}
        <div className="mt-6 rounded-[28px] border border-border/70 bg-card/55 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Latest stats
          </p>
          {latestLoading ? (
            <div className="mt-3 flex gap-3">
              <Skeleton className="h-14 flex-1 rounded-2xl" />
              <Skeleton className="h-14 flex-1 rounded-2xl" />
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-3">
              {KEY_STATS_TYPES.map((type) => {
                const entry = latestByType.get(type);
                const label = MEASUREMENT_TYPE_LABELS[type];
                return (
                  <div
                    key={type}
                    className="min-w-[120px] rounded-2xl border border-border/70 bg-card/60 px-3 py-2"
                  >
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                      {entry != null
                        ? `${Number(entry.value).toLocaleString()} ${entry.unit}`
                        : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Body Measurements */}
        <div className="mt-6 rounded-[28px] border border-border/70 bg-card/55 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Body measurements
          </p>
          <p className="mt-1 text-sm text-foreground/85">
            Tap to view history and log
          </p>
          <ul className="mt-3 space-y-1">
            {JOURNAL_MEASUREMENT_TYPES.map((type) => (
              <li key={type}>
                <Link
                  to={`/fitness/journal/measurements/${type}`}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/60 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-card/80"
                >
                  <span>{MEASUREMENT_TYPE_LABELS[type]}</span>
                  <span className="text-muted-foreground">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Progress Photos */}
        <div className="mt-6 rounded-[28px] border border-border/70 bg-card/55 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Progress photos
              </p>
              <p className="mt-1 text-sm text-foreground/85">
                Latest photos
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => navigate("/fitness/journal/photos")}
            >
              View all
            </Button>
          </div>
          {photosLoading ? (
            <div className="mt-3 flex gap-3 overflow-hidden">
              <Skeleton className="h-24 w-24 shrink-0 rounded-2xl" />
              <Skeleton className="h-24 w-24 shrink-0 rounded-2xl" />
              <Skeleton className="h-24 w-24 shrink-0 rounded-2xl" />
            </div>
          ) : photos.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No photos yet. Add one to track visual progress.
            </p>
          ) : (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-muted"
                  onClick={() => navigate("/fitness/journal/photos")}
                >
                  <img
                    src={photo.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/50 px-1 text-[10px] text-white">
                    {new Date(photo.taken_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
          <Button
            className="mt-3 w-full rounded-full"
            onClick={() => navigate("/fitness/journal/photos")}
          >
            Add photo
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default FitnessJournal;
