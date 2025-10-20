import { useEffect, useState } from "react";
import Header from "./components/Header"; // ✅ 기존 노란색 헤더
import HeaderWhite from "./components/HeaderWhite"; // ✅ 새로 만든 흰색 헤더
import StartPage from "./pages/StartPage";
import SignupPage from "./pages/SignupPage";

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

  // 랜딩 페이지에서만 노란 배경 유지
  const wrapperClass = path === "/" ? "landing-skin" : "";

  return (
    <div className={wrapperClass}>
      {/* === 배경 === */}
      {path === "/" && <div className="landing-bg" aria-hidden="true" />}

      {/* === 헤더 조건 분리 === */}
      {path === "/signup" ? (
        <HeaderWhite go={navigate} /> // ⚪ 회원가입용 흰색 헤더
      ) : (
        <Header go={navigate} /> // 🟡 기본 노란색 헤더
      )}

      {/* === 페이지 === */}
      {path === "/" && <StartPage go={navigate} />}
      {path === "/signup" && <SignupPage go={navigate} />}
    </div>
  );
};

export default App;
