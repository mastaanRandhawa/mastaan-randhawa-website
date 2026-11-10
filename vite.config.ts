/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import type { Plugin } from "vite";

/**
 * Development only: receives a freshly baked model file from the game
 * (opened with `?bake-models`, see src/render/treeAssets.ts) and writes it to
 * public/models/baked/templates.bin, the one file the game ships.
 */
function saveBakedModels(): Plugin {
  return {
    name: "save-baked-models",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__save-baked-models", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end();
        }
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          const out = path.resolve(__dirname, "public/models/baked/templates.bin");
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, Buffer.concat(chunks));
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

// For GitHub Pages: use base '/' for custom domain (e.g. mastaanrandhawa.com).
// If you use a project page (username.github.io/REPO_NAME), set BASE_PATH=/REPO_NAME/ in the workflow.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react(), saveBakedModels()],
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
