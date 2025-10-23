import { useEffect, useState } from "react";

export const useHashRoute = () => {
  const getPath = () => window.location.hash.replace("#", "") || "/";
  const [path, setPath] = useState(getPath());

  useEffect(() => {
    const onHashChange = () => setPath(getPath());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (to) => {
    if (!to.startsWith("/")) to = "/" + to;
    if (window.location.hash !== `#${to}`) window.location.hash = to;
    setPath(to);
  };

  return { path, navigate };
};