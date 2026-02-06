import type { ReactNode } from "react";
import { forwardRef } from "react";
import { motion } from "framer-motion";

type PageTransitionProps = {
  children: ReactNode;
  direction?: "forward" | "back";
  transitionStyle?: "blur-scale" | "color-wash" | "circular-reveal";
  experienceTone?: "nutrition" | "fitness";
  isExperienceSwitch?: boolean;
};

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  (
    {
      children,
      direction = "forward",
      transitionStyle = "blur-scale",
      experienceTone = "nutrition",
      isExperienceSwitch = false,
    },
    ref,
  ) => {
  const offset = direction === "forward" ? 12 : -12;
  const transitionColor = experienceTone === "fitness" ? "#020617" : "#f0fdf4";

  const defaultMotion = {
    initial: { opacity: 0, x: offset, filter: "blur(8px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: -offset, filter: "blur(6px)" },
    transition: { duration: 0.25, ease: "easeOut" },
  };

  const blurScaleMotion = {
    initial: { opacity: 0, scale: 0.96, filter: "blur(10px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 1.02, filter: "blur(6px)" },
    transition: { duration: 0.3, ease: "easeOut" },
  };

  const circularRevealMotion = {
    initial: { opacity: 0, clipPath: "circle(0% at 50% 20%)" },
    animate: { opacity: 1, clipPath: "circle(140% at 50% 20%)" },
    exit: { opacity: 0, clipPath: "circle(20% at 50% 20%)" },
    transition: { duration: 0.5, ease: "easeOut" },
  };

  const motionProps =
    !isExperienceSwitch
      ? defaultMotion
      : transitionStyle === "blur-scale"
      ? blurScaleMotion
      : transitionStyle === "circular-reveal"
      ? circularRevealMotion
      : defaultMotion;

  return (
    <motion.div
      ref={ref}
      className="relative min-h-screen bg-background"
      style={{ willChange: "opacity, filter, transform" }}
      initial={motionProps.initial}
      animate={motionProps.animate}
      exit={motionProps.exit}
      transition={motionProps.transition}
    >
      {isExperienceSwitch && transitionStyle === "color-wash" ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-20"
          initial={{ opacity: 1, scaleY: 1 }}
          animate={{ opacity: 1, scaleY: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            background: transitionColor,
            transformOrigin: "top",
          }}
        />
      ) : null}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
  },
);

PageTransition.displayName = "PageTransition";
