import { useCallback } from "react";
import { useRouteQueryState } from "@/hooks/useRouteQueryState";
import type { QuerySchema, QueryState } from "@/lib/routeQuery";

type UseSheetRouteStateOptions<S extends QuerySchema> = {
  defaults?: Partial<QueryState<S>>;
  sheetKey?: keyof QueryState<S>;
};

export const useSheetRouteState = <S extends QuerySchema>(
  schema: S,
  options?: UseSheetRouteStateOptions<S>,
) => {
  const { query, mergeQueryState, searchParams, setSearchParams } =
    useRouteQueryState(schema, { defaults: options?.defaults });

  const sheetKey = (options?.sheetKey ?? "sheet") as keyof QueryState<S>;

  const closeRouteSheet = useCallback(
    (clearKeys: Array<keyof QueryState<S>> = []) => {
      const patch: Partial<QueryState<S>> = { [sheetKey]: undefined } as Partial<
        QueryState<S>
      >;
      for (const key of clearKeys) {
        patch[key] = undefined;
      }
      mergeQueryState(patch);
    },
    [mergeQueryState, sheetKey],
  );

  const openRouteSheet = useCallback(
    (
      sheetValue: QueryState<S>[typeof sheetKey],
      patch: Partial<QueryState<S>> = {},
      clearKeys: Array<keyof QueryState<S>> = [],
    ) => {
      const nextPatch: Partial<QueryState<S>> = {
        ...patch,
        [sheetKey]: sheetValue,
      } as Partial<QueryState<S>>;
      for (const key of clearKeys) {
        nextPatch[key] = undefined;
      }
      mergeQueryState(nextPatch);
    },
    [mergeQueryState, sheetKey],
  );

  return {
    query,
    searchParams,
    setSearchParams,
    openRouteSheet,
    closeRouteSheet,
  };
};
