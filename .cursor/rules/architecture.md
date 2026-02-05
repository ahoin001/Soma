# Architecture & State Management Patterns

This document defines the architecture patterns for maintainability and performance.

## State Management Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ QueryClientProvider (React Query)                           │
├─────────────────────────────────────────────────────────────┤
│ UserProvider (User profile + settings)                      │
├─────────────────────────────────────────────────────────────┤
│ UIProvider (Transient UI state)                             │
├─────────────────────────────────────────────────────────────┤
│ AppStoreProvider (Legacy - being migrated)                  │
└─────────────────────────────────────────────────────────────┘
```

### When to Use Each Layer

| Layer | Use For | Persistence |
|-------|---------|-------------|
| **React Query** | Server data (API calls) | Cache + Offline |
| **UserContext** | User profile, preferences | localStorage |
| **UIContext** | UI state (modals, drafts, date) | Session/localStorage |
| **Local State** | Component-specific state | None |

## React Query Patterns

### Query Structure

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

// Query with typed key
const query = useQuery({
  queryKey: queryKeys.nutrition(localDate),
  queryFn: async () => {
    await ensureUser();
    return fetchNutritionSummary(localDate);
  },
});

// Mutation with optimistic update
const mutation = useMutation({
  mutationFn: async (params) => {
    await ensureUser();
    return apiCall(params);
  },
  onMutate: async (params) => {
    // 1. Snapshot previous value FIRST (synchronously)
    const previous = queryClient.getQueryData(queryKeys.nutrition(localDate));
    
    // 2. Optimistically update IMMEDIATELY (before any async operations)
    queryClient.setQueryData(queryKeys.nutrition(localDate), (old) => ({
      ...old,
      ...newData,
    }));
    
    // 3. Cancel outgoing refetches AFTER the optimistic update
    // This prevents race conditions without blocking the UI update
    await queryClient.cancelQueries({ queryKey: queryKeys.nutrition(localDate) });
    
    // 4. Return rollback context
    return { previous };
  },
  onError: (_err, params, context) => {
    // For offline scenarios, KEEP the optimistic update and queue for later
    if (!navigator.onLine) {
      void queueMutation("mutation.type", params);
      toast("Saved offline • Will sync when connected");
      return; // Don't rollback!
    }
    
    // For online errors, rollback the optimistic update
    if (context?.previous) {
      queryClient.setQueryData(queryKeys.nutrition(localDate), context.previous);
    }
    toast("Unable to save", {
      action: { label: "Retry", onClick: () => mutation.mutate(params) },
    });
  },
  onSettled: () => {
    // Refetch after mutation
    void queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(localDate) });
  },
});
```

### Query Key Conventions

Always use `src/lib/queryKeys.ts`:

```typescript
export const queryKeys = {
  // Static keys
  auth: ["auth"] as const,
  mealTypes: ["mealTypes"] as const,
  
  // Parameterized keys
  user: (id?: string) => ["user", id ?? "me"] as const,
  nutrition: (localDate: string) => ["nutrition", localDate] as const,
  foodSearch: (query: string, filters?: Record<string, unknown>) =>
    ["foodSearch", query, filters ?? {}] as const,
};
```

### Converting Legacy Hooks to React Query

**Before (useState + useEffect):**
```typescript
const [data, setData] = useState([]);
const [status, setStatus] = useState("idle");

const refresh = useCallback(async () => {
  setStatus("loading");
  const result = await fetchData();
  setData(result);
  setStatus("idle");
}, []);

useEffect(() => { void refresh(); }, [refresh]);
```

**After (React Query):**
```typescript
const query = useQuery({
  queryKey: queryKeys.data,
  queryFn: fetchData,
});

// Expose same interface for backward compatibility
return {
  data: query.data ?? [],
  status: query.isLoading ? "loading" : query.isError ? "error" : "idle",
  error: query.error?.message ?? null,
  refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.data }),
};
```

## Context Usage

### UserContext (Profile & Settings)

```typescript
import { useUser, useUserProfile, useUserSettings } from "@/state";

// Full context
const { userProfile, setUserProfile, showFoodImages, setShowFoodImages } = useUser();

// Just profile (avoids re-render on settings change)
const { userProfile, updateUserProfile } = useUserProfile();

// Just settings
const { showFoodImages, setShowFoodImages } = useUserSettings();
```

### UIContext (Transient State)

```typescript
import { useUI, useSelectedDate, useMealPulse, useWorkoutDrafts } from "@/state";

// Date navigation
const { selectedDate, goToToday, goToPrevDay, goToNextDay } = useSelectedDate();

// Meal animations
const { mealPulse, setMealPulse, clearMealPulse } = useMealPulse();

// Workout draft management
const { getWorkoutDraft, setWorkoutDraft, clearWorkoutDraft } = useWorkoutDrafts();
```

