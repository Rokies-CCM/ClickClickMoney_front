import { useEffect, useState } from "react";
import Header from "./components/Header";
import StartPage from "./pages/StartPage"; // ✅ StartPage 위치가 pages 폴더면 이 경로 유지

// ✅ 해시 기반 라우팅 훅
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

// ✅ 메인 App 컴포넌트
const App = () => {
  const { path, navigate } = useHashRoute();

  // 랜딩 페이지에서만 노란 배경 유지
  const wrapperClass = path === "/" ? "landing-skin" : "";

  return (
    <div className={wrapperClass}>
      {/* === 고정 노랑 배경 === */}
      <div className="landing-bg" aria-hidden="true" />

      {/* === 상단 로고 & 메뉴 === */}
      <Header path={path} go={navigate} />

      {/* === 메인 콘텐츠 === */}
      {path === "/" && <StartPage go={navigate} />}
    </div>
  );
};

export default App;
