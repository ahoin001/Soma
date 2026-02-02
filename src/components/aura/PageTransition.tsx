import type { ReactNode } from "react";
import { motion } from "framer-motion";

type PageTransitionProps = {
  children: ReactNode;
  direction?: "forward" | "back";
};

export const PageTransition = ({
  children,
  direction = "forward",
}: PageTransitionProps) => {
  const offset = direction === "back" ? -22 : 28;
  const exitOffset = direction === "back" ? 24 : -22;
  return (
    <motion.div
      className="min-h-screen bg-background will-change-transform"
      initial={{ opacity: 1, x: offset }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 1, x: exitOffset }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};
