import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);
const basePath = process.env.BASE_PATH ?? "/";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

// PUBLIC_APP_URL — the live public domain (e.g. https://joinrippl.com).
// Falls back to APP_URL if PUBLIC_APP_URL is not set, then to empty string.
const publicAppUrl = (
  process.env.PUBLIC_APP_URL ||
  process.env.APP_URL ||
  ""
).replace(/\/$/, ""); // strip any trailing slash

console.log("Build env check:", {
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseKey,
  publicAppUrl: publicAppUrl || "(not set — will use window.location.origin)",
});

if (!supabaseUrl || !supabaseKey) {
  console.warn("WARNING: Supabase credentials missing at build time — auth will fail in production");
}

export default defineConfig({
  base: basePath,
  define: {
    __SUPABASE_URL__: JSON.stringify(supabaseUrl),
    __SUPABASE_ANON_KEY__: JSON.stringify(supabaseKey),
    // Bakes the public app URL into the frontend bundle at build time.
    // Set PUBLIC_APP_URL (or APP_URL) to "https://joinrippl.com" in env vars.
    __PUBLIC_APP_URL__: JSON.stringify(publicAppUrl),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
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
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      // Force workspace package's transitive deps into the shared bundle
      "@workspace/api-client-react > @tanstack/react-query",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
          ],
          "vendor-motion": ["framer-motion"],
          "vendor-charts": ["recharts"],
          "vendor-utils": ["date-fns", "zod", "wouter"],
        },
      },
    },
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
