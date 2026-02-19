import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  parseQuery,
  setQueryFromState,
  type QuerySchema,
  type QueryState,
} from "@/lib/routeQuery";

type SetOptions = {
  replace?: boolean;
};

type UseRouteQueryStateOptions<S extends QuerySchema> = {
  defaults?: Partial<QueryState<S>>;
};

export const useRouteQueryState = <S extends QuerySchema>(
  schema: S,
  options?: UseRouteQueryStateOptions<S>,
) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(
    () => parseQuery(searchParams, schema),
    [schema, searchParams],
  );

  const setQueryState = useCallback(
    (nextState: QueryState<S>, setOptions?: SetOptions) => {
      const nextParams = setQueryFromState(
        searchParams,
        schema,
        nextState,
        options?.defaults,
      );
      if (nextParams.toString() !== searchParams.toString()) {
        setSearchParams(nextParams, { replace: setOptions?.replace ?? true });
      }
    },
    [options?.defaults, schema, searchParams, setSearchParams],
  );

  const mergeQueryState = useCallback(
    (patch: Partial<QueryState<S>>, setOptions?: SetOptions) => {
      setQueryState(
        {
          ...query,
          ...patch,
        },
        setOptions,
      );
    },
    [query, setQueryState],
  );

  return {
    query,
    searchParams,
    setSearchParams,
    setQueryState,
    mergeQueryState,
  };
};
