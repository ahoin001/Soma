import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dumbbell, Droplets, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type OnboardingCarouselProps = {
  onFinish: () => void;
};

const slides = [
  {
    chip: "Personalized",
    title: "Build a plan that fits your life",
    body: "Answer a few questions and we’ll tailor calories and macros for your goals.",
    accent: "Plan",
    icon: Sparkles,
    highlight: "Smart targets",
    stats: [
      { label: "Calories", value: "2,150" },
      { label: "Protein", value: "140g" },
      { label: "Carbs", value: "220g" },
    ],
  },
  {
    chip: "Daily habit",
    title: "Log once, learn daily",
    body: "Track meals, water, and steps with quick actions that keep you consistent.",
    accent: "Track",
    icon: Droplets,
    highlight: "Daily streak",
    stats: [
      { label: "Hydration", value: "1.7L" },
      { label: "Steps", value: "7,800" },
      { label: "Streak", value: "6 days" },
    ],
  },
  {
    chip: "Progress",
    title: "Train with clarity",
    body: "Create workouts, log sessions, and see your progress in one place.",
    accent: "Train",
    icon: Dumbbell,
    highlight: "Weekly load",
    stats: [
      { label: "Sessions", value: "4" },
      { label: "Volume", value: "18.2k" },
      { label: "PRs", value: "+2" },
    ],
  },
];

export const OnboardingCarousel = ({ onFinish }: OnboardingCarouselProps) => {
  const [index, setIndex] = useState(0);
  const slide = useMemo(() => slides[index], [index]);
  const isLast = index === slides.length - 1;
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-emerald-100 via-emerald-50 to-white text-emerald-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-12 h-32 w-32 rounded-full bg-emerald-200/60 blur-3xl" />
        <div className="absolute -right-10 bottom-16 h-40 w-40 rounded-full bg-emerald-300/50 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-sm px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.accent}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/80 shadow-[0_12px_24px_rgba(16,185,129,0.2)]">
              <Icon className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-emerald-400">
              {slide.accent}
            </p>
            <h2 className="mt-3 text-2xl font-display font-semibold">{slide.title}</h2>
            <p className="mt-2 text-sm text-emerald-700/70">{slide.body}</p>
            <div className="mt-6 rounded-[28px] border border-emerald-100 bg-white/90 p-4 text-left shadow-[0_18px_40px_rgba(16,185,129,0.15)]">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  {slide.chip}
                </span>
                <span className="text-xs text-emerald-400">{slide.highlight}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {slide.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-3 py-3 text-center"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-500">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-900">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-2 rounded-full bg-emerald-100">
                <div
                  className="h-2 rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${((index + 1) / slides.length) * 100}%` }}
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-8 flex items-center justify-center gap-2">
          {slides.map((_, idx) => (
            <span
              key={String(idx)}
              className={`h-2 w-2 rounded-full ${
                idx === index ? "bg-emerald-400" : "bg-emerald-200"
              }`}
            />
          ))}
        </div>
        <div className="mt-8 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 rounded-full text-xs text-emerald-600"
            onClick={onFinish}
          >
            Skip
          </Button>
          <Button
            type="button"
            className="flex-1 rounded-full bg-aura-primary py-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
            onClick={() => {
              if (isLast) {
                onFinish();
              } else {
                setIndex((prev) => prev + 1);
              }
            }}
          >
            {isLast ? "Continue" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
};
