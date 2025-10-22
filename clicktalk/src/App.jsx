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
    // 해시는 쿼리까지 포함
    if (window.location.hash !== `#${target}`) {
      window.location.hash = target;
    }
    // 상태에는 경로만
    setPath(getPathOnly());
  };

  return { path, navigate };
}

export default function App() {
  const { path, navigate } = useHashRoute();

  // 가드가 적용된 이동 함수 (버튼/헤더에서 이 함수만 사용하도록 전달)
  const go = (to) => {
    const raw = to || "/";
    const onlyPath = (raw.split("?")[0] || "/").trim();
    const normalized = onlyPath.startsWith("/") ? onlyPath : `/${onlyPath}`;

    if (PROTECTED_PATHS.has(normalized) && !isAuthed()) {
      alert("로그인이 필요해요.");
      navigate(`/login?from=${encodeURIComponent(normalized)}`);
      return;
    }
    navigate(to);
  };

  // 주소창에 직접 입력했을 때도 가드
  useEffect(() => {
    if (PROTECTED_PATHS.has(path) && !isAuthed()) {
      navigate(`/login?from=${encodeURIComponent(path)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

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
    </div>
  );
}
