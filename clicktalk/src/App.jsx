import { useEffect, useState } from "react";
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

const useHashRoute = () => {
  const get = () => window.location.hash.replace("#", "") || "/";
  const [path, setPath] = useState(get());

  useEffect(() => {
    const on = () => setPath(get());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const navigate = (to) => {
    if (!to.startsWith("/")) to = "/" + to;
    if (window.location.hash !== `#${to}`) window.location.hash = to;
    setPath(to);
  };

  return { path, navigate };
};

const App = () => {
  const { path, navigate } = useHashRoute();
  const wrapperClass = path === "/" ? "landing-skin" : "";

  return (
    <div className={wrapperClass}>
      {path === "/" && <div className="landing-bg" aria-hidden="true" />}

      {/* 헤더 분기 */}
      {path === "/" ? (
        <Header go={navigate} />
      ) : path === "/wallet" || path === "/chat" || path === "/mission" || path === "/point" || path === "/account" ? (
        <MainHeader go={navigate} />
      ) : (
        <HeaderWhite go={navigate} />
      )}

      {/* 페이지 분기 */}
      {path === "/" && <StartPage go={navigate} />}
      {path === "/signup" && <SignupPage go={navigate} />}
      {path === "/login" && <LoginPage go={navigate} />}
      {path === "/wallet" && <DashboardPage go={navigate} />}
      {path === "/chat" && <ChatbotPage go={navigate} />}
      {path === "/mission" && <MissionPage go={navigate} />}
      {path === "/point" && <PointPage go={navigate} />}
      {path === "/account" && <AccountBookPage go={navigate} />}
      {path === "/analysis" && <ExpenseAnalysisPage go={navigate} />}
    </div>
  );
};

export default App;
