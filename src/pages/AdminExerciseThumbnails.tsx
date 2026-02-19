import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fetchAdminExercises, updateExerciseMaster } from "@/lib/api";
import { uploadImageFile } from "@/lib/uploadImage";
import { useAppStore } from "@/state/AppStore";

type AdminExercise = {
  id: number;
  name: string;
  category?: string | null;
  image_url?: string | null;
};

const AdminExerciseThumbnails = () => {
  const navigate = useNavigate();
  const { fitnessLibrary } = useAppStore();
  const { upsertExerciseRecord } = fitnessLibrary;
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AdminExercise[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("idle");
  const [dirty, setDirty] = useState<Record<number, string>>({});
  const [uploadingById, setUploadingById] = useState<Record<number, boolean>>({});
  const [progressById, setProgressById] = useState<Record<number, number>>({});
  const [noticeById, setNoticeById] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setStatus("loading");
        const response = await fetchAdminExercises(query, 160);
        if (cancelled) return;
        const next = response.items.map((item) => ({
          id: Number(item.id ?? 0),
          name: String(item.name ?? ""),
          category: typeof item.category === "string" ? item.category : null,
          image_url: typeof item.image_url === "string" ? item.image_url : null,
        }));
        setItems(next.filter((item) => item.id && item.name));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load exercises.";
        toast(message);
      } finally {
        if (!cancelled) setStatus("idle");
      }
    };
    const timer = window.setTimeout(() => {
      void load();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const rows = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        draft: dirty[item.id] ?? item.image_url ?? "",
      })),
    [items, dirty],
  );

  const handleSave = async (exerciseId: number) => {
    const nextUrl = (dirty[exerciseId] ?? "").trim();
    try {
      setStatus("saving");
      const response = await updateExerciseMaster(exerciseId, { imageUrl: nextUrl || null });
      if (response.exercise) {
        upsertExerciseRecord(response.exercise);
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === exerciseId ? { ...item, image_url: nextUrl || null } : item,
        ),
      );
      setDirty((prev) => {
        const next = { ...prev };
        delete next[exerciseId];
        return next;
      });
      toast("Thumbnail saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save thumbnail.";
      toast(message);
    } finally {
      setStatus("idle");
    }
  };

  const handleUpload = async (exerciseId: number, file: File) => {
    setUploadingById((prev) => ({ ...prev, [exerciseId]: true }));
    setProgressById((prev) => ({ ...prev, [exerciseId]: 0 }));
    setNoticeById((prev) => ({ ...prev, [exerciseId]: "" }));
    try {
      const url = await uploadImageFile(file, (pct) =>
        setProgressById((prev) => ({ ...prev, [exerciseId]: pct })),
        "exercises",
      );
      setDirty((prev) => ({ ...prev, [exerciseId]: url }));
      setNoticeById((prev) => ({ ...prev, [exerciseId]: "Thumbnail uploaded." }));
    } catch {
      setNoticeById((prev) => ({ ...prev, [exerciseId]: "Upload failed." }));
    } finally {
      setUploadingById((prev) => ({ ...prev, [exerciseId]: false }));
    }
  };

  return (
    <AppShell experience="fitness" showNav={false}>
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4 text-foreground">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => navigate(-1)}
          >
            ✕
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Admin tools
            </p>
            <p className="text-sm text-foreground/85">Thumbnail manager</p>
          </div>
          <div className="h-10 w-10" />
        </div>

        <div className="mt-6 space-y-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exercises"
            className="border-border/70 bg-secondary/35 text-foreground placeholder:text-muted-foreground"
          />
          {rows.length === 0 && status === "loading" ? (
            <p className="text-sm text-muted-foreground">Loading exercises...</p>
          ) : null}
          {rows.length === 0 && status !== "loading" ? (
            <p className="text-sm text-muted-foreground">No exercises found.</p>
          ) : null}
          {rows.map((item) => {
            const draft = dirty[item.id] ?? item.image_url ?? "";
            const isDirty = draft.trim() !== (item.image_url ?? "");
            const uploading = Boolean(uploadingById[item.id]);
            const progress = progressById[item.id] ?? 0;
            const notice = noticeById[item.id] ?? "";
            return (
              <div
                key={item.id}
                className="rounded-[24px] border border-border/70 bg-card/55 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.category ?? "General"}</p>
                  </div>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={`${item.name} thumbnail`}
                      className="h-10 w-10 rounded-2xl border border-border/70 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      None
                    </div>
                  )}
                </div>
                <Input
                  value={draft}
                  onChange={(event) =>
                    setDirty((prev) => ({ ...prev, [item.id]: event.target.value }))
                  }
                  placeholder="Thumbnail image URL"
                  className="mt-3 border-border/70 bg-secondary/35 text-foreground placeholder:text-muted-foreground"
                />
                <label className="mt-3 flex cursor-pointer items-center justify-between rounded-2xl border border-border/70 bg-card/60 px-4 py-3 text-xs font-semibold text-foreground/80">
                  <span>{uploading ? "Uploading..." : "Upload thumbnail"}</span>
                  <span className="text-primary">Browse</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void handleUpload(item.id, file);
                    }}
                  />
                </label>
                {uploading ? (
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary/15">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                ) : null}
                {notice ? (
                  <p className="mt-2 text-xs text-primary">{notice}</p>
                ) : null}
                {isDirty ? (
                  <Button
                    className="mt-3 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handleSave(item.id)}
                    disabled={status === "saving"}
                  >
                    {status === "saving" ? "Saving..." : "Save thumbnail"}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};

export default AdminExerciseThumbnails;
