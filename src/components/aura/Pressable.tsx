import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PressableProps = {
  children: ReactNode;
  className?: string;
};

export const Pressable = ({ children, className }: PressableProps) => (
  <div
    className={cn(
      "transition duration-200 ease-out active:scale-[0.98]",
      className,
    )}
  >
    {children}
  </div>
);
