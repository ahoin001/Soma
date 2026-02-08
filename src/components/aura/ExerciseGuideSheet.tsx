import { useCallback, useEffect, useMemo, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkoutExerciseEntry } from "@/types/fitness";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/state/AppStore";
import {
  createExerciseMedia,
  fetchExerciseMedia,
  type ExerciseMedia,
  deleteExerciseMedia,
  setExerciseMediaPrimary,
} from "@/data/exerciseMediaApi";
import {
  fetchExerciseOverride,
  saveExerciseOverride,
} from "@/data/exerciseOverridesApi";
import {
  fetchCurrentUser,
  fetchExerciseByName,
  updateExerciseMaster,
} from "@/lib/api";
import { getUserId } from "@/lib/api";
import { uploadImageFile } from "@/lib/uploadImage";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

type ExerciseGuideSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: WorkoutExerciseEntry | null;
  onUpdate: (patch: Partial<WorkoutExerciseEntry>) => void;
  variant?: "sheet" | "page";
};

type MediaCacheEntry = {
  mediaUrl: string | null;
  mediaLabel: string;
  mediaKind: "cloudinary" | "youtube" | "external" | "thumbnail" | null;
  mediaItems: Array<
    ExerciseMedia & {
      source_type: ExerciseMedia["source_type"] | "thumbnail";
    }
  >;
  selectedMediaId: string | null;
};

type OverrideCacheEntry = {
  steps?: string[];
  guideUrl?: string | null;
  savedAt?: string | null;
};

type MasterCacheEntry = {
  id?: number | null;
  name?: string;
  description?: string;
  category?: string;
  equipment?: string[];
  muscles?: string[];
  imageUrl?: string;
};

const mediaCache = new Map<string, MediaCacheEntry>();
const overrideCache = new Map<string, OverrideCacheEntry>();
const masterCache = new Map<string, MasterCacheEntry>();
const preloadLocks = new Map<string, Promise<void>>();

const trimCache = <K, V>(cache: Map<K, V>, limit = 60) => {
  if (cache.size <= limit) return;
  const firstKey = cache.keys().next().value;
  if (firstKey !== undefined) {
    cache.delete(firstKey);
  }
};

export const preloadExerciseGuide = async (exerciseName: string, userId?: string) => {
  if (!exerciseName) return;
  const cacheKey = `${exerciseName}:${userId ?? "anon"}`;
  if (preloadLocks.has(cacheKey)) {
    await preloadLocks.get(cacheKey);
    return;
  }
  const task = (async () => {
    try {
      const [saved, override, masterResult] = await Promise.all([
        fetchExerciseMedia(exerciseName, userId),
        fetchExerciseOverride(exerciseName, userId),
        fetchExerciseByName(exerciseName),
      ]);
      const thumbnailUrl =
        masterResult.exercise && typeof (masterResult.exercise as { image_url?: unknown }).image_url === "string"
          ? String((masterResult.exercise as { image_url?: unknown }).image_url)
          : null;
      const thumbnailItem = thumbnailUrl
        ? {
            id: `thumbnail-${exerciseName}`,
            exercise_name: exerciseName,
            user_id: null,
            source_type: "thumbnail" as const,
            media_url: thumbnailUrl,
            thumb_url: thumbnailUrl,
            is_primary: false,
            created_at: new Date().toISOString(),
          }
        : null;
      const combined = thumbnailItem ? [...saved, thumbnailItem] : [...saved];
      const primary =
        combined.find((item) => item.is_primary) ??
        combined.find((item) => Boolean(item.user_id)) ??
        combined[0];
      mediaCache.set(exerciseName, {
        mediaUrl: primary?.media_url ?? null,
        mediaKind: primary?.source_type ?? null,
        selectedMediaId: primary?.id ?? null,
        mediaItems: combined,
        mediaLabel:
          primary?.source_type === "youtube"
            ? "YouTube"
            : primary?.source_type === "thumbnail"
              ? "Thumbnail"
              : primary?.source_type
                ? "Your media"
                : "Media preview",
      });
      trimCache(mediaCache);
      if (override) {
        overrideCache.set(exerciseName, {
          steps: override.steps ?? undefined,
          guideUrl: override.guide_url ?? null,
          savedAt: override.updated_at ?? null,
        });
        trimCache(overrideCache);
      }
      if (masterResult.exercise) {
        const record = masterResult.exercise as {
          id?: number;
          name?: string;
          description?: string;
          category?: string;
          equipment?: string[];
          muscles?: string[];
          image_url?: string | null;
        };
        masterCache.set(exerciseName, {
          id: Number(record.id ?? 0) || null,
          name: String(record.name ?? exerciseName),
          description: String(record.description ?? ""),
          category: String(record.category ?? ""),
          equipment: record.equipment ?? [],
          muscles: record.muscles ?? [],
          imageUrl: record.image_url ?? undefined,
        });
        trimCache(masterCache);
      }
    } catch {
      // ignore preload errors
    }
  })();
  preloadLocks.set(cacheKey, task);
  await task;
  preloadLocks.delete(cacheKey);
};

