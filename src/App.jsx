// src/App.jsx
import React, { useEffect, useState } from "react";

import Header from "./components/Header";
import HeaderWhite from "./components/HeaderWhite";
import MainHeader from "./components/MainHeader";

import StartPage from "./pages/StartPage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ChatbotPage from "./pages/ChatbotPage";
import MissionPage from "./pages/MissionPage";
import PointPage from "./pages/PointPage";
import AccountBookPage from "./pages/AccountBookPage";
import ExpenseAnalysisPage from "./pages/ExpenseAnalysisPage";
import SubscriptionPage from "./pages/SubscriptionPage";

import { isAuthed } from "./api/auth";

/** 헤더 분기용 경로 집합 */
const MAIN_HEADER_PATHS = new Set([
  "/wallet",
  "/chat",
  "/mission",
  "/point",
  "/account",
  "/subscription",
  "/analysis",
]);

/** 로그인이 필요한 경로 */
const PROTECTED_PATHS = new Set([
  "/wallet",
  "/chat",
  "/mission",
  "/point",
  "/account",
  "/subscription",
  "/analysis",
]);

/** 공용 버튼 스타일 */
const btnPrimary = {
  backgroundColor: "#FFD858",
  border: "none",
  borderRadius: "10px",
  padding: "12px 22px",
  fontWeight: 800,
  cursor: "pointer",
};
const btnText = {
  background: "transparent",
  border: "none",
  marginLeft: 10,
  cursor: "pointer",
  fontWeight: 600,
};

/** 로그인 요구 모달 */
function AuthRequiredModal({ onClose, onLogin }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter") onLogin?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onLogin]);

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
        zIndex: 3000,
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
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>로그인이 필요합니다</h3>
        <p style={{ margin: "12px 0 0", color: "#333", lineHeight: 1.5 }}>
          해당 기능은 로그인 후 이용할 수 있어요. 로그인 화면으로 이동할까요?
        </p>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={btnPrimary} onClick={onLogin}>로그인하기</button>
          <button style={btnText} onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

/** 간단 해시 라우터 훅 */
function useHashRoute() {
  const getPathOnly = () => {
    const raw = window.location.hash.slice(1) || "/";
    const onlyPath = (raw.split("?")[0] || "/").trim();
    return onlyPath.startsWith("/") ? onlyPath : `/${onlyPath}`;
  };

  const [path, setPath] = useState(getPathOnly());

  useEffect(() => {
    const onHash = () => setPath(getPathOnly());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (to) => {
    let target = to || "/";
    if (!target.startsWith("/")) target = "/" + target;
    if (window.location.hash !== `#${target}`) {
      window.location.hash = target;
    }
    setPath(getPathOnly());
  };

  return { path, navigate };
}

export default function App() {
  const { path, navigate } = useHashRoute();

  // 모달 상태
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);

  // ✅ 가드가 적용된 이동 함수
  // - protected 경로이고 비로그인 → 모달 + 정확한 이동 대상(to 전체) 저장
  // - 로그인 상태 → 즉시 이동
  const go = (to) => {
    const raw = to || "/";
    // 전체 타깃(쿼리 포함)은 그대로 저장/이동에 사용
    let target = raw.startsWith("/") ? raw : `/${raw}`;
    // 가드 판단용으로는 path만 추출
    const onlyPath = (target.split("?")[0] || "/").trim();
    const normalized = onlyPath.startsWith("/") ? onlyPath : `/${onlyPath}`;

    if (PROTECTED_PATHS.has(normalized) && !isAuthed()) {
      setPendingPath(target);       // ← 쿼리까지 포함해 저장
      setShowAuthModal(true);       // alert 대신 모달
      return;
    }
    navigate(target);
  };

  // 주소창 직접 입력 시에도 모달 (쿼리를 잃는 훅 구조라, 여기선 홈으로만 돌려놓고 로그인에서 처리하는게 무난)
  useEffect(() => {
    if (PROTECTED_PATHS.has(path) && !isAuthed()) {
      setPendingPath(path);         // 직접 입력 시엔 path만 확보됨
      setShowAuthModal(true);
    }
  }, [path]);

  const closeAuthModal = () => {
    setShowAuthModal(false);
    setPendingPath(null);
    // 보호 경로에 머무르면 UX 애매 → 홈으로 이동
    if (PROTECTED_PATHS.has(path)) navigate("/");
  };

  const goLoginFromModal = () => {
    const redirect = pendingPath || "/";
    setShowAuthModal(false);
    setPendingPath(null);
    navigate(`/login?from=${encodeURIComponent(redirect)}`);
  };

  // 헤더 선택
  const renderHeader = () => {
    if (path === "/") return <Header go={go} />;
    if (MAIN_HEADER_PATHS.has(path)) return <MainHeader go={go} />;
    return <HeaderWhite go={go} />;
  };

  // 페이지 선택
  const renderPage = () => {
    switch (path) {
      case "/":
        return <StartPage go={go} />;
      case "/signup":
        return <SignupPage go={go} />;
      case "/login":
        return <LoginPage go={go} />;
      case "/wallet":
        return <DashboardPage go={go} />;
      case "/chat":
        return <ChatbotPage go={go} />;
      case "/mission":
        return <MissionPage go={go} />;
      case "/point":
        return <PointPage go={go} />;
      case "/account":
        return <AccountBookPage go={go} />;
      case "/analysis":
        return <ExpenseAnalysisPage go={go} />;
      case "/subscription":
        return <SubscriptionPage go={go} />;
      default:
        return <StartPage go={go} />;
    }
  };

  const wrapperClass = path === "/" ? "landing-skin" : "";

  return (
    <div className={wrapperClass}>
      {path === "/" ? <div className="landing-bg" aria-hidden="true" /> : null}
      {renderHeader()}
      {renderPage()}

      {/* 로그인 요구 모달 */}
      {showAuthModal && (
        <AuthRequiredModal onClose={closeAuthModal} onLogin={goLoginFromModal} />
      )}
    </div>
  );
}
