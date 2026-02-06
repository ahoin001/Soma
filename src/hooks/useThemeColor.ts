import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Dynamically updates the theme-color meta tag based on the current experience.
 * This makes the status bar blend seamlessly with the app's header.
 * 
 * Colors are chosen to match the top-most color of each experience's header gradient:
 * - Nutrition: Light emerald/white gradient top → use soft white/emerald
 * - Fitness: Dark slate background → use slate-950
 */
const THEME_COLORS = {
  nutrition: "#f0fdf4", // emerald-50 - matches the light header gradient top
  fitness: "#020617",   // slate-950 - matches the dark fitness background
} as const;

export function useThemeColor() {
  const location = useLocation();
  const isFitness = location.pathname.startsWith("/fitness");
  const experience = isFitness ? "fitness" : "nutrition";

  useEffect(() => {
    const color = THEME_COLORS[experience];
    
    // Update the theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", color);

    // Also update the apple-specific status bar style for better iOS support
    // black-translucent allows our content to flow under; the actual color comes from our app
    let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBar) {
      // Keep black-translucent for the edge-to-edge effect
      appleStatusBar.setAttribute("content", "black-translucent");
    }
  }, [experience]);

  return experience;
}