export const ExerciseGuideSheet = ({
  open,
  onOpenChange,
  exercise,
  onUpdate,
  variant = "sheet",
}: ExerciseGuideSheetProps) => {
  const { fitnessLibrary } = useAppStore();
  const { upsertExerciseRecord } = fitnessLibrary;
  if (!exercise) return null;
  const isVisible = variant === "page" ? true : open;
  const stepsValue = (exercise.steps ?? []).join("\n");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaLabel, setMediaLabel] = useState<string>("Media preview");
  const [mediaKind, setMediaKind] = useState<
    "cloudinary" | "youtube" | "external" | "thumbnail" | null
  >(null);
  const [mediaItems, setMediaItems] = useState<
    Array<
      ExerciseMedia & {
        source_type: ExerciseMedia["source_type"] | "thumbnail";
      }
    >
  >([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [overrideSavedAt, setOverrideSavedAt] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [loadingOverride, setLoadingOverride] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const userId = useMemo(() => getUserId() ?? "anonymous", []);
  const [isAdmin, setIsAdmin] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);
  const [masterId, setMasterId] = useState<number | null>(null);
  const [masterName, setMasterName] = useState("");
  const [masterDescription, setMasterDescription] = useState("");
  const [masterCategory, setMasterCategory] = useState("");
  const [masterEquipment, setMasterEquipment] = useState("");
  const [masterMuscles, setMasterMuscles] = useState("");
  const [masterImageUrl, setMasterImageUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [thumbnailNotice, setThumbnailNotice] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const isUploading = thumbnailUploading || Boolean(uploadStatus);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && isUploading) {
        setLeaveConfirmOpen(true);
        return;
      }
      onOpenChange(open);
    },
    [isUploading, onOpenChange],
  );

  useEffect(() => {
    if (!isUploading) return;
    const fn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [isUploading]);

  const isImage = mediaUrl
    ? [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((ext) =>
        mediaUrl.toLowerCase().includes(ext),
      )
    : false;

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    setOverrideSavedAt(null);
    setViewerOpen(false);
    setLoadingMedia(true);
    setLoadingOverride(true);
    setLoadingAdmin(true);
    setLoadingMaster(true);
    const loadMedia = async () => {
      try {
        const cached = mediaCache.get(exercise.name);
        if (cached) {
          setMediaUrl(cached.mediaUrl);
          setMediaLabel(cached.mediaLabel);
          setMediaKind(cached.mediaKind);
          setMediaItems(cached.mediaItems);
          setSelectedMediaId(cached.selectedMediaId);
        }
        const saved = await fetchExerciseMedia(exercise.name, userId);
        const cachedMaster = masterCache.get(exercise.name);
        let nextThumbnail = cachedMaster?.imageUrl ?? null;
        if (!nextThumbnail) {
          const master = await fetchExerciseByName(exercise.name);
          nextThumbnail =
            master.exercise &&
            typeof (master.exercise as { image_url?: unknown }).image_url === "string"
              ? String((master.exercise as { image_url?: unknown }).image_url)
              : null;
        }
        setThumbnailUrl(nextThumbnail ?? null);
        const thumbnailItem = nextThumbnail
          ? {
              id: `thumbnail-${exercise.name}`,
              exercise_name: exercise.name,
              user_id: null,
              source_type: "thumbnail" as const,
              media_url: nextThumbnail,
              thumb_url: nextThumbnail,
              is_primary: false,
              created_at: new Date().toISOString(),
            }
          : null;
        if (cancelled) return;
        const combined = thumbnailItem
          ? [...saved.filter((item) => item.media_url !== nextThumbnail), thumbnailItem]
          : [...saved];
        setMediaItems(combined);
        const primary =
          combined.find((item) => item.is_primary) ??
          combined.find((item) => Boolean(item.user_id)) ??
          combined[0];
        if (!primary) {
          setMediaUrl(null);
          setMediaLabel("Media preview");
          setMediaKind(null);
          setSelectedMediaId(null);
          return;
        }
        const nextState: MediaCacheEntry = {
          mediaUrl: primary.media_url,
          mediaKind: primary.source_type,
          selectedMediaId: primary.id,
          mediaItems: combined,
          mediaLabel:
            primary.source_type === "youtube"
              ? "YouTube"
              : primary.source_type === "thumbnail"
                ? "Thumbnail"
                : "Your media",
        };
        setMediaUrl(nextState.mediaUrl);
        setMediaKind(nextState.mediaKind);
        setSelectedMediaId(nextState.selectedMediaId);
        if (primary.source_type === "youtube") {
          setMediaLabel("YouTube");
        } else if (primary.source_type === "thumbnail") {
          setMediaLabel("Thumbnail");
        } else {
          setMediaLabel("Your media");
        }
        mediaCache.set(exercise.name, nextState);
        trimCache(mediaCache);
      } catch {
        if (!cancelled) {
          setMediaUrl(null);
          setMediaLabel("Media preview");
          setMediaKind(null);
          setMediaItems([]);
          setSelectedMediaId(null);
        }
      } finally {
        if (!cancelled) setLoadingMedia(false);
      }
    };
    const loadOverrides = async () => {
      try {
        const cached = overrideCache.get(exercise.name);
        if (cached) {
          if (!exercise.steps?.length && cached.steps?.length) {
            onUpdate({ steps: cached.steps });
          }
          if (!exercise.guideUrl && cached.guideUrl) {
            onUpdate({ guideUrl: cached.guideUrl });
          }
          if (cached.savedAt) {
            setOverrideSavedAt(cached.savedAt);
          }
        }
        const override = await fetchExerciseOverride(exercise.name, userId);
        if (!override || cancelled) return;
        setOverrideSavedAt(override.updated_at);
        if (!exercise.steps?.length && override.steps?.length) {
          onUpdate({ steps: override.steps });
        }
        if (!exercise.guideUrl && override.guide_url) {
          onUpdate({ guideUrl: override.guide_url });
        }
        overrideCache.set(exercise.name, {
          steps: override.steps ?? undefined,
          guideUrl: override.guide_url ?? null,
          savedAt: override.updated_at ?? null,
        });
        trimCache(overrideCache);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingOverride(false);
      }
    };
    const loadAdmin = async () => {
      try {
        const user = await fetchCurrentUser();
        if (cancelled) return;
        const admin = user.user?.email === "ahoin001@gmail.com";
        setIsAdmin(admin);
        return admin;
      } catch {
        if (!cancelled) setIsAdmin(false);
        return false;
      } finally {
        if (!cancelled) setLoadingAdmin(false);
      }
    };
    const loadMaster = async () => {
      try {
        const cached = masterCache.get(exercise.name);
        if (cached) {
          setMasterId(cached.id ?? null);
          setMasterName(String(cached.name ?? exercise.name));
          setMasterDescription(String(cached.description ?? ""));
          setMasterCategory(String(cached.category ?? ""));
          setMasterEquipment((cached.equipment ?? []).join(", "));
          setMasterMuscles((cached.muscles ?? []).join(", "));
        setMasterImageUrl(String(cached.imageUrl ?? ""));
        setThumbnailUrl(cached.imageUrl ?? null);
        }
        const result = await fetchExerciseByName(exercise.name);
        if (!result.exercise || cancelled) return;
        const record = result.exercise as {
          id?: number;
          name?: string;
          description?: string;
          category?: string;
          equipment?: string[];
          muscles?: string[];
          image_url?: string | null;
        };
        setMasterId(Number(record.id ?? 0) || null);
        setMasterName(String(record.name ?? exercise.name));
        setMasterDescription(String(record.description ?? ""));
        setMasterCategory(String(record.category ?? ""));
        setMasterEquipment((record.equipment ?? []).join(", "));
        setMasterMuscles((record.muscles ?? []).join(", "));
        setMasterImageUrl(String(record.image_url ?? ""));
        setThumbnailUrl(record.image_url ?? null);
        masterCache.set(exercise.name, {
          id: Number(record.id ?? 0) || null,
          name: String(record.name ?? exercise.name),
          description: String(record.description ?? ""),
          category: String(record.category ?? ""),
          equipment: record.equipment ?? [],
          muscles: record.muscles ?? [],
          imageUrl: record.image_url ?? undefined,
        });
        trimCache(masterCache);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingMaster(false);
      }
    };
    void (async () => {
      const [admin] = await Promise.all([loadAdmin(), loadMedia(), loadOverrides()]);
      if (cancelled) return;
      if (admin) {
        await loadMaster();
      } else if (!cancelled) {
        setLoadingMaster(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exercise.name, isVisible, userId]);
  const selectedItem =
    mediaItems.find((item) => item.id === selectedMediaId) ?? null;
  const selectedIsUser = Boolean(selectedItem?.user_id);
  const isContentLoading =
    loadingMedia || loadingOverride || loadingAdmin || (isAdmin && loadingMaster);
  const sectionVariants = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0 },
  };
  const galleryItems = useMemo(() => {
    const weight = (item: (typeof mediaItems)[number]) => {
      if (item.source_type === "thumbnail") return 0;
      if (item.is_primary) return 1;
      return 2;
    };
    return [...mediaItems].sort((a, b) => {
      const aWeight = weight(a);
      const bWeight = weight(b);
      if (aWeight !== bWeight) return aWeight - bWeight;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [mediaItems]);

  const content = (
    <div
      className={
        variant === "page"
          ? "mx-auto w-full max-w-[420px] px-4 pb-10 pt-4"
          : "aura-sheet-body"
      }
    >
      {variant === "page" ? (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => handleOpenChange(false)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Exercise guide
            </p>
            <p className="text-sm text-white/70">{exercise.name}</p>
          </div>
          <div className="h-10 w-10" />
        </div>
      ) : (
        <div className="mt-2 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            Exercise guide
          </p>
          <h3 className="mt-2 text-2xl font-display font-semibold">
            {exercise.name}
          </h3>
        </div>
      )}

      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.06, delayChildren: 0.05 }}
        className="space-y-5"
      >
          <motion.div
            variants={sectionVariants}
            className="mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-emerald-500/20 via-slate-950 to-slate-950"
          >
            <div className="flex h-44 items-center justify-center">
              {mediaUrl && mediaKind === "youtube" ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/70">
                  <span className="text-sm">YouTube guide saved</span>
                  <Button
                    variant="outline"
                    className="rounded-full border-white/20 text-white hover:bg-white/10"
                    onClick={() => window.open(mediaUrl, "_blank")}
                  >
                    Open video
                  </Button>
                </div>
              ) : mediaUrl && isImage ? (
                <img
                  src={mediaUrl}
                  alt={`${exercise.name} demo`}
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />
              ) : mediaUrl ? (
                <video
                  src={mediaUrl}
                  controls
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm text-white/60">{mediaLabel}</span>
              )}
            </div>
          </motion.div>
          {!loadingMedia && (mediaUrl || selectedItem) ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="rounded-full border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  if (mediaKind === "youtube" && mediaUrl) {
                    window.open(mediaUrl, "_blank");
                    return;
                  }
                  setViewerOpen(true);
                }}
                disabled={!mediaUrl}
              >
                {mediaKind === "youtube" ? "Open video" : "View full"}
              </Button>
              {selectedItem && selectedIsUser ? (
                <Button
                  className="rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={async () => {
                    const prevItems = mediaItems;
                    const prevUrl = mediaUrl;
                    const prevKind = mediaKind;
                    const prevLabel = mediaLabel;
                    try {
                      setSaving(true);
                      const response = await setExerciseMediaPrimary({
                        mediaId: selectedItem.id,
                        userId,
                      });
                      setMediaItems((prev) =>
                        prev.map((item) =>
                          item.id === response.media.id
                            ? { ...item, is_primary: true }
                            : { ...item, is_primary: false },
                        ),
                      );
                      setMediaUrl(response.media.media_url);
                      setMediaKind(response.media.source_type);
                      setMediaLabel(
                        response.media.source_type === "youtube"
                          ? "YouTube"
                          : "Your media",
                      );
                      toast("Primary updated");
                    } catch (err) {
                      setMediaItems(prevItems);
                      setMediaUrl(prevUrl);
                      setMediaKind(prevKind);
                      setMediaLabel(prevLabel ?? "Media preview");
                      toast("Unable to update primary", {
                        description: err instanceof Error ? err.message : undefined,
                      });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  Make primary
                </Button>
              ) : null}
              {selectedItem && selectedIsUser ? (
                <Button
                  variant="outline"
                  className="rounded-full border-rose-400/40 text-rose-200 hover:bg-rose-500/20"
                  onClick={async () => {
                    const prevItems = mediaItems;
                    const prevSelected = selectedMediaId;
                    const prevUrl = mediaUrl;
                    const prevKind = mediaKind;
                    const prevLabel = mediaLabel;
                    try {
                      setSaving(true);
                      await deleteExerciseMedia({
                        mediaId: selectedItem.id,
                        userId,
                      });
                      const nextItems = mediaItems.filter(
                        (item) => item.id !== selectedItem.id,
                      );
                      setMediaItems(nextItems);
                      const nextSelected =
                        nextItems.find((item) => item.is_primary) ??
                        nextItems[0];
                      if (nextSelected) {
                        setSelectedMediaId(nextSelected.id);
                        setMediaUrl(nextSelected.media_url);
                        setMediaKind(nextSelected.source_type);
                        setMediaLabel(
                          nextSelected.source_type === "youtube"
                            ? "YouTube"
                            : "Your media",
                        );
                      } else {
                        setSelectedMediaId(null);
                        setMediaUrl(null);
                        setMediaKind(null);
                        setMediaLabel("Media preview");
                      }
                      toast("Media removed");
                    } catch (err) {
                      setMediaItems(prevItems);
                      setSelectedMediaId(prevSelected);
                      setMediaUrl(prevUrl);
                      setMediaKind(prevKind);
                      setMediaLabel(prevLabel ?? "Media preview");
                      toast("Unable to delete media", {
                        description: err instanceof Error ? err.message : undefined,
                      });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  Delete
                </Button>
              ) : null}
              {selectedItem && isAdmin ? (
                <Button
                  className="rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await createExerciseMedia({
                        exerciseName: exercise.name,
                        sourceType: "external",
                        mediaUrl: selectedItem.media_url,
                        isPrimary: true,
                      });
                      toast("Global media set");
                    } catch (err) {
                      toast("Unable to set global media", {
                        description: err instanceof Error ? err.message : undefined,
                      });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  Make global
                </Button>
              ) : null}
            </div>
          ) : null}

          {!loadingMedia && mediaItems.length ? (
            <motion.div variants={sectionVariants} className="mt-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/50">
                <span>Gallery</span>
                <span>{mediaItems.length} items</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {galleryItems.map((item) => {
                  const selected = item.id === selectedMediaId;
                  const isYouTube = item.source_type === "youtube";
                  const isImage = [".jpg", ".jpeg", ".png", ".webp", ".gif"].some(
                    (ext) => item.media_url.toLowerCase().includes(ext),
                  );
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`flex h-16 w-full items-center justify-center overflow-hidden rounded-2xl border ${
                        selected ? "border-emerald-300/80" : "border-white/10"
                      } bg-white/5 text-white/60 transition`}
                      onClick={() => {
                        setMediaUrl(item.media_url);
                        setMediaKind(item.source_type);
                        setSelectedMediaId(item.id);
                        if (item.source_type === "youtube") {
                          setMediaLabel("YouTube");
                        } else if (item.source_type === "thumbnail") {
                          setMediaLabel("Thumbnail");
                        } else {
                          setMediaLabel("Your media");
                        }
                      }}
                    >
                      {isYouTube ? (
                        <span className="text-[10px] uppercase tracking-[0.2em]">
                          YouTube
                        </span>
                      ) : isImage ? (
                        <img
                          src={item.thumb_url ?? item.media_url}
                          alt={`${exercise.name} thumbnail`}
                          className="h-full w-full object-cover object-center"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="text-[10px] uppercase tracking-[0.2em]">
                          Video
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : null}

          <motion.div variants={sectionVariants} className="mt-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Steps & cues
            </p>
            {isContentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-full" />
              </div>
            ) : (
              <>
                <Textarea
                  value={stepsValue}
                  onChange={(event) => {
                    const lines = event.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean);
                    onUpdate({ steps: lines });
                  }}
                  placeholder="1. Set your stance...\n2. Brace core...\n3. Control the eccentric..."
                  className="min-h-[120px] border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
                <Button
                  className="w-full rounded-full bg-white/10 text-white hover:bg-white/20"
                  disabled={saving}
                  onClick={async () => {
                    const prevSavedAt = overrideSavedAt;
                    try {
                      setSaving(true);
                      const response = await saveExerciseOverride({
                        exerciseName: exercise.name,
                        userId,
                        steps: exercise.steps ?? [],
                        guideUrl: exercise.guideUrl ?? null,
                      });
                      setOverrideSavedAt(response.override.updated_at);
                      toast("Saved your default cues");
                    } catch (err) {
                      setOverrideSavedAt(prevSavedAt);
                      toast("Unable to save cues", {
                        description: err instanceof Error ? err.message : undefined,
                      });
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Save my default cues
                </Button>
                {overrideSavedAt ? (
                  <p className="text-xs text-white/40">Saved for your account.</p>
                ) : null}
              </>
            )}
          </motion.div>

          {isAdmin && !isContentLoading ? (
            <motion.div
              variants={sectionVariants}
              className="mt-6 rounded-[24px] border border-emerald-400/30 bg-emerald-400/10 px-4 py-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
                    Admin repair
                  </p>
                  <p className="text-sm text-white/70">
                    Update the master exercise for everyone.
                  </p>
                </div>
                <Button
                  className="rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  onClick={() => setRepairOpen((prev) => !prev)}
                >
                  {repairOpen ? "Hide" : "Repair"}
                </Button>
              </div>
              {repairOpen ? (
                <div className="mt-4 space-y-3">
                  <Input
                    value={masterName}
                    onChange={(event) => setMasterName(event.target.value)}
                    placeholder="Exercise name"
                    className="border-emerald-400/30 bg-white/10 text-white placeholder:text-white/50"
                  />
                  <Input
                    value={masterCategory}
                    onChange={(event) => setMasterCategory(event.target.value)}
                    placeholder="Category"
                    className="border-emerald-400/30 bg-white/10 text-white placeholder:text-white/50"
                  />
                  <Input
                    value={masterMuscles}
                    onChange={(event) => setMasterMuscles(event.target.value)}
                    placeholder="Muscles (comma separated)"
                    className="border-emerald-400/30 bg-white/10 text-white placeholder:text-white/50"
                  />
                  <Input
                    value={masterImageUrl}
                    onChange={(event) => setMasterImageUrl(event.target.value)}
                    placeholder="Thumbnail image URL"
                    className="border-emerald-400/30 bg-white/10 text-white placeholder:text-white/50"
                  />
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-emerald-400/30 bg-white/10 px-4 py-3 text-xs font-semibold text-emerald-100">
                    <span>{thumbnailUploading ? "Uploading..." : "Upload thumbnail"}</span>
                    <span className="text-emerald-200">Browse</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setThumbnailUploading(true);
                        setThumbnailProgress(0);
                        setThumbnailNotice(null);
                        uploadImageFile(file, setThumbnailProgress)
                          .then((url) => {
                            setMasterImageUrl(url);
                            setThumbnailNotice("Thumbnail uploaded.");
                          })
                          .catch(() => {
                            setThumbnailNotice("Upload failed.");
                          })
                          .finally(() => setThumbnailUploading(false));
                      }}
                    />
                  </label>
                  {thumbnailUploading ? (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-400/15">
                      <div
                        className="h-full rounded-full bg-emerald-300 transition-all"
                        style={{ width: `${thumbnailProgress}%` }}
                      />
                    </div>
                  ) : null}
                  {thumbnailNotice ? (
                    <p className="text-xs text-emerald-200">{thumbnailNotice}</p>
                  ) : null}
                  <Input
                    value={masterEquipment}
                    onChange={(event) => setMasterEquipment(event.target.value)}
                    placeholder="Equipment (comma separated)"
                    className="border-emerald-400/30 bg-white/10 text-white placeholder:text-white/50"
                  />
                  <Textarea
                    value={masterDescription}
                    onChange={(event) => setMasterDescription(event.target.value)}
                    placeholder="Master description"
                    className="min-h-[110px] border-emerald-400/30 bg-white/10 text-white placeholder:text-white/50"
                  />
                  <Button
                    className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                    onClick={async () => {
                      if (!masterId) {
                        toast("Unable to find master exercise");
                        return;
                      }
                      const prevName = masterName;
                      const prevDesc = masterDescription;
                      const prevCategory = masterCategory;
                      const prevEquipment = masterEquipment;
                      const prevMuscles = masterMuscles;
                      const prevImageUrl = masterImageUrl;
                      const prevThumbUrl = thumbnailUrl;
                      const prevMediaItems = mediaItems;
                      const prevMediaUrl = mediaUrl;
                      const prevMediaKind = mediaKind;
                      const prevMediaLabel = mediaLabel;
                      try {
                        setSaving(true);
                        const response = await updateExerciseMaster(masterId, {
                          name: masterName.trim() || exercise.name,
                          description: masterDescription.trim() || null,
                          category: masterCategory.trim() || null,
                          muscles: masterMuscles
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                          equipment: masterEquipment
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                          imageUrl: masterImageUrl.trim() || null,
                        });
                        if (response.exercise) {
                          upsertExerciseRecord(response.exercise);
                        }
                        if (masterImageUrl.trim()) {
                          const url = masterImageUrl.trim();
                          setMediaUrl(url);
                          setMediaKind("thumbnail");
                          setMediaLabel("Thumbnail");
                          setThumbnailUrl(url);
                          setMediaItems((prev) => {
                            const filtered = prev.filter((item) => item.id !== `thumbnail-${exercise.name}`);
                            return [
                              ...filtered,
                              {
                                id: `thumbnail-${exercise.name}`,
                                exercise_name: exercise.name,
                                user_id: null,
                                source_type: "thumbnail",
                                media_url: url,
                                thumb_url: url,
                                is_primary: false,
                                created_at: new Date().toISOString(),
                              },
                            ];
                          });
                        }
                        if (masterName.trim() && masterName.trim() !== exercise.name) {
                          onUpdate({ name: masterName.trim() });
                        }
                        toast("Master exercise updated");
                      } catch (err) {
                        setMasterName(prevName);
                        setMasterDescription(prevDesc);
                        setMasterCategory(prevCategory);
                        setMasterEquipment(prevEquipment);
                        setMasterMuscles(prevMuscles);
                        setMasterImageUrl(prevImageUrl);
                        setThumbnailUrl(prevThumbUrl);
                        setMediaItems(prevMediaItems);
                        setMediaUrl(prevMediaUrl);
                        setMediaKind(prevMediaKind);
                        setMediaLabel(prevMediaLabel);
                        toast("Unable to update master exercise", {
                          description: err instanceof Error ? err.message : undefined,
                        });
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    Save master changes
                  </Button>
                </div>
              ) : null}
            </motion.div>
          ) : null}

          <motion.div variants={sectionVariants} className="mt-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Video link
            </p>
            {isContentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-11 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-full" />
              </div>
            ) : (
              <>
                <Input
                  value={exercise.guideUrl ?? ""}
                  onChange={(event) => onUpdate({ guideUrl: event.target.value })}
                  placeholder="https://youtube.com/..."
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
                {exercise.guideUrl ? (
                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
                      onClick={() => window.open(exercise.guideUrl, "_blank")}
                    >
                      Open guide
                    </Button>
                    <Button
                      className="w-full rounded-full bg-white/10 text-white hover:bg-white/20"
                      onClick={async () => {
                        if (!exercise.guideUrl) return;
                        const prevUrl = mediaUrl;
                        const prevLabel = mediaLabel;
                        const prevKind = mediaKind;
                        const prevId = selectedMediaId;
                        const prevItems = mediaItems;
                        try {
                          setSaving(true);
                          setUploadStatus("Saving guide link...");
                          const isYouTube =
                            exercise.guideUrl.includes("youtube.com") ||
                            exercise.guideUrl.includes("youtu.be");
                          const response = await createExerciseMedia({
                            exerciseName: exercise.name,
                            userId,
                            sourceType: isYouTube ? "youtube" : "external",
                            mediaUrl: exercise.guideUrl,
                            isPrimary: true,
                          });
                          setMediaUrl(response.media.media_url);
                          setMediaLabel(isYouTube ? "YouTube" : "External");
                          setMediaKind(isYouTube ? "youtube" : "external");
                          setSelectedMediaId(response.media.id);
                          setMediaItems((prev) => [
                            response.media,
                            ...prev.filter((item) => item.id !== response.media.id),
                          ]);
                          toast("Guide link saved", {
                            description: "Set as your primary reference.",
                          });
                        } catch (err) {
                          setMediaUrl(prevUrl);
                          setMediaLabel(prevLabel);
                          setMediaKind(prevKind);
                          setSelectedMediaId(prevId);
                          setMediaItems(prevItems);
                          toast("Unable to save guide link", {
                            description: err instanceof Error ? err.message : undefined,
                          });
                        } finally {
                          setSaving(false);
                          setUploadStatus(null);
                        }
                      }}
                      disabled={saving}
                    >
                      Use as primary
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </motion.div>

          <motion.div variants={sectionVariants} className="mt-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Upload your own video
            </p>
            {isContentLoading ? (
              <Skeleton className="h-12 w-full rounded-2xl" />
            ) : (
              <>
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                  <span>
                    {exercise.customVideoName
                      ? exercise.customVideoName
                      : "Choose a file"}
                  </span>
                  <span className="text-emerald-300">Upload</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const prevUrl = mediaUrl;
                      const prevLabel = mediaLabel;
                      const prevKind = mediaKind;
                      const prevId = selectedMediaId;
                      const prevItems = mediaItems;
                      const prevVideoName = exercise.customVideoName;
                      setSaving(true);
                      setUploadStatus("Uploading video...");
                      fetch("/api/workouts/exercise-media/signature")
                        .then(async (res) => {
                          if (!res.ok) {
                            const message = await res.text();
                            throw new Error(message || "Signature failed");
                          }
                          return res.json();
                        })
                        .then(async (signature) => {
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("api_key", signature.apiKey);
                          if (!signature.unsigned && signature.timestamp && signature.signature) {
                            formData.append("timestamp", String(signature.timestamp));
                            formData.append("signature", signature.signature);
                          }
                          if (signature.uploadPreset) {
                            formData.append("upload_preset", signature.uploadPreset);
                          }
                          const response = await fetch(
                            `https://api.cloudinary.com/v1_1/${signature.cloudName}/video/upload`,
                            {
                              method: "POST",
                              body: formData,
                            },
                          );
                          const data = await response.json();
                          if (!data.secure_url) {
                            throw new Error("Upload failed");
                          }
                          onUpdate({ customVideoName: file.name });
                          const saved = await createExerciseMedia({
                            exerciseName: exercise.name,
                            userId,
                            sourceType: "cloudinary",
                            mediaUrl: data.secure_url,
                            thumbUrl: data.secure_url,
                            isPrimary: true,
                          });
                          setMediaUrl(saved.media.media_url);
                          setMediaLabel("Your upload");
                          setMediaKind("cloudinary");
                          setSelectedMediaId(saved.media.id);
                          setMediaItems((prev) => [
                            saved.media,
                            ...prev.filter((item) => item.id !== saved.media.id),
                          ]);
                          toast("Upload saved", {
                            description: "Set as your primary reference.",
                          });
                        })
                        .catch((err) => {
                          setMediaUrl(prevUrl);
                          setMediaLabel(prevLabel);
                          setMediaKind(prevKind);
                          setSelectedMediaId(prevId);
                          setMediaItems(prevItems);
                          if (prevVideoName) onUpdate({ customVideoName: prevVideoName });
                          toast("Upload failed", {
                            description: err instanceof Error ? err.message : undefined,
                          });
                        })
                        .finally(() => {
                          setSaving(false);
                          setUploadStatus(null);
                        });
                    }}
                  />
                </label>
                {uploadStatus ? (
                  <p className="text-xs text-emerald-200">{uploadStatus}</p>
                ) : null}
              </>
            )}
          </motion.div>

      <motion.div variants={sectionVariants} className="mt-6">
        <Button
          className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
          onClick={() => handleOpenChange(false)}
        >
          Done
        </Button>
      </motion.div>

      <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <AlertDialogContent className="border-white/10 bg-slate-900 text-white">
          <AlertDialogTitle>Media still uploading</AlertDialogTitle>
          <AlertDialogDescription>
            If you leave now, the upload may not finish. Stay to ensure it completes?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-500 text-white hover:bg-emerald-600"
              onClick={() => {
                setLeaveConfirmOpen(false);
                onOpenChange(false);
              }}
            >
              Leave anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </motion.div>
    </div>
  );

  const viewer = viewerOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-5">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between text-white">
          <span className="text-sm uppercase tracking-[0.2em] text-white/60">
            Full view
          </span>
          <Button
            variant="ghost"
            className="rounded-full text-white/70 hover:bg-white/10"
            onClick={() => setViewerOpen(false)}
          >
            Close
          </Button>
        </div>
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
          {mediaUrl && mediaKind === "youtube" ? (
            <div className="flex h-56 items-center justify-center text-white/70">
              <Button
                variant="outline"
                className="rounded-full border-white/20 text-white hover:bg-white/10"
                onClick={() => window.open(mediaUrl, "_blank")}
              >
                Open video
              </Button>
            </div>
          ) : mediaUrl && isImage ? (
            <img
              src={mediaUrl}
              alt={`${exercise.name} full view`}
              className="h-full w-full object-contain object-center"
              loading="lazy"
              decoding="async"
            />
          ) : mediaUrl ? (
            <video
              src={mediaUrl}
              controls
              className="h-full w-full object-contain"
            />
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  if (variant === "page") {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        {content}
        {viewer}
      </div>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-slate-950 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white">
        {content}
      </DrawerContent>
      {viewer}
    </Drawer>
  );
};
