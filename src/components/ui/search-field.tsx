import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

type SearchFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  clearLabel?: string;
  sticky?: boolean;
  stickyClassName?: string;
  wrapperClassName?: string;
  selfContainedScroll?: boolean;
  contentClassName?: string;
  children?: ReactNode;
};

export const SearchField = ({
  value,
  onValueChange,
  placeholder = "Search...",
  className,
  inputClassName,
  clearLabel = "Clear search",
  sticky = false,
  stickyClassName,
  wrapperClassName,
  selfContainedScroll = false,
  contentClassName,
  children,
}: SearchFieldProps) => {
  const hasValue = value.trim().length > 0;

  const field = (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-border/70 bg-secondary/35 px-3 py-2",
        className,
      )}
    >
      <Search className="h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-8 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0",
          inputClassName,
        )}
      />
      {hasValue ? (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label={clearLabel}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-primary transition hover:bg-primary/15"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );

  if (!sticky && !children) return field;

  return (
    <div className={cn(children ? "space-y-3" : "", wrapperClassName)}>
      {sticky ? <div className={cn("aura-sticky-search", stickyClassName)}>{field}</div> : field}
      {children ? (
        <div
          className={cn(
            selfContainedScroll
              ? "min-h-0 max-h-[min(52svh,34rem)] overflow-y-auto overscroll-contain pr-1"
              : "",
            contentClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};
