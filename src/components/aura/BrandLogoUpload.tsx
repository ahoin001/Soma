import { useState } from "react";
import { fetchBrandLogoSignature } from "@/lib/api";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BrandLogoUploadProps = {
  /** Current logo URL (or null for placeholder). */
  logoUrl: string | null;
  /** Called with new URL after upload, or null if removed. */
  onLogoChange: (url: string | null) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
};

const sizeClasses = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
};

/**
 * Single control to add or replace a brand logo.
 * Shows current logo (or placeholder), "Add logo" / "Change logo" button, upload progress, and optional remove.
 */
export function BrandLogoUpload({
  logoUrl,
  onLogoChange,
  disabled = false,
  size = "md",
  className,
}: BrandLogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setNotice(null);
    setProgress(0);
    try {
      const signature = await fetchBrandLogoSignature();
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
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(formData);
      });
      if (data.secure_url) {
        onLogoChange(data.secure_url);
        setNotice("Logo saved.");
      } else {
        setNotice("Upload failed. Check your connection and try again.");
      }
    } catch {
      setNotice("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const sizeClass = sizeClasses[size];
  const isDisabled = disabled || uploading;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/80 ring-2 ring-border/60",
            sizeClass,
          )}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Brand logo"
              className={cn("h-full w-full object-contain", sizeClass)}
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={isDisabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={isDisabled}
              onClick={(e) => e.currentTarget.closest("label")?.querySelector("input")?.click()}
            >
              {logoUrl ? "Change logo" : "Add logo"}
            </Button>
          </label>
          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-2 text-muted-foreground hover:text-destructive"
              disabled={isDisabled}
              onClick={() => {
                onLogoChange(null);
                setNotice(null);
              }}
              aria-label="Remove logo"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              <span className="text-xs">Remove</span>
            </Button>
          )}
        </div>
      </div>
      {uploading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {notice && (
        <p className={cn(
          "text-xs",
          notice.startsWith("Upload failed") ? "text-destructive" : "text-primary",
        )}>
          {notice}
        </p>
      )}
    </div>
  );
}
