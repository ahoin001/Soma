import { appToast } from "@/lib/toast";

export const showSuccess = (message: string) => {
  appToast.success(message);
};

export const showError = (message: string) => {
  appToast.error(message);
};

export const showLoading = (message: string) => {
  return appToast.loading(message);
};

export const dismissToast = (toastId: string) => {
  appToast.dismiss(toastId);
};
