# Optimistic UI & PWA Best Practices

This document defines the optimistic UI pattern and PWA best practices for this codebase.

## Core Principle

Update the UI **immediately** (within 100ms) when the user performs an action. Sync with the server in the background. If the server fails, **rollback** and **notify** the user with a retry option.

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ErrorBoundary` | `@/components/ErrorBoundary` | Catch errors with reset + logging |
| `PageErrorBoundary` | `@/components/ErrorBoundary` | Full-page error recovery |
| `LoadingState` | `@/components/ui/loading-state` | Deferred loading (200ms delay) |
| `EmptyState` | `@/components/ui/empty-state` | Consistent "no data" UI |

## Pattern Template

```typescript
const doSomething = useCallback(async (params) => {
  // 1. Capture previous state for rollback
  const previousState = currentState;
  
  // 2. Update UI immediately (optimistic)
  setCurrentState(newState);
  
  try {
    // 3. Sync with server in background
    await apiCall(params);
    // 4. On success: optionally refresh from server
    void refresh();
  } catch {
    // 5. On failure: rollback to previous state
    setCurrentState(previousState);
    // 6. Notify user with retry action
    toast("Unable to perform action", {
      action: {
        label: "Retry",
        onClick: () => void doSomething(params),
      },
    });
    void refresh();
  }
}, [dependencies]);
```

## Required Elements

### 1. Instant Feedback
- UI must update within 100ms of user action
- No spinners for trivial actions (toggles, likes, adding items)
- User should not be blocked from interacting with other parts of the app

### 2. State Capture (Before Update)
Always capture the previous state **before** making optimistic changes:
```typescript
const previousSummary = { ...summaryRef.current };
const previousMacros = cloneMacros(macrosRef.current);
const previousSections = [...logSections];
```

### 3. Graceful Rollback
On API failure, restore the exact previous state:
```typescript
catch {
  setSummary(previousSummary);
  setMacros(previousMacros);
  setLogSections(previousSections);
  // ... notification
}
```

### 4. Toast with Retry
Always provide a retry action so users don't have to redo their work:
```typescript
import { toast } from "sonner";

toast("Unable to save changes", {
  action: {
    label: "Retry",
    onClick: () => void doSomething(params),
  },
});
```

### 5. Preserve User Input
Never clear form fields or text inputs on failure. Keep user drafts intact.

## When to Use Optimistic UI

| Use For | Avoid For |
|---------|-----------|
| Toggles (likes, favorites, checkboxes) | Financial transactions |
| Text input (comments, names, notes) | Irreversible deletes |
| Adding items to lists | Security-sensitive actions |
| Reordering items | Inventory/stock checks |
| Quick updates (quantity, serving size) | External integrations |

## Hooks Following This Pattern

- `useFitnessPlanner.ts` - All routine/session operations
- `useTracking.ts` - Water, steps, weight logging
- `useFoodCatalog.ts` - Favorites, food creation
- `useDailyIntake.ts` - Food logging, goals, macros

## Advanced Considerations

### Race Conditions
For rapid user actions (e.g., clicking repeatedly), consider:
- Debouncing the API call
- Using request IDs to ignore stale responses
- Taking only the final state when multiple requests are in flight

### Visual Pending State (Optional)
For items that take longer to confirm, consider reduced opacity:
```tsx
<div className={cn("transition-opacity", isPending && "opacity-50")}>
  {content}
</div>
```

### Accessibility
For screen readers, use `aria-live` regions to announce status changes:
```tsx
<div role="status" aria-live="polite" className="sr-only">
  {statusMessage}
</div>
```

## Loading States (Prevent Flicker & CLS)

Use `LoadingState` to prevent:
- **Flicker**: 200ms delay before showing indicator (fast loads show nothing)
- **CLS**: Skeletons match content dimensions

```tsx
import { LoadingState, ListItemSkeleton } from "@/components/ui/loading-state";

<LoadingState 
  isLoading={status === "loading"} 
  skeleton={<ListItemSkeleton count={5} />}
>
  <FoodList items={items} />
</LoadingState>
```

### Pre-built Skeletons
- `ListItemSkeleton` — For list items (food, exercises)
- `CardSkeleton` — For card layouts
- `PageLoadingState` — Full-page loading

## Error Boundaries

Wrap pages/sections with boundaries for crash recovery:

```tsx
import { ErrorBoundary, PageErrorBoundary } from "@/components/ErrorBoundary";

// Page-level (full screen recovery)
<PageErrorBoundary scope="Nutrition">
  <NutritionPage />
</PageErrorBoundary>

// Section-level (inline recovery)
<ErrorBoundary scope="MealLog">
  <MealLogPanel />
</ErrorBoundary>
```

## Empty States

Use consistent empty UI:

```tsx
import { EmptyState, SearchEmptyState, ListEmptyState } from "@/components/ui/empty-state";

// Search results
<SearchEmptyState query={searchQuery} onClear={handleClear} />

// Empty list
<ListEmptyState itemName="exercises" onAdd={handleAddExercise} />

// Custom
<EmptyState
  icon={Heart}
  title="No favorites yet"
  description="Foods you love will appear here"
  action={{ label: "Browse foods", onClick: handleBrowse }}
/>
```

## Touch Feedback (PWA Polish)

Add tactile feedback for native feel:

```tsx
// Scale + opacity on press
<button className="touch-feedback">Tap me</button>

// Subtle feedback for small elements
<span className="touch-feedback-subtle">Icon</span>

// Background highlight for list items
<div className="touch-highlight">List item</div>
```

## Safe Areas (Notch & Gesture Bar)

Use safe area utilities for fixed elements:

```tsx
// Bottom nav with gesture bar padding
<nav className="fixed bottom-0 left-0 right-0 min-safe-pb">

// Full safe inset
<div className="safe-inset">Content</div>
```

## React Query Configuration

The app uses React Query with these defaults:
- **Stale time**: 30s (data considered fresh)
- **Cache time**: 5min (kept for fast navigation)
- **Retry**: 3 attempts with exponential backoff
- **Offline**: Uses cache when network unavailable

## Query Key Conventions

Always use the centralized query key helpers:

```ts
import { queryKeys } from "@/lib/queryKeys";

useQuery({ queryKey: queryKeys.nutrition(localDate), queryFn: ... })
useQuery({ queryKey: queryKeys.foodSearch(query, filters), queryFn: ... })
```

Key shape guidelines:
- `["resource", "id"]` for entity detail
- `["resource", "query", { filters }]` for search
- `["resource", "date"]` for time-based data

## Checklist

Before merging any optimistic UI code:

- [ ] UI updates immediately without waiting for API
- [ ] Previous state is captured before changes
- [ ] Rollback restores exact previous state on failure
- [ ] Toast notification appears on error
- [ ] Toast includes "Retry" action
- [ ] User input is preserved on failure
- [ ] No full-screen spinners for trivial actions
- [ ] Loading states use `LoadingState` with deferred delay
- [ ] Skeletons match content dimensions (prevent CLS)
- [ ] Error boundaries wrap major sections
- [ ] Touch feedback on interactive elements
- [ ] Safe area handling for fixed elements
