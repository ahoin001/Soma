import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useUserSettings } from "@/state";

/** Threshold for "near white" pixels to make transparent (0–255). */
const WHITE_THRESHOLD = 248;

const processedUrlCache = new Map<string, string>();

function makeWhiteTransparent(imageUrl: string): Promise<string> {
  const cached = processedUrlCache.get(imageUrl);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No 2d context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("toBlob failed"));
              return;
            }
            const url = URL.createObjectURL(blob);
            processedUrlCache.set(imageUrl, url);
            resolve(url);
          },
          "image/png",
          1,
        );
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error("Image load failed"));
    img.src = imageUrl;
  });
}

type FoodImageProps = {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  fallback?: ReactNode;
};

/**
 * Renders a food image normalized by the user preference:
 * - "white": image is shown on a white background (transparent PNGs get white behind them).
 * - "transparent": white pixels are converted to transparent so the image blends with the theme (good for dark mode).
 * Assumes images are either transparent PNGs or white-background images.
 */
export function FoodImage({
  src,
  alt,
  className = "h-full w-full object-contain object-center",
  containerClassName,
  loading = "lazy",
  decoding = "async",
  fallback,
}: FoodImageProps) {
  const { foodImageBackground } = useUserSettings();
  const [processedSrc, setProcessedSrc] = useState<string | null>(() =>
    foodImageBackground === "transparent" ? processedUrlCache.get(src) ?? null : null,
  );
  const [useFallback, setUseFallback] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isWhiteMode = foodImageBackground === "white";

  useEffect(() => {
    if (isWhiteMode) {
      setProcessedSrc(null);
      setUseFallback(false);
      setHasLoadError(false);
      return;
    }

    let cancelled = false;
    setUseFallback(false);
    setHasLoadError(false);
    const cached = processedUrlCache.get(src);
    if (cached) {
      setProcessedSrc(cached);
      return;
    }

    makeWhiteTransparent(src)
      .then((url) => {
        if (!cancelled) setProcessedSrc(url);
      })
      .catch(() => {
        if (!cancelled) setUseFallback(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src, isWhiteMode]);

  const displaySrc = isWhiteMode || useFallback || !processedSrc ? src : processedSrc;
  const baseSize = "h-full w-full min-h-0 min-w-0";
  const wrapperClass = isWhiteMode
    ? `${baseSize} bg-white ${containerClassName ?? ""}`.trim()
    : `${baseSize} ${containerClassName ?? ""}`.trim();

  if (hasLoadError) {
    return (
      <div ref={containerRef} className={wrapperClass || undefined}>
        {fallback ?? (
          <div className="flex h-full w-full items-center justify-center rounded-md bg-muted text-xl">
            <span aria-hidden>🍽️</span>
            <span className="sr-only">{alt}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={wrapperClass || undefined}>
      <img
        src={displaySrc}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
        onError={() => setHasLoadError(true)}
      />
    </div>
  );
}
