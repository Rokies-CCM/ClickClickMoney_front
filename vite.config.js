// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 프록시 정리:
// - /api/quiz → FastAPI(퀴즈) 8000
// - /api → Spring Boot 8080 (context-path=/api)
// - /chatbot → FastAPI(ai-chatbot) 8000
// - /click → 기존 경로 유지 (내부에서 /api/click/* 로 리라이트)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 더 구체적인 경로를 먼저!
      "/api/quiz": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },

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