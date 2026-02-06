import type { ReactNode } from "react";
import { forwardRef } from "react";
import { motion } from "framer-motion";

type PageTransitionProps = {
  children: ReactNode;
  /** Slightly more dramatic entrance when switching Nutrition ↔ Fitness */
  isExperienceSwitch?: boolean;
  transitionStyle?: "blur-scale" | "color-wash" | "circular-reveal";
  experienceTone?: "nutrition" | "fitness";
};

/**
 * Lightweight enter-only page wrapper.
 *
 * Premium apps (Spotify, Lifesum) never wait for an "exit" animation before
 * showing the next page. The new page mounts instantly and fades in.
 *
 * - Dock tab switches: 120ms opacity fade (near-instant, but not jarring).
 * - Experience switches: slightly more dramatic entrance per user preference.
 * - No `exit` prop → AnimatePresence is not needed around Routes.
 */
export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  (
    {
      children,
      isExperienceSwitch = false,
      transitionStyle = "blur-scale",
      experienceTone = "nutrition",
    },
    ref,
  ) => {
    const transitionColor =
      experienceTone === "fitness" ? "#020617" : "#f0fdf4";

    // ---- Dock tab / normal navigation: fast subtle fade ----
    if (!isExperienceSwitch) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      );
    }

    // ---- Experience switch: configurable entrance ----
    const blurScale = {
      initial: { opacity: 0, scale: 0.97, filter: "blur(6px)" },
      animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
      transition: { duration: 0.22, ease: "easeOut" },
    };

    const circularReveal = {
      initial: { opacity: 0, clipPath: "circle(0% at 50% 20%)" },
      animate: { opacity: 1, clipPath: "circle(150% at 50% 20%)" },
      transition: { duration: 0.35, ease: "easeOut" },
    };

    // Color-wash: fast fade plus a reveal overlay
    const colorWash = {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.18, ease: "easeOut" },
    };

    const motionProps =
      transitionStyle === "circular-reveal"
        ? circularReveal
        : transitionStyle === "color-wash"
          ? colorWash
          : blurScale;

    return (
      <motion.div
        ref={ref}
        style={{ willChange: "opacity, filter, transform" }}
        initial={motionProps.initial}
        animate={motionProps.animate}
        transition={motionProps.transition}
      >
        {isExperienceSwitch && transitionStyle === "color-wash" ? (
          <motion.div
            className="pointer-events-none fixed inset-0 z-20"
            initial={{ opacity: 1, scaleY: 1 }}
            animate={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{
              background: transitionColor,
              transformOrigin: "top",
            }}
          />
        ) : null}
        {children}
      </motion.div>
    );
  },
);

PageTransition.displayName = "PageTransition";
