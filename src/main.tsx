import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { registerSW } from "virtual:pwa-register";

createRoot(document.getElementById("root")!).render(<App />);

// Defer PWA registration until after first paint so it doesn't compete with initial load
if (import.meta.env.PROD) {
  const defer = (fn: () => void) => {
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(fn, { timeout: 2000 });
    } else {
      setTimeout(fn, 500);
    }
  };
  defer(() => registerSW({ immediate: true }));
}
