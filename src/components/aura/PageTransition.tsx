import type { ReactNode } from "react";
import { forwardRef } from "react";
import { motion } from "framer-motion";

type PageTransitionProps = {
  children: ReactNode;
  direction?: "forward" | "back";
};

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ children, direction = "forward" }, ref) => {
  const offset = direction === "forward" ? 12 : -12;
  return (
    <motion.div
      ref={ref}
      className="min-h-screen bg-background"
      style={{ willChange: "opacity, filter, transform" }}
      initial={{
        opacity: 0,
        x: offset,
        filter: "blur(8px)",
      }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{
        opacity: 0,
        x: -offset,
        filter: "blur(6px)",
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
  },
);

PageTransition.displayName = "PageTransition";
