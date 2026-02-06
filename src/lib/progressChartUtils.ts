import { toLocalDate } from "@/lib/nutritionData";
import type { TrendEntry } from "@/types/progress";

export const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));

export const buildSmoothPath = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  const midPoint = (p1: { x: number; y: number }, p2: { x: number; y: number }) => ({
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  });
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];
    const mid = midPoint(prev, current);
    path += ` Q ${prev.x} ${prev.y} ${mid.x} ${mid.y}`;
  }
  const last = points[points.length - 1];
  path += ` T ${last.x} ${last.y}`;
  return path;
};

export const buildDateRange = (days: number) => {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const target = new Date(today);
    target.setDate(today.getDate() - (days - 1 - index));
    return toLocalDate(target);
  });
};

export const buildTrendPath = (
  entries: TrendEntry[],
  viewWidth: number,
  viewHeight: number,
  padding: number,
) => {
  const usable = entries.filter((entry) => entry.value !== null);
  if (usable.length < 2) return { path: "", points: [], hasData: false };
  const times = usable.map((entry) => new Date(entry.date).getTime());
  const values = usable.map((entry) => entry.value ?? 0);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const timeSpan = Math.max(maxTime - minTime, 1);
  const valueSpan = Math.max(maxValue - minValue, 1);
  const points = usable.map((entry) => {
    const time = new Date(entry.date).getTime();
    const x = padding + ((time - minTime) / timeSpan) * (viewWidth - padding * 2);
    const y =
      padding +
      (1 - ((entry.value ?? 0) - minValue) / valueSpan) *
        (viewHeight - padding * 2);
    return { x, y };
  });
  return { path: buildSmoothPath(points), points, hasData: true };
};
