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
});
