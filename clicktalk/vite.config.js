import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 프록시 정리:
// - /api      → Spring Boot (context-path=/api)
// - /chatbot  → FastAPI ai-chatbot
// - /click    → 기존 경로 유지 (내부에서 /api/click/* 로 리라이트)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/chatbot": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/chatbot/, ""),
      },
      "/click": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/click/, "/api/click"),
      },
    },
  },
});