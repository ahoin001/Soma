import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      // Push toasts below the status bar / notch on PWA
      offset="calc(0.75rem + var(--sat, env(safe-area-inset-top, 0px)))"
      richColors
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            // Glass card with emerald accent gradient
            "!rounded-2xl !border !border-emerald-200/60",
            "!bg-gradient-to-r !from-white !via-emerald-50/80 !to-white",
            "!shadow-[0_12px_40px_rgba(16,185,129,0.14),0_2px_8px_rgba(0,0,0,0.06)]",
            "!backdrop-blur-xl",
            "!px-4 !py-3",
            "!text-slate-800 !font-medium",
          ].join(" "),
          title: "!text-sm !font-semibold !text-slate-900",
          description: "!text-xs !text-slate-500",
          actionButton: [
            "!rounded-full !px-3 !py-1.5",
            "!bg-emerald-500 !text-white !font-semibold !text-xs",
            "!shadow-[0_4px_12px_rgba(16,185,129,0.3)]",
            "!border-0",
            "hover:!bg-emerald-600",
          ].join(" "),
          cancelButton:
            "!rounded-full !bg-slate-100 !text-slate-600 !font-medium !text-xs",
          error: [
            "!border-red-200/60",
            "!bg-gradient-to-r !from-white !via-red-50/80 !to-white",
            "!shadow-[0_12px_40px_rgba(239,68,68,0.12),0_2px_8px_rgba(0,0,0,0.06)]",
          ].join(" "),
          success: [
            "!border-emerald-300/70",
            "!bg-gradient-to-r !from-emerald-50/90 !via-white !to-emerald-50/90",
            "!shadow-[0_12px_40px_rgba(16,185,129,0.18),0_2px_8px_rgba(0,0,0,0.06)]",
          ].join(" "),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