## Form Handling (React Hook Form + Zod)

### Schema Definition

```typescript
// src/lib/schemas/[entity].ts
import { z } from "zod";

export const createFoodSchema = z.object({
  name: z.string().optional().default(""),
  kcal: z.string().min(1, "Calories required"),
  carbs: z.string().min(1, "Carbs required"),
  protein: z.string().min(1, "Protein required"),
  fat: z.string().min(1, "Fat required"),
});

export type CreateFoodFormValues = z.infer<typeof createFoodSchema>;

export const createFoodDefaults: CreateFoodFormValues = {
  name: "",
  kcal: "",
  carbs: "",
  protein: "",
  fat: "",
};
```

### Form Component

```typescript
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFoodSchema, createFoodDefaults, type CreateFoodFormValues } from "@/lib/schemas/food";

const MyForm = () => {
  const form = useForm<CreateFoodFormValues>({
    resolver: zodResolver(createFoodSchema),
    defaultValues: createFoodDefaults,
    mode: "onBlur", // Validate on blur for better UX
  });

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (values: CreateFoodFormValues) => {
    // Handle submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Simple inputs */}
      <Input {...register("name")} placeholder="Name" />
      
      {/* With validation error */}
      <Input 
        {...register("kcal")} 
        className={errors.kcal ? "border-red-300" : ""}
      />
      
      {/* Complex inputs (Select, etc.) */}
      <Controller
        name="category"
        control={control}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            ...
          </Select>
        )}
      />
      
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </form>
  );
};
```

## Offline Support

### Queue Mutations for Offline

```typescript
import { queueMutation, executeWithOfflineFallback } from "@/lib/offlineQueue";

// Option 1: Queue directly when offline
const handleAction = async () => {
  if (!navigator.onLine) {
    await queueMutation("nutrition.logFood", { foodId, mealId });
    toast("Saved offline • Will sync when connected");
    return;
  }
  await logFoodApi({ foodId, mealId });
};

// Option 2: Use wrapper with automatic fallback
const handleAction = async () => {
  const result = await executeWithOfflineFallback(
    "nutrition.logFood",
    { foodId, mealId },
    () => logFoodApi({ foodId, mealId })
  );
  
  if (result.queued) {
    toast("Saved offline • Will sync when connected");
  }
};
```

### Register Mutation Handlers

```typescript
// In app initialization or hook
import { registerMutationHandler } from "@/lib/offlineQueue";

registerMutationHandler("nutrition.logFood", async (payload) => {
  const { foodId, mealId } = payload as { foodId: string; mealId: string };
  await ensureUser();
  await createMealEntry({ foodId, mealId });
});
```

### Show Pending Count in UI

```typescript
import { useOfflineQueue, usePendingMutationsCount } from "@/hooks/useOfflineQueue";

// Full queue management
const { pendingCount, isProcessing, processQueue } = useOfflineQueue();

// Just the count
const pendingCount = usePendingMutationsCount();
```

## Performance Guidelines

### Avoid Unnecessary Re-renders

1. **Use granular context hooks** instead of full context:
   ```typescript
   // ❌ Re-renders on any context change
   const { userProfile } = useAppStore();
   
   // ✅ Only re-renders when profile changes
   const { userProfile } = useUserProfile();
   ```

2. **Colocate state** - Keep state as close to usage as possible:
   ```typescript
   // ❌ Global state for local concern
   const { modalOpen } = useAppStore();
   
   // ✅ Local state for component
   const [modalOpen, setModalOpen] = useState(false);
   ```

3. **Use React Query's select** for derived data:
   ```typescript
   const { data: totalKcal } = useQuery({
     queryKey: queryKeys.nutrition(date),
     queryFn: fetchNutrition,
     select: (data) => data.totals.kcal, // Only re-render when kcal changes
   });
   ```

### Virtualize Long Lists

For lists >50 items, use virtualization:

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 64, // Estimated row height
});
```

### Defer Non-Critical Renders

```typescript
import { useDeferredValue } from "react";

