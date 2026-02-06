import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export const PageContainer = ({ children, className }: PageContainerProps) => (
  <div
    className={cn("mx-auto w-full max-w-[420px] px-4 pb-10", className)}
    style={{ paddingTop: "calc(1rem + var(--sat, env(safe-area-inset-top)))" }}
  >
    {children}
  </div>
);
