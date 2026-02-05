export const queryKeys = {
  auth: ["auth"] as const,
  user: (id?: string) => ["user", id ?? "me"] as const,
  nutrition: (localDate: string) => ["nutrition", localDate] as const,
  mealEntries: (localDate: string) => ["mealEntries", localDate] as const,
  mealTypes: ["mealTypes"] as const,
  foodSearch: (query: string, filters?: Record<string, unknown>) =>
    ["foodSearch", query, filters ?? {}] as const,
  foodFavorites: ["foodFavorites"] as const,
  foodHistory: ["foodHistory"] as const,
  exercises: (query?: string) => ["exercises", query ?? "all"] as const,
  routines: ["routines"] as const,
  fitnessSession: ["fitnessSession"] as const,
  fitnessHistory: ["fitnessHistory"] as const,
  trackingSteps: (localDate: string) => ["trackingSteps", localDate] as const,
  trackingWater: (localDate: string) => ["trackingWater", localDate] as const,
  trackingWeight: ["trackingWeight"] as const,
};
