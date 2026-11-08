/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// For GitHub Pages: use base '/' for custom domain (e.g. mastaanrandhawa.com).
// If you use a project page (username.github.io/REPO_NAME), set BASE_PATH=/REPO_NAME/ in the workflow.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Path-based so shared deps (react, scheduler) never land in the 3D chunks;
        // the classic portfolio must not preload any WebGL code.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "vendor";
          if (id.includes("node_modules/three/")) return "three";
          if (/node_modules\/(@react-three|postprocessing|n8ao|its-fine|suspend-react|react-reconciler)/.test(id)) return "r3f";
          return undefined;
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: false,
  },
});
