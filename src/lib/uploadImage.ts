import { fetchFoodImageSignature } from "@/lib/api";

export const uploadImageFile = async (
  file: File,
  onProgress?: (percent: number) => void,
) => {
  const signature = await fetchFoodImageSignature();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  if (signature.uploadPreset) {
    formData.append("upload_preset", signature.uploadPreset);
  }

  const data = await new Promise<{ secure_url?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    );
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const pct = Math.round((event.loaded / event.total) * 100);
      onProgress?.(pct);
    };
    xhr.onload = () => {
      try {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error("Upload failed"));
          return;
        }
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });

  if (!data.secure_url) {
    throw new Error("Upload failed");
  }
  return data.secure_url;
};
