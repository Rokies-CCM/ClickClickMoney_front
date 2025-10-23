// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/chatbot": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/chatbot/, ""),
      },
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/click": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/click/, "/api/click"),
      },

      // === 주식 API 프록시 (여러 후보) ===
      // 1) 표준: /v1/stock/*
      "/stockA": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/stockA/, "/v1/stock"),
      },
      // 2) 변형: /v1/*  (프론트에서 뒤에 /stock 붙여 사용)
      "/stockB": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/stockB/, "/v1"),
      },
      // 3) 변형: /stock/* (백엔드가 /stock 프리픽스로만 노출된 경우)
      "/stockC": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/stockC/, "/stock"),
      },
      // 4) 실수 방지: /v1/stock/stock/* (라우터가 이중으로 물린 백엔드 대응)
      "/stockD": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/stockD/, "/v1/stock/stock"),
      },
    },
  },
});
