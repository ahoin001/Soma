import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react/jsx")) return "react-dom";
            if (id.includes("react")) return "react";
            if (id.includes("@tanstack/react-query")) return "react-query";
            if (id.includes("react-router") || id.includes("react-router-dom")) return "router";
            if (id.includes("framer-motion")) return "framer-motion";
            if (id.includes("sonner") || id.includes("vaul") || id.includes("radix-ui")) return "ui-vendor";
          }
          return undefined;
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    target: "es2020",
    minify: "esbuild",
    cssCodeSplit: true,
    sourcemap: false,
  },
  plugins: [
    dyadComponentTagger(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "pwa-icon.svg",
        "offline.html",
        "pwa-64x64.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "maskable-icon-512x512.png",
        "apple-touch-icon-180x180.png",
      ],
      devOptions: {
        enabled: true,
      },
      workbox: {
        // Use index.html so refresh/failed document requests load the app; only show offline.html when truly uncached
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      manifest: {
        name: "AuraFit",
        short_name: "AuraFit",
        description: "A fast, offline-friendly nutrition tracker.",
        start_url: "/",
        display: "standalone",
        display_override: ["standalone", "fullscreen"],
        background_color: "#f0fdf4",
        theme_color: "#f0fdf4",
        orientation: "portrait-primary",
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
