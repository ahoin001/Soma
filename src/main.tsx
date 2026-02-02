import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { registerSW } from "virtual:pwa-register";

createRoot(document.getElementById("root")!).render(<App />);

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
