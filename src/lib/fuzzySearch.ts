type FuzzyCandidate = {
  id: string;
  name: string;
  brand?: string | null;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreMatch = (text: string, query: string) => {
  if (!query) return 0;
  if (text.includes(query)) {
    return 120 - Math.min(text.indexOf(query), 60);
  }
  let score = 0;
  let lastIndex = 0;
  for (const char of query) {
    const found = text.indexOf(char, lastIndex);
    if (found === -1) return 0;
    score += 2;
    lastIndex = found + 1;
  }
  const tokens = query.split(" ");
  for (const token of tokens) {
    if (token && text.includes(token)) {
      score += 10;
    }
  }
  return score;
};

export const fuzzyFilter = <T extends FuzzyCandidate>(
  items: T[],
  rawQuery: string,
) => {
  const query = normalize(rawQuery);
  if (!query) return items;
  return items
    .map((item) => {
      const text = normalize(`${item.name} ${item.brand ?? ""}`);
      return { item, score: scoreMatch(text, query) };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
};
