import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Dağıtım Kurye",
        short_name: "Kurye",
        description: "Zarf dağıtım ve teslimat uygulaması",
        theme_color: "#1d4ed8",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        lang: "tr",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        runtimeCaching: [{ urlPattern: /\/api\/kurye\/gonderiler/, handler: "NetworkFirst", options: { cacheName: "gonderiler", networkTimeoutSeconds: 8 } }],
      },
    }),
  ],
  server: {
    proxy: { "/api": { target: process.env.VITE_API_PROXY ?? "http://localhost:3000", changeOrigin: true } },
  },
});
