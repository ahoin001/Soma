import { useState } from "react";
import type { ReactNode } from "react";
import { normalizeExerciseImageUrl } from "@/lib/exerciseImageUrl";
import { cn } from "@/lib/utils";

type ExerciseImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  containerClassName?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  fallback?: ReactNode;
};

/**
 * Renders an exercise image with normalized URL and fallback on load error.
 * Use for lists, cards, and detail views so exercise media is handled like food images.
 */
export function ExerciseImage({
  src,
  alt,
  className = "h-full w-full object-cover object-center",
  containerClassName,
  loading = "lazy",
  decoding = "async",
  fallback,
}: ExerciseImageProps) {
  const normalized = normalizeExerciseImageUrl(src);
  const [hasError, setHasError] = useState(false);

  if (!normalized || hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-border/70 bg-gradient-to-br from-primary/20 via-card to-background text-xs font-semibold uppercase tracking-[0.2em] text-foreground/80",
          containerClassName,
        )}
      >
        {fallback ?? <span aria-hidden>💪</span>}
      </div>
    );
  }

  return (
    <img
      src={normalized}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      onError={() => setHasError(true)}
    />
  );
}
