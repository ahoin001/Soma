/**
 * Lightweight haptic utility for web/PWA/Capacitor surfaces.
 * Uses short vibration when available; silently no-ops otherwise.
 */
import { HAPTICS_ENABLED_KEY } from "@/lib/storageKeys";

type HapticStyle = "toggle" | "soft" | "action" | "success";

const HAPTIC_DURATION_MS: Record<HapticStyle, number> = {
  toggle: 6,
  soft: 8,
  action: 12,
  success: 16,
};

export const triggerHaptic = (style: HapticStyle = "soft") => {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(HAPTICS_ENABLED_KEY);
    if (stored === "false") return;
  }
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate(HAPTIC_DURATION_MS[style]);
};

export const triggerToggleHaptic = () => triggerHaptic("toggle");
export const triggerSoftHaptic = () => triggerHaptic("soft");
export const triggerActionHaptic = () => triggerHaptic("action");
