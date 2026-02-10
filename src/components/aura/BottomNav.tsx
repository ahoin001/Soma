import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Dumbbell,
  Layers,
  LineChart,
  Plus,
  ShoppingBag,
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
        ? tone === "dark"
          ? "text-white"
          : "text-slate-900"
        : tone === "dark"
          ? "text-white/60"
          : "text-slate-400"
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
  const containerTone = isNutrition
    ? "border-black/5 bg-white"
    : "border-white/10 bg-slate-950/90 text-white";

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
              className="h-12 w-12 rounded-full bg-aura-primary shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
            >
              <Plus className="h-5 w-5 text-white" />
            </Button>
            <NavButton
              icon={LineChart}
              label="Progress"
              to="/nutrition/progress"
              active={path.startsWith("/nutrition/progress")}
            />
            <NavButton
              icon={ShoppingBag}
              label="Groceries"
              to="/nutrition/groceries"
              active={path.startsWith("/nutrition/groceries")}
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
              className="h-12 w-12 rounded-full bg-emerald-400 shadow-[0_16px_30px_rgba(45,212,191,0.35)] hover:bg-emerald-300"
              onClick={handleAddAction}
              type="button"
            >
              <Timer className="h-5 w-5 text-slate-950" />
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
