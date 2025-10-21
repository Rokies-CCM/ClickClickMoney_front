import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 프론트에서 /click/* 로 호출 → 백엔드 /api/click/* 로 전달
      "/click": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/click/, "/api/click"),
      },
    },
  },
});
