import { cn } from "@/lib/utils";

type MealIconProps = {
  mealId: string;
  className?: string;
  size?: number;
};

/**
 * Eye-catching SVG icons for breakfast, lunch, dinner, and snack.
 * Falls back to a generic meal icon for unknown meal types.
 */
export function MealIcon({ mealId, className, size = 24 }: MealIconProps) {
  const s = size;
  const shared = cn("shrink-0", className);

  switch (mealId.toLowerCase()) {
    case "breakfast": {
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
          {/* Sun + coffee cup */}
          <circle cx="6" cy="6" r="2.5" className="fill-amber-400" />
          <path d="M3 6h1.5M6 3v1.5M7.5 6H9M6 7.5V9" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" className="text-amber-600 opacity-80" />
          <path
            d="M11 8h8a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2v4h-2v-4h-2v4h-2v-9H11V8Z"
            className="fill-primary"
          />
          <path d="M11 8V6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-primary/80" />
          <path d="M13 11h4" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" className="text-primary-foreground/40" />
        </svg>
      );
    }
    case "lunch": {
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
          {/* Sandwich / midday sun */}
          <circle cx="12" cy="8" r="4" className="fill-amber-300" />
          <path d="M8 8h1.5M12 5v1.5M15.5 8H17M12 10.5V12" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" className="text-amber-600 opacity-70" />
          <path
            d="M4 14v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="text-primary"
          />
          <path d="M6 14h12v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V14Z" className="fill-primary/20" />
          <path d="M8 16h8" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" className="text-primary/60" />
        </svg>
      );
    }
    case "dinner": {
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
          {/* Crescent moon + dinner plate */}
          <path
            d="M20 14a8 8 0 1 1-11.3-11.3 6 6 0 0 0 11.3 11.3Z"
            className="fill-indigo-400 dark:fill-indigo-300"
          />
          <circle cx="12" cy="16" r="5" className="fill-none stroke-primary" strokeWidth="1.2" />
          <circle cx="12" cy="16" r="3.5" className="fill-primary/10" />
        </svg>
      );
    }
    case "snack": {
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
            d="M12 5c-1.5 0-2.5.8-3 2-.5-1.2-1.5-2-3-2-1.2 0-2 .8-2.5 1.8S3 8.5 3 10c0 2 1 3.5 2.5 4.2 1 .4 2 0 2.8-.8.8.8 1.4 1.8 1.7 2.8.3 1 1 1.8 2 1.8s1.7-.8 2-1.8c.3-1 .9-2 1.7-2.8.8-.8 1.8-1.2 2.8-.8C20 13.5 21 12 21 10c0-.8-.2-1.5-.5-2.2C20 6.8 19 6 17.5 6c-1.5 0-2.5.8-3 2-.5-1.2-1.5-2-3-2Z"
            className="fill-rose-500"
          />
          <path d="M12 18v2" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" className="text-emerald-600" />
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
            className="text-primary"
          />
        </svg>
      );
    }
  }
}
