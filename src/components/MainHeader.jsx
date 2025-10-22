import { useState } from "react";
import Sidebar from "./Sidebar";

const MainHeader = ({ go }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 기본 닫힘 상태

  return (
    <>
      {/* === 사이드바 === */}
      <Sidebar
        isOpen={isSidebarOpen}
        closeSidebar={() => setIsSidebarOpen(false)}
        go={go}
      />

      {/* === 헤더 === */}
      <header
        className="header"
        style={{
          backgroundColor: "#fff",
          borderBottom: "none",
          padding: "14px 0",
          position: "relative",
          zIndex: 999,
        }}
      >
        <div
          className="header-row"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* ✅ 왼쪽 로고 — 클릭 시 사이드바 토글 */}
          <span
            className="logo"
            style={{
              fontWeight: 900,
              fontSize: "22px",
              letterSpacing: "-0.02em",
              color: "#000",
              cursor: "pointer",
            }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} // 🔹 클릭 시 열고 닫기 토글
          >
            click talk
          </span>

          {/* 오른쪽 메뉴 */}
          <nav
            className="nav-items"
            style={{
              display: "flex",
              gap: "28px",
              alignItems: "center",
            }}
          >
            <button className="nav-btn" onClick={() => go("/chat")}>clicktalk</button>
            <button
              className="nav-btn"
              onClick={() => {
                alert("로그아웃 되었습니다.");
                go("/login");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(0, 0, 0, 0.8)",
                fontSize: "16px",
                fontWeight: 400,
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>

            <button
              className="nav-btn"
              onClick={() => go("/wallet")}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(0, 0, 0, 0.8)",
                fontSize: "16px",
                fontWeight: 400,
                cursor: "pointer",
              }}
            >
              내지갑
            </button>
          </nav>
        </div>
      </header>
    </>
  );
};

export default MainHeader;
