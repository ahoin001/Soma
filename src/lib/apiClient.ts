const API_BASE = import.meta.env.VITE_API_URL ?? "";
const USER_KEY = "aura-user-id";

const getStoredUserId = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_KEY);
};

const storeUserId = (value: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, value);
};

const generateUserId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const hex = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0"),
  );
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-4${hex
    .slice(6, 8)
    .join("")}-${((parseInt(hex[8], 16) & 0x3) | 0x8).toString(16)}${hex
    .slice(9, 11)
    .join("")}-${hex.slice(11, 16).join("")}`;
};

const ensureUserId = () => {
  const existing = getStoredUserId();
  if (existing) return existing;
  const created = generateUserId();
  storeUserId(created);
  return created;
};

let bootstrapPromise: Promise<void> | null = null;

const bootstrapUser = async () => {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const userId = ensureUserId();
    await fetch(`${API_BASE}/api/users/bootstrap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({}),
    });
  })();
  return bootstrapPromise;
};

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  await bootstrapUser();
  const userId = ensureUserId();
  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("x-user-id", userId);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed.");
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};
