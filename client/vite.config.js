import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // Local dev backend
        target: "http://localhost:5050",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // CRITICAL: This must be outside the 'server' block
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});