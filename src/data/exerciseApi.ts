const WGER_BASE_URL = "https://wger.de/api/v2";

type WgerExercise = {
  id: number;
  name: string;
  description?: string;
};

type WgerImage = {
  image?: string;
};

const fetchJson = async <T,>(url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Exercise API request failed.");
  }
  return (await response.json()) as T;
};

export const searchWgerExercises = async (query: string) => {
  const params = new URLSearchParams({
    language: "2",
    status: "2",
    limit: "10",
    offset: "0",
    search: query,
  });
  const data = await fetchJson<{ results?: WgerExercise[] }>(
    `${WGER_BASE_URL}/exercise/?${params.toString()}`,
  );
  return data.results ?? [];
};

export const fetchWgerExerciseImages = async (exerciseId: number) => {
  const params = new URLSearchParams({
    limit: "5",
    offset: "0",
    exercise: String(exerciseId),
  });
  const data = await fetchJson<{ results?: WgerImage[] }>(
    `${WGER_BASE_URL}/exerciseimage/?${params.toString()}`,
  );
  return (data.results ?? []).map((item) => item.image).filter(Boolean) as string[];
};
