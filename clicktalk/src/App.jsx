import { useEffect, useState } from "react";
import Header from "./components/Header";
import HeaderWhite from "./components/HeaderWhite";
import StartPage from "./pages/StartPage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";

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
      ) : (
        <HeaderWhite go={navigate} />
      )}

      {/* 페이지 분기 */}
      {path === "/" && <StartPage go={navigate} />}
      {path === "/signup" && <SignupPage go={navigate} />}
      {path === "/login" && <LoginPage go={navigate} />} {/* 추가 */}
    </div>
  );
};

export default App;
