// src/components/MainHeader.jsx
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
// 지갑은 데모 보존
const WALLET_KEY = "points_wallet_v1";

// 공용 버튼 스타일
const btnPrimary = {
  backgroundColor: "#FFD858",
  border: "none",
  borderRadius: "8px",
  padding: "10px 20px",
  fontWeight: 700,
  cursor: "pointer",
};
const btnText = {
  background: "transparent",
  border: "none",
  marginLeft: 10,
  cursor: "pointer",
  fontWeight: 600,
};

// 로그아웃 완료 모달만 유지
function LogoutModal({ onClose, onGoLogin }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter") onGoLogin?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onGoLogin]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 360,
          maxWidth: "90vw",
          background: "#fff",
          border: "1px solid #000",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
          로그아웃 하시겠습니까?
        </h3>

        <p style={{ margin: "12px 0 0", color: "#333", lineHeight: 1.5 }}>
          안전하게 로그아웃됩니다.
          <br />
          다시 이용하시려면 로그인 화면으로 이동해주세요.
        </p>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button style={btnPrimary} onClick={onGoLogin}>
            메인 화면으로
          </button>
          <button style={btnText} onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

// 서버 토큰 무효화
async function backendLogout(accessToken, refreshToken) {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: refreshToken ? JSON.stringify({ refreshToken }) : null,
    });
  } catch {
    // ignore
  }
}

// 로컬 인증/캐시 정리
function clearClientAuth() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    // 데모 보존: 지갑은 지우지 않음
    // localStorage.removeItem(WALLET_KEY);
    sessionStorage.clear();
    localStorage.setItem("auth_logout_at", String(Date.now()));
  } catch {
    // ignore
  }
}

const MainHeader = ({ go }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 다른 탭에서 로그아웃되면 현재 탭도 로그인 페이지로
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "auth_logout_at") {
        go("/login");
        setTimeout(() => window.location.replace("/login"), 0);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [go]);

  const handleLogout = async () => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    await backendLogout(accessToken, refreshToken);
    clearClientAuth();
    setShowLogoutModal(true); // 로그아웃 완료 UX
  };

  const goLoginNow = () => {
    go("/login");
    setTimeout(() => window.location.replace("/login"), 0);
  };

  return (
    <>
      {/* 사이드바 */}
      <Sidebar
        isOpen={isSidebarOpen}
        closeSidebar={() => setIsSidebarOpen(false)}
        go={go}
      />

      {/* 헤더 */}
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
          {/* 로고 */}
          <span
            className="logo"
            style={{
              fontWeight: 900,
              fontSize: "22px",
              letterSpacing: "-0.02em",
              color: "#000",
              cursor: "pointer",
            }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
            {/* ✅ 그냥 go만 호출 (가드는 App.go에서 통일) */}
            <button className="nav-btn" onClick={() => go("/chat")}>
              clicktalk
            </button>

            <button
              className="nav-btn"
              onClick={handleLogout}
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

      {/* 로그아웃 모달 */}
      {showLogoutModal && (
        <LogoutModal onClose={() => setShowLogoutModal(false)} onGoLogin={goLoginNow} />
      )}
    </>
  );
};

export default MainHeader;