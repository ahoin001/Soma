import type { ReactNode } from "react";
import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

type PageTransitionProps = {
  children: ReactNode;
  /** Disable animations (e.g., back/gesture navigation) */
  disabled?: boolean;
  /** Slightly more dramatic entrance when switching Nutrition ↔ Fitness */
  isExperienceSwitch?: boolean;
  transitionConfig?: {
    durationMs?: number;
    curve?: number;
    originY?: number;
    radiusPct?: number;
  };
  /** The INCOMING experience tone (the one being navigated TO) */
  experienceTone?: "nutrition" | "fitness";
};

/*
 * Experience color tokens
 * Used by the transition curtain to mask the content swap.
 */
const TONE_COLORS = {
  nutrition: "#f0fdf4", // nutrition surface tint
  fitness: "#020617", // fitness surface tint
} as const;

/**
 * Lightweight enter-only page wrapper.
 *
 * Premium apps (Spotify, Lifesum) never wait for an "exit" animation before
 * showing the next page. The new page mounts instantly and fades in.
 *
 * - Dock tab switches: 120ms opacity fade (near-instant, but not jarring).
 * - Experience switches: user-configurable entrance + transition curtain.
 * - No `exit` prop → AnimatePresence is not needed around Routes.
 *
 * ─── Transition curtain ──────────────────────────────────────────────
 * When switching between experiences the old page unmounts instantly
 * while the new page starts at opacity 0. Without intervention there
 * is a 1-2 frame flash where only the ExperienceBackdrop is visible.
 *
 * The curtain is a full-screen div (rendered via portal to <body>) that:
 *  1. Appears at opacity 1 in the SOURCE experience color → visually
 *     matches what the user was just looking at.
 *  2. Fades out over ~500ms, revealing the new page underneath.
 *
 * Because it uses a portal it escapes any clipPath / transforms on
 * the wrapper and always covers the full viewport.
 *
 * ─── CSS containing-block safety ─────────────────────────────────────
 * The wrapper motion.div must NEVER have `filter` or `transform` applied
 * (even blur(0px) or scale(1)) — these create a CSS "containing block"
 * that breaks position:fixed children (status bar glass, bottom nav).
 *
 * Safe properties: opacity, clipPath
 * Unsafe properties: filter, transform, scale, perspective
 */
export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  (
    {
      children,
      disabled = false,
      isExperienceSwitch = false,
      transitionConfig,
      experienceTone = "nutrition",
    },
    ref,
  ) => {
    if (disabled) {
      return <div ref={ref}>{children}</div>;
    }
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

    // ---- Experience switch ----

    // Source = the experience we're LEAVING (opposite of target)
    const sourceColor =
      experienceTone === "fitness"
        ? TONE_COLORS.nutrition
        : TONE_COLORS.fitness;

    // --- Page entrance variants (keep lightweight for mobile) ---
    // Avoid clipPath on the content itself (expensive on large DOM trees).
    const {
      durationMs = 900,
      curve = 1.1,
      originY = 0.22,
      radiusPct = 160,
    } = transitionConfig ?? {};
    const duration = Math.max(0.3, durationMs / 1000);
    const easeCurve: [number, number, number, number] = [0.2, curve, 0.25, 1];
    const origin = `${Math.round(originY * 100)}%`;
    const radius = `${Math.round(radiusPct)}%`;

    const motionProps = {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: Math.min(0.38, duration * 0.42), ease: easeCurve, delay: 0.06 },
    };

    // --- Curtain variant (rendered via portal) ---
    // Circular reveal only (tunable).
    const curtainMotion = {
      initial: { opacity: 1, clipPath: `circle(${radius} at 50% ${origin})` },
      animate: { opacity: 0, clipPath: `circle(0% at 50% ${origin})` },
      transition: { duration, ease: easeCurve },
    };

    return (
      <motion.div
        ref={ref}
        initial={motionProps.initial}
        animate={motionProps.animate}
        transition={motionProps.transition}
      >
        {/* ── Transition curtain (portal to body) ───────────────
             Covers the viewport in the SOURCE experience color to
             mask the 1-frame gap between old page unmount and new
             page becoming visible.  Fades/wipes out smoothly. */}
        {createPortal(
          <motion.div
            className="pointer-events-none fixed inset-0 z-[55]"
            initial={curtainMotion.initial}
            animate={curtainMotion.animate}
            transition={curtainMotion.transition}
            style={{ background: sourceColor }}
          />,
          document.body,
        )}
        {children}
      </motion.div>
    );
  },
);

PageTransition.displayName = "PageTransition";
