import { useId } from "react";

type CalorieGaugeProps = {
  value: number;
  goal: number;
};

const lerp = (from: number, to: number, progress: number) =>
  Math.round(from + (to - from) * progress);

export const CalorieGauge = ({ value, goal }: CalorieGaugeProps) => {
  const radius = 74;
  const circumference = Math.PI * radius;
  const progress = Math.min(Math.max(value / goal, 0), 1);
  const dash = circumference * progress;
  const gradientId = useId();
  const glowId = useId();
  const glowStrength = 0.2 + progress * 0.6;
  const strokeColor = {
    r: lerp(16, 34, progress),
    g: lerp(185, 211, progress),
    b: lerp(129, 238, progress),
  };
  const glowColor = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${glowStrength})`;
  const strokeRgb = `rgb(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b})`;

  return (
    <svg
      viewBox="0 0 200 120"
      className="h-36 w-36"
      style={{
        filter: `drop-shadow(0 18px 30px rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${0.2 + progress * 0.35}))`,
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity="0.45" />
          <stop offset="55%" stopColor={strokeRgb} stopOpacity="1" />
          <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.95" />
        </linearGradient>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M26 100 A 74 74 0 0 1 174 100"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M26 100 A 74 74 0 0 1 174 100"
        stroke={glowColor}
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        filter={`url(#${glowId})`}
      />
      <path
        d="M26 100 A 74 74 0 0 1 174 100"
        stroke={`url(#${gradientId})`}
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
      />
    </svg>
  );
};
