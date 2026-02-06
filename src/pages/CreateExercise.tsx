import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { CreateExerciseForm } from "@/components/aura/CreateExerciseSheet";

const CreateExercise = () => {
  const navigate = useNavigate();

  return (
    <AppShell experience="fitness" showNav={false}>
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4 text-white">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            ✕
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              IronFlow
            </p>
          </div>
          <div className="h-10 w-10" />
        </div>

        <div className="mt-4 rounded-[28px] border border-white/10 bg-white/5 shadow-[0_24px_40px_rgba(0,0,0,0.35)]">
          <CreateExerciseForm
            onCreated={(name) => {
              navigate(-1);
            }}
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>
    </AppShell>
  );
};

export default CreateExercise;
