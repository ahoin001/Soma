import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Search,
  Inbox,
  FileQuestion,
  Plus,
  type LucideIcon,
} from "lucide-react";

type EmptyStateProps = {
  /** Icon to display. Can be a Lucide icon or custom ReactNode */
  icon?: LucideIcon | ReactNode;
  /** Main title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional className */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
};

/**
 * Empty state component for consistent "no data" UI across the app.
 * 
 * Usage:
 * ```tsx
 * <EmptyState
 *   icon={Search}
 *   title="No results found"
 *   description="Try adjusting your search terms"
 *   action={{ label: "Clear search", onClick: handleClear }}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: "gap-2 p-4",
      iconWrapper: "p-2",
      icon: "h-5 w-5",
      title: "text-sm font-medium",
      description: "text-xs",
    },
    md: {
      container: "gap-3 p-6",
      iconWrapper: "p-3",
      icon: "h-6 w-6",
      title: "text-base font-semibold",
      description: "text-sm",
    },
    lg: {
      container: "gap-4 p-8",
      iconWrapper: "p-4",
      icon: "h-8 w-8",
      title: "text-lg font-semibold",
      description: "text-base",
    },
  };

  const sizes = sizeClasses[size];

  const renderIcon = () => {
    if (!icon) return null;

    // If it's a Lucide icon component
    if (typeof icon === "function") {
      const IconComponent = icon as LucideIcon;
      return <IconComponent className={cn(sizes.icon, "text-muted-foreground")} />;
    }

    // If it's a custom ReactNode
    return icon;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizes.container,
        className
      )}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div className={cn("rounded-full bg-muted", sizes.iconWrapper)}>
          {renderIcon()}
        </div>
      )}
      <div className="space-y-1">
        <p className={cn("text-foreground", sizes.title)}>{title}</p>
        {description && (
          <p className={cn("text-muted-foreground", sizes.description)}>
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {action && (
            <Button
              onClick={action.onClick}
              size={size === "sm" ? "sm" : "default"}
              variant="default"
            >
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              size={size === "sm" ? "sm" : "default"}
              variant="ghost"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-configured empty state for search results
 */
export function SearchEmptyState({
  query,
  onClear,
  className,
}: {
  query?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        query
          ? `No matches for "${query}". Try different keywords.`
          : "Try searching for something."
      }
      action={onClear ? { label: "Clear search", onClick: onClear } : undefined}
      className={className}
    />
  );
}

/**
 * Pre-configured empty state for empty lists
 */
export function ListEmptyState({
  itemName = "items",
  onAdd,
  className,
}: {
  itemName?: string;
  onAdd?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Inbox}
      title={`No ${itemName} yet`}
      description={`Add your first ${itemName.replace(/s$/, "")} to get started.`}
      action={onAdd ? { label: `Add ${itemName.replace(/s$/, "")}`, onClick: onAdd, icon: Plus } : undefined}
      className={className}
    />
  );
}

/**
 * Pre-configured empty state for 404/not found
 */
export function NotFoundEmptyState({
  onGoBack,
  className,
}: {
  onGoBack?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={FileQuestion}
      title="Not found"
      description="The page or item you're looking for doesn't exist."
      action={onGoBack ? { label: "Go back", onClick: onGoBack } : undefined}
      className={className}
      size="lg"
    />
  );
}

export default EmptyState;
