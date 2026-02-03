export type LogItem = {
  id?: string;
  name: string;
  kcal: number;
  macros: {
    carbs: number;
    protein: number;
    fat: number;
  };
  emoji: string;
  imageUrl?: string | null;
};

export type LogSection = {
  meal: string;
  time: string;
  items: LogItem[];
};
