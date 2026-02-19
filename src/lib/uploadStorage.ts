import { supabase } from "@/lib/supabase";

const BUCKET = "user-uploads";

/**
 * Upload a file to Supabase Storage and return its public URL.
 * Files are organized under `{userId}/{folder}/{timestamp}-{filename}`.
 */
export const uploadToStorage = async (
  file: File,
  folder: "foods" | "progress" | "brands" | "exercises" = "foods",
  onProgress?: (percent: number) => void,
): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop() ?? "jpg";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${session.user.id}/${folder}/${safeName}`;

  onProgress?.(10);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(error.message);
  onProgress?.(90);

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  onProgress?.(100);
  return publicUrl;
};
