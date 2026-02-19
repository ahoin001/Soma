import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  fetchProgressPhotos,
  createProgressPhoto,
  deleteProgressPhoto,
} from "@/lib/api";
import { uploadImageFile } from "@/lib/uploadImage";
import { toast } from "sonner";
import type { ProgressPhoto } from "@/types/journal";

const FitnessJournalPhotos = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProgressPhoto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["journal", "photos"],
    queryFn: () => fetchProgressPhotos(),
  });

  const createMutation = useMutation({
    mutationFn: createProgressPhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal", "photos"] });
      setNoteInput("");
      setDrawerOpen(false);
      toast.success("Photo added");
    },
    onError: () => {
      setUploading(false);
      toast.error("Failed to add photo");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProgressPhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal", "photos"] });
      setDeleteTarget(null);
      toast.success("Photo removed");
    },
    onError: () => {
      toast.error("Failed to remove photo");
    },
  });

  const photos = data?.items ?? [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImageFile(file, undefined, "progress");
      createMutation.mutate({
        image_url: url,
        taken_at: new Date().toISOString(),
        note: noteInput.trim() || undefined,
      });
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <AppShell experience="fitness" onAddAction={() => navigate("/fitness")} safeAreaTop="extra">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-foreground">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => navigate("/fitness/journal")}
          >
            ✕
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Physique
            </p>
            <h1 className="mt-1 text-lg font-display font-semibold">
              Progress photos
            </h1>
          </div>
          <div className="w-10" />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="mt-6">
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                className="w-full rounded-full"
                onClick={() => setDrawerOpen(true)}
              >
                Add photo
              </Button>
            </DrawerTrigger>
            <DrawerContent className="rounded-t-[28px] border-t border-border/70 bg-card">
              <DrawerHeader>
                <DrawerTitle>Add progress photo</DrawerTitle>
              </DrawerHeader>
              <p className="px-4 text-sm text-muted-foreground">
                Choose an image. It will be dated today. Optional note below.
              </p>
              <div className="grid gap-4 px-4 py-4">
                <div>
                  <Label htmlFor="photo-note">Note (optional)</Label>
                  <Input
                    id="photo-note"
                    placeholder="e.g. morning, post-cut"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="mt-1 rounded-xl"
                  />
                </div>
                <Button
                  className="rounded-full"
                  onClick={() => {
                    setDrawerOpen(false);
                    handleAddClick();
                  }}
                  disabled={uploading}
                >
                  {uploading ? "Uploading…" : "Choose image"}
                </Button>
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline" className="rounded-full">
                    Cancel
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>

        {isLoading ? (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            No photos yet. Add one to track visual progress.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/70 bg-muted"
              >
                <img
                  src={photo.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(photo.taken_at))}
                  </p>
                  {photo.note ? (
                    <p className="mt-0.5 truncate text-[10px] text-white/80">
                      {photo.note}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => setDeleteTarget(photo)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This photo will be removed from your journal. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default FitnessJournalPhotos;