const deferredSearchQuery = useDeferredValue(searchQuery);
// Use deferredSearchQuery for expensive filtering
```

## File Organization

```
src/
├── components/
│   ├── ui/           # Reusable UI primitives
│   └── aura/         # App-specific components
├── hooks/
│   ├── useXxxQuery.ts    # React Query hooks
│   └── useXxx.ts         # Other hooks
├── lib/
│   ├── api.ts            # API functions
│   ├── queryKeys.ts      # Query key definitions
│   ├── offlineQueue.ts   # Offline support
│   └── schemas/          # Zod schemas
├── state/
│   ├── UserContext.tsx   # User profile + settings
│   ├── UIContext.tsx     # Transient UI state
│   └── AppStore.tsx      # Legacy (migrating away)
└── types/                # TypeScript types
```

## Migration Checklist

When migrating a hook to React Query:

- [ ] Create query keys in `queryKeys.ts`
- [ ] Convert fetch logic to `useQuery`
- [ ] Convert mutations to `useMutation` with optimistic updates
- [ ] Maintain backward-compatible API (same return shape)
- [ ] Re-export from original file for seamless migration
- [ ] Add offline queue support for mutations
- [ ] Update components to use new hook gradually

## Completed Migrations

The following hooks have been migrated to React Query:

| Original Hook | Query Hook | Status |
|---------------|------------|--------|
| `useTracking` | `useTrackingQuery` | ✅ Complete |
| `useDailyIntake` | `useDailyIntakeQuery` | ✅ Complete |
| `useFoodCatalog` | `useFoodCatalogQuery` | ✅ Complete |

Components updated to use new contexts:

| Component | Context Used |
|-----------|--------------|
| `Nutrition.tsx` | `useUserSettings`, `useMealPulse` |
| `MealLogPanel.tsx` | `useUserSettings` |
| `FoodList.tsx` | `useUserSettings` |
| `FoodDetailSheet.tsx` | `useUserSettings` |

## Offline Support

The app supports offline mutations via IndexedDB queue:

```
src/lib/offlineQueue.ts      # Queue implementation
src/lib/offlineHandlers.ts   # Mutation handlers (imported in App.tsx)
src/hooks/useOfflineQueue.ts # React hook for queue status
```

Supported offline operations:
- Logging food (`nutrition.logFood`)
- Removing log items (`nutrition.removeLogItem`)
- Updating log items (`nutrition.updateLogItem`)
- Setting goals (`nutrition.setGoal`, `nutrition.setMacroTargets`)
- Weight tracking (`tracking.addWeight`)
- Water tracking (`tracking.addWater`, `tracking.setWaterTotal`)
- Steps tracking (`tracking.setSteps`, `tracking.updateStepsGoal`)
- Food CRUD (`food.create`, `food.toggleFavorite`)

## Optimistic UI Patterns

### Key Principles

1. **Update UI Immediately**: Never await mutations in components - fire and forget
2. **Errors Handled by Mutation**: Let `onError` show toasts and rollback
3. **Offline-First**: Keep optimistic updates even when offline, queue for later sync

### Component Pattern

```typescript
// ❌ Wrong: Awaiting mutation blocks UI update
const handleAdd = async (food: FoodItem) => {
  try {
    await mutation.mutateAsync(food);
    toast("Added!");
  } catch {
    toast("Failed!");
  }
};

// ✅ Correct: Fire and forget, mutation handles errors
const handleAdd = (food: FoodItem) => {
  mutation.mutate(food);
  toast("Added!"); // Shows immediately
};
```

### onMutate Order of Operations

```typescript
onMutate: async (params) => {
  // 1. Get previous data FIRST (synchronous)
  const previous = queryClient.getQueryData(key);
  
  // 2. Update cache IMMEDIATELY (synchronous)
  queryClient.setQueryData(key, newData);
  
  // 3. Cancel queries LAST (async, but UI already updated)
  await queryClient.cancelQueries({ queryKey: key });
  
  return { previous };
}
```

### Offline Error Handling

```typescript
onError: (_err, params, context) => {
  // Offline: KEEP optimistic update, queue for sync
  if (!navigator.onLine) {
    void queueMutation("type", params);
    toast("Saved offline");
    return; // Don't rollback!
  }
  
  // Online error: Rollback and show retry
  if (context?.previous) {
    queryClient.setQueryData(key, context.previous);
  }
  toast("Failed", { action: { label: "Retry", onClick: () => mutate(params) } });
}
```

## Best Practices Summary

1. **Server State**: Use React Query for all API data
2. **User Settings**: Use `UserContext` for persistent preferences
3. **UI State**: Use `UIContext` for transient app state
4. **Local State**: Use `useState` for component-specific concerns
5. **Forms**: Use React Hook Form + Zod for validation
6. **Offline**: Queue mutations with `queueMutation` or `executeWithOfflineFallback`
7. **Optimistic Updates**: Update cache before async operations, never await in components
8. **Error Handling**: Only rollback for online errors, keep updates for offline
9. **Toasts**: Show retry actions on failures via `sonner`
