import { cn } from "@/lib/utils";

type MealIconProps = {
  mealId: string;
  className?: string;
  size?: number;
};

/**
 * Distinct SVG icons for breakfast, lunch, dinner, and snack.
 * Each uses a different shape and color so they’re easy to tell apart.
 */
export function MealIcon({ mealId, className, size = 24 }: MealIconProps) {
  const s = size;
  const shared = cn("shrink-0", className);

  switch (mealId.toLowerCase()) {
    case "breakfast": {
      // Coffee mug with steam – warm amber
      return (
        <svg
          className={shared}
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M6 5v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5"
            className="stroke-amber-700 dark:stroke-amber-500"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 8h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2"
            className="stroke-amber-700 dark:stroke-amber-500"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 3h4v2H8z"
            className="fill-amber-400 dark:fill-amber-300"
          />
          <path d="M8 5v1M11 4v1M14 5v1" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" className="text-amber-600/70 dark:text-amber-400/70" />
        </svg>
      );
    }
    case "lunch": {
      // Sandwich – two buns + filling
      return (
        <svg
          className={shared}
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <ellipse cx="12" cy="8" rx="7" ry="3" className="fill-amber-200 dark:fill-amber-800" />
          <ellipse cx="12" cy="16" rx="7" ry="3" className="fill-amber-200 dark:fill-amber-800" />
          <path
            d="M5 9v6c0 1.1 3 2 7 2s7-.9 7-2V9"
            className="fill-emerald-400/90 dark:fill-emerald-600"
          />
          <path d="M6 11h2M12 10v4M16 11h2" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" className="text-amber-800/50 dark:text-amber-200/50" />
        </svg>
      );
    }
    case "dinner": {
      // Plate with moon – evening meal
      return (
        <svg
          className={shared}
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M19 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
            className="fill-indigo-400/90 dark:fill-indigo-300"
          />
          <circle cx="12" cy="15" r="6" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.2" fill="none" />
          <circle cx="12" cy="15" r="4.2" className="fill-slate-100 dark:fill-slate-800" />
        </svg>
      );
    }
    case "snack": {
      // Apple – fruit snack
      return (
        <svg
          className={shared}
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M12 4c-1.5 0-2.5.8-3 2-.5-1.2-1.5-2-3-2-1.2 0-2 .8-2.5 1.8S2 8.5 2 10c0 2.2 1 4 2.5 4.8.9.4 1.8 0 2.6-.7.8.7 1.4 1.6 1.7 2.5.3.9.9 1.6 1.8 1.6s1.5-.7 1.8-1.6c.3-.9.9-1.8 1.7-2.5.8-.7 1.7-1.1 2.6-.7C21 14 22 12.2 22 10c0-.8-.2-1.5-.5-2.2C21 6.8 20 6 18.5 6c-1.5 0-2.5.8-3 2-.5-1.2-1.5-2-3-2Z"
            className="fill-rose-500 dark:fill-rose-400"
          />
          <path d="M12 18v1.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" className="text-emerald-700 dark:text-emerald-400" />
          <path d="M12 4v1.5" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" className="text-rose-600/60 dark:text-rose-300/60" />
        </svg>
      );
    }
    default: {
      return (
        <svg
          className={shared}
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M4 12h16M4 12c0-2 1.5-4 4-4s4 2 4 4M4 12v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M8 8c0-2 1.5-4 4-4s4 2 4 4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          />
        </svg>
      );
    }
  }
}
