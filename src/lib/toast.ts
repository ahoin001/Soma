import { toast } from "sonner";
import type { ExternalToast } from "sonner";

type AppToastOptions = ExternalToast;

const defaults = {
  success: { duration: 2800 },
  error: { duration: 4200 },
  info: { duration: 2400 },
  loading: { duration: Infinity },
} as const;

export const appToast = {
  success: (message: React.ReactNode, options?: AppToastOptions) =>
    toast.success(message, {
      ...defaults.success,
      ...options,
      duration: options?.duration ?? defaults.success.duration,
    }),
  error: (message: React.ReactNode, options?: AppToastOptions) =>
    toast.error(message, {
      ...defaults.error,
      ...options,
      duration: options?.duration ?? defaults.error.duration,
    }),
  info: (message: React.ReactNode, options?: AppToastOptions) =>
    toast(message, {
      ...defaults.info,
      ...options,
      duration: options?.duration ?? defaults.info.duration,
    }),
  loading: (message: React.ReactNode, options?: AppToastOptions) =>
    toast.loading(message, {
      ...defaults.loading,
      ...options,
      duration: options?.duration ?? defaults.loading.duration,
    }),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
