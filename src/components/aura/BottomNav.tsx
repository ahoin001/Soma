import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Dumbbell,
  Layers,
  LineChart,
  Plus,
  Target,
  Timer,
} from "lucide-react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const NavButton = ({
  icon: Icon,
  label,
  to,
  active = false,
  tone = "light",
}: {
  icon: typeof BookOpen;
  label: string;
  to: string;
  active?: boolean;
  tone?: "light" | "dark";
}) => (
  <NavLink
    to={to}
    className={`flex w-14 flex-col items-center gap-1 text-xs font-medium ${
      active
        ? "text-foreground"
        : tone === "dark"
          ? "text-foreground/65"
          : "text-muted-foreground"
    }`}
  >
    <Icon className="h-5 w-5" />
    {label}
  </NavLink>
);

type BottomNavProps = {
  experience: "nutrition" | "fitness";
  onAddAction?: () => void;
};

export const BottomNav = ({ experience, onAddAction }: BottomNavProps) => {
  const isNutrition = experience === "nutrition";
  const tone = isNutrition ? "light" : "dark";
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const containerTone = "border-border/70 bg-card/90";

  // Use portal to render directly to body, escaping any parent transforms
  // that would break fixed positioning (e.g., PageTransition animations)
  const handleAddAction = () => {
    if (onAddAction) {
      onAddAction();
      return;
    }
    if (isNutrition) {
      navigate("/nutrition/add-food");
    }
  };

  return createPortal(
    <div
      className="aura-bottom-nav flex justify-center px-5 z-[40]"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: "max(1.25rem, var(--sab))",
      }}
    >
      <div
        className={`flex w-full max-w-sm items-center justify-between rounded-[28px] border px-6 py-3 shadow-[0_18px_36px_rgba(15,23,42,0.12)] backdrop-blur-md ${containerTone}`}
      >
        {isNutrition ? (
          <>
            <NavButton
              icon={BookOpen}
              label="Diary"
              to="/nutrition"
              active={path === "/nutrition"}
            />
            <NavButton
              icon={Target}
              label="Goals"
              to="/nutrition/goals"
              active={path.startsWith("/nutrition/goals")}
            />
            <Button
              type="button"
              onClick={handleAddAction}
              className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-[0_16px_30px_rgba(15,23,42,0.28)] hover:bg-primary/90"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <NavButton
              icon={LineChart}
              label="Progress"
              to="/nutrition/progress"
              active={path.startsWith("/nutrition/progress")}
            />
            <NavButton
              icon={BookOpen}
              label="Guides"
              to="/nutrition/guides"
              active={path.startsWith("/nutrition/guides") || path.startsWith("/nutrition/groceries")}
            />
          </>
        ) : (
          <>
            <NavButton
              icon={Dumbbell}
              label="Atlas"
              to="/fitness"
              active={path === "/fitness"}
              tone={tone}
            />
            <NavButton
              icon={Layers}
              label="Routines"
              to="/fitness/routines"
              active={path.startsWith("/fitness/routines")}
              tone={tone}
            />
            <Button
              className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-[0_16px_30px_rgba(15,23,42,0.28)] hover:bg-primary/90"
              onClick={handleAddAction}
              type="button"
            >
              <Timer className="h-5 w-5" />
            </Button>
            <NavButton
              icon={LineChart}
              label="Progress"
              to="/fitness/progress"
              active={path.startsWith("/fitness/progress")}
              tone={tone}
            />
            <NavButton
              icon={BookOpen}
              label="Log"
              to="/fitness/log"
              active={path.startsWith("/fitness/log")}
              tone={tone}
            />
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
