// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ✅ FastAPI
      "/chatbot": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/chatbot/, ""), // /chatbot/v1/... -> /v1/...
      },

      // ✅ Spring (원래 쓰던 /api 등)
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },

      // (선택) 기존 유지
      "/click": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/click/, "/api/click"),
      },
    },
  },
});
