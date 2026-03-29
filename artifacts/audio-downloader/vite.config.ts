import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

const port = Number(process.env.PORT ?? 3000);
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "logo.png",
        "apple-touch-icon.png",
        "offline.html",
        "icons/*.png",
        "screenshots/*.jpg",
      ],
      manifest: {
        id: "/",
        name: "RIPPD – Audio Ripper",
        short_name: "RIPPD",
        description:
          "Paste any YouTube, SoundCloud, Bandcamp, Vimeo, Twitch or Dailymotion link and download the audio as a high-quality MP3 directly to your device.",
        start_url: basePath,
        scope: basePath,
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
        background_color: "#0a0a12",
        theme_color: "#9B30FF",
        orientation: "portrait-primary",
        lang: "en-US",
        dir: "ltr",
        categories: ["music", "utilities", "entertainment"],
        prefer_related_applications: false,
        handle_links: "preferred",
        edge_side_panel: { preferred_width: 400 },
        protocol_handlers: [
          { protocol: "web+rippd", url: "/?url=%s" },
        ],
        shortcuts: [
          {
            name: "Paste & Rip",
            short_name: "Paste",
            description: "Instantly paste a link from your clipboard and rip the audio",
            url: "/",
            icons: [{ src: "icons/icon-96.png", sizes: "96x96", type: "image/png" }],
          },
          {
            name: "Spotify History",
            short_name: "Spotify",
            description: "Import your Spotify streaming history and rip tracks as MP3",
            url: "/spotify-history",
            icons: [{ src: "icons/icon-96.png", sizes: "96x96", type: "image/png" }],
          },
        ],
        screenshots: [
          {
            src: "screenshots/narrow.jpg",
            type: "image/jpeg",
            sizes: "390x844",
            form_factor: "narrow",
            label: "RIPPD home — paste a link and rip the audio",
          },
          {
            src: "screenshots/wide.jpg",
            type: "image/jpeg",
            sizes: "1280x720",
            form_factor: "wide",
            label: "RIPPD desktop — full-width audio downloader",
          },
        ],
        icons: [
          { src: "icons/icon-48.png",   sizes: "48x48",   type: "image/png" },
          { src: "icons/icon-72.png",   sizes: "72x72",   type: "image/png" },
          { src: "icons/icon-96.png",   sizes: "96x96",   type: "image/png" },
          { src: "icons/icon-128.png",  sizes: "128x128", type: "image/png" },
          { src: "icons/icon-144.png",  sizes: "144x144", type: "image/png" },
          { src: "icons/icon-152.png",  sizes: "152x152", type: "image/png" },
          { src: "icons/icon-192.png",  sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-256.png",  sizes: "256x256", type: "image/png" },
          { src: "icons/icon-384.png",  sizes: "384x384", type: "image/png" },
          { src: "icons/icon-512.png",  sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff,woff2}"],
        additionalManifestEntries: [
          { url: "offline.html", revision: "1" },
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        offlineGoogleAnalytics: false,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
