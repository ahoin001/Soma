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
      style={{ willChange: "opacity, filter" }}
      initial={{
        opacity: 0,
        filter: "blur(8px)",
      }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{
        opacity: 0,
        filter: "blur(6px)",
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};
