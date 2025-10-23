// src/main.jsx (또는 index.jsx)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  // 개발 중 중복 effect 방지용: StrictMode 제거
  <App />
);
