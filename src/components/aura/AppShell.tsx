import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";

type AppShellProps = {
  experience: "nutrition" | "fitness";
  children: ReactNode;
  className?: string;
  showNav?: boolean;
};

export const AppShell = ({
  experience,
  children,
  className,
  showNav = true,
}: AppShellProps) => (
  <div
    className={cn(
      "min-h-screen pb-[calc(8rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] text-foreground",
      experience === "nutrition"
        ? "experience-nutrition bg-aura-surface"
        : "experience-fitness bg-background",
      className,
    )}
  >
    {children}
    {showNav ? <BottomNav experience={experience} /> : null}
  </div>
);
