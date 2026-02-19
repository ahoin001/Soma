import { uploadToStorage } from "@/lib/uploadStorage";

/**
 * Upload an image file to Supabase Storage.
 * Returns the public URL of the uploaded image.
 */
export const uploadImageFile = async (
  file: File,
  onProgress?: (percent: number) => void,
  folder: "foods" | "progress" | "brands" | "exercises" = "foods",
): Promise<string> => {
  return uploadToStorage(file, folder, onProgress);
};
