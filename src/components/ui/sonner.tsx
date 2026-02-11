import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      className="toaster group"
      position="top-center"
      richColors
      offset={{ top: "0.75rem" }}
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "!rounded-2xl !border !border-border/80",
            "!bg-card",
            "!shadow-[0_10px_28px_rgba(15,23,42,0.18),0_2px_8px_rgba(0,0,0,0.06)]",
            "!backdrop-blur-xl",
            "!px-4 !py-3",
            "!text-foreground !font-medium",
          ].join(" "),
          title: "!text-sm !font-semibold !text-foreground",
          description: "!text-xs !text-muted-foreground",
          actionButton: [
            "!rounded-full !px-3 !py-1.5",
            "!bg-primary !text-primary-foreground !font-semibold !text-xs",
            "!shadow-[0_4px_12px_rgba(15,23,42,0.18)]",
            "!border-0",
            "hover:!opacity-90",
          ].join(" "),
          cancelButton: "!rounded-full !bg-secondary !text-secondary-foreground !font-medium !text-xs",
          error: [
            "!border-destructive/30",
            "!bg-card",
          ].join(" "),
          success: [
            "!border-primary/40",
            "!bg-card",
          ].join(" "),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
