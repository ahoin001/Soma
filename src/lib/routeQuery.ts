export type ParamCodec<T> = {
  parse: (raw: string | null) => T | undefined;
  format: (value: T | undefined) => string | null;
};

export type QuerySchema = Record<string, ParamCodec<unknown>>;

type ParsedValue<C> = C extends ParamCodec<infer T> ? T : never;

export type QueryState<S extends QuerySchema> = {
  [K in keyof S]?: ParsedValue<S[K]>;
};

export const stringParam = (): ParamCodec<string> => ({
  parse: (raw) => (raw == null || raw === "" ? undefined : raw),
  format: (value) => (value == null || value === "" ? null : value),
});

export const enumParam = <const T extends readonly string[]>(
  values: T,
): ParamCodec<T[number]> => ({
  parse: (raw) =>
    raw && (values as readonly string[]).includes(raw)
      ? (raw as T[number])
      : undefined,
  format: (value) => (value == null ? null : value),
});

export const csvEnumParam = <const T extends readonly string[]>(
  values: T,
): ParamCodec<T[number][]> => ({
  parse: (raw) => {
    if (!raw) return undefined;
    const parsed = raw
      .split(",")
      .map((item) => item.trim())
      .filter((item): item is T[number] =>
        (values as readonly string[]).includes(item),
      );
    return parsed.length > 0 ? parsed : undefined;
  },
  format: (value) => (value && value.length ? value.join(",") : null),
});

export const parseQuery = <S extends QuerySchema>(
  searchParams: URLSearchParams,
  schema: S,
): QueryState<S> => {
  const out: Partial<QueryState<S>> = {};
  for (const key of Object.keys(schema) as Array<keyof S>) {
    const parsed = schema[key].parse(searchParams.get(String(key)));
    if (parsed !== undefined) {
      out[key] = parsed as QueryState<S>[keyof S];
    }
  }
  return out as QueryState<S>;
};

export const setQueryFromState = <S extends QuerySchema>(
  base: URLSearchParams,
  schema: S,
  state: QueryState<S>,
  defaults?: Partial<QueryState<S>>,
) => {
  const next = new URLSearchParams(base);

  for (const key of Object.keys(schema) as Array<keyof S>) {
    const value = state[key];
    const defaultValue = defaults?.[key];
    const sameAsDefault =
      defaultValue !== undefined &&
      JSON.stringify(value) === JSON.stringify(defaultValue);

    const encoded = sameAsDefault
      ? null
      : schema[key].format(value as ParsedValue<S[typeof key]> | undefined);

    if (encoded == null || encoded === "") {
      next.delete(String(key));
    } else {
      next.set(String(key), encoded);
    }
  }

  return next;
};
