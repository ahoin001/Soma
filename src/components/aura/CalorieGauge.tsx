import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

type CalorieGaugeProps = {
  value: number;
  goal: number;
  /** When this value changes, a brief celebration pulse is played (e.g. after logging food). */
  celebrateTrigger?: number;
};

const lerp = (from: number, to: number, progress: number) =>
  Math.round(from + (to - from) * progress);

export const CalorieGauge = ({ value, goal, celebrateTrigger }: CalorieGaugeProps) => {
  const radius = 120;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const arcLength = circumference * 0.75;
  const progress = Math.min(Math.max(value / goal, 0), 1);
  const dash = arcLength * progress;
  const gradientId = useId();
  const glowId = useId();
  const glowStrength = 0.25 + progress * 0.6;
  const strokeColor = {
    r: lerp(16, 34, progress),
    g: lerp(185, 211, progress),
    b: lerp(129, 238, progress),
  };
  const glowColor = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${glowStrength})`;
  const strokeRgb = `rgb(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b})`;
  const prevValueRef = useRef<number | null>(null);
  const prevCelebrateRef = useRef<number | undefined>(undefined);
  const [pulseKey, setPulseKey] = useState(0);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const reducedShadow = useMemo(
    () =>
      `drop-shadow(0 20px 38px rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${
        0.25 + progress * 0.4
      }))`,
    [progress, strokeColor],
  );

  useEffect(() => {
    if (prevValueRef.current === null) {
      prevValueRef.current = value;
      return;
    }
    if (prevValueRef.current !== value) {
      setPulseKey((prev) => prev + 1);
      prevValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (celebrateTrigger === undefined || celebrateTrigger === prevCelebrateRef.current) return;
    prevCelebrateRef.current = celebrateTrigger;
    setCelebrateKey((k) => k + 1);
  }, [celebrateTrigger]);

  return (
    <motion.div
      key={celebrateKey > 0 ? `celebrate-${celebrateKey}` : pulseKey}
      className="h-full w-full"
      animate={{ scale: [1, 1.07, 1] }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg
        viewBox="0 0 260 260"
        className="h-full w-full"
        style={{ filter: reducedShadow }}
      >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity="0.35" />
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
      <g className="origin-center" style={{ transform: "rotate(135deg)" }}>
        <circle
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx="130"
          cy="130"
          style={{ strokeDasharray: `${arcLength} ${circumference}` }}
        />
        <motion.circle
          stroke={glowColor}
          strokeWidth={stroke + 2}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx="130"
          cy="130"
          strokeDasharray={`${dash} ${circumference}`}
          filter={`url(#${glowId})`}
        />
        <motion.circle
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx="130"
          cy="130"
          strokeDasharray={`${dash} ${circumference}`}
          initial={false}
          animate={{ strokeDasharray: `${dash} ${circumference}` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </g>
      </svg>
    </motion.div>
  );
};
