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
  void direction;
  return (
    <motion.div
      className="min-h-screen bg-background"
      style={{ willChange: "transform, opacity" }}
      initial={{
        opacity: 0,
        y: direction === "back" ? -8 : 8,
      }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        y: direction === "back" ? 6 : -6,
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};
